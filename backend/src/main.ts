import { NestFactory } from "@nestjs/core";
import {
  BadRequestException,
  Body,
  CallHandler,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Injectable,
  Module,
  NestInterceptor,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Response } from "express";
import { APP_INTERCEPTOR } from "@nestjs/core";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { loadEnvFile } from "node:process";
import sharp from "sharp";
import { Observable, Subject, tap } from "rxjs";
import { Client as PgClient } from "pg";
import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "node:http";
import {
  Prisma,
  PrismaClient,
  PromotionKind,
  DiscountType,
  PromotionStackingMode,
} from "../generated/prisma";
import {
  adminTripDetailSelect,
  tripDriverResponse,
  tripDriverSelect,
  type AdminTripDetail,
  type TripDriverSummary,
} from "./trip-payload";
import { buildDriverOrderUrl } from "./order-url";
import { inviteShareHtml } from "./order-invite-share";
import { publicDriverOrderChannelFilter } from "./driver-order-channel";

try {
  loadEnvFile("../.env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT") {
    try {
      loadEnvFile();
    } catch (fallbackError) {
      if ((fallbackError as NodeJS.ErrnoException).code !== "ENOENT")
        throw fallbackError;
    }
  } else throw error;
}

type RequestLike = {
  headers: {
    authorization?: string;
    cookie?: string;
    ["x-csrf-token"]?: string;
    ["user-agent"]?: string;
    host?: string;
    origin?: string;
    ["x-forwarded-proto"]?: string;
    ["if-none-match"]?: string;
  };
  query?: Record<string, string | undefined>;
  method?: string;
  url?: string;
  ip?: string;
  protocol?: string;
  on?: (event: string, listener: () => void) => void;
};
type AdminRole = "SUPER_ADMIN" | "OPERATOR" | "VIEWER";
type AdminListQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortOrder: "asc" | "desc";
};
type AdminListResponse<T, S extends Record<string, unknown> = Record<string, number>> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary?: S;
};
function adminQueryValue(req: RequestLike, key: string) {
  return req.query?.[key]?.trim() || "";
}
const adminTripStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
const adminTripExecutionPhases = ["WAITING_DRIVER", "DRIVER_PENDING_ACCEPTANCE", "DRIVER_ASSIGNED", "IN_PROGRESS"] as const;
function adminTripStatusWhere(statusValue: string, executionPhaseValue: string): Prisma.TripWhereInput {
  const filters: Prisma.TripWhereInput[] = [];
  if (adminTripStatuses.includes(statusValue as (typeof adminTripStatuses)[number]))
    filters.push({ status: statusValue as (typeof adminTripStatuses)[number] });
  if (statusValue === "IN_PROGRESS") filters.push({ executionPhase: "IN_PROGRESS" });
  if (adminTripExecutionPhases.includes(executionPhaseValue as (typeof adminTripExecutionPhases)[number]))
    filters.push({ executionPhase: executionPhaseValue as (typeof adminTripExecutionPhases)[number] });
  return filters.length ? { AND: filters } : {};
}
function parseAdminListQuery(req: RequestLike, defaultPageSize = 25): AdminListQuery {
  const page = Number.parseInt(adminQueryValue(req, "page"), 10);
  const pageSize = Number.parseInt(adminQueryValue(req, "pageSize"), 10);
  const sortOrder = adminQueryValue(req, "sortOrder").toLowerCase();
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize:
      Number.isSafeInteger(pageSize) && pageSize > 0
        ? Math.min(pageSize, 100)
        : defaultPageSize,
    search: adminQueryValue(req, "search") || adminQueryValue(req, "q"),
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  };
}
function adminQueryBoolean(req: RequestLike, key: string) {
  const value = adminQueryValue(req, key).toLowerCase();
  if (!value) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new BadRequestException(`${key} must be true or false`);
}
function adminQueryDate(req: RequestLike, key: string) {
  const value = adminQueryValue(req, key);
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${key} must be a valid date`);
  return date;
}
function adminListResponse<T, S extends Record<string, unknown>>(
  data: T[],
  total: number,
  query: AdminListQuery,
  summary?: S,
): AdminListResponse<T, S> {
  return {
    data,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
    ...(summary ? { summary } : {}),
  };
}
interface Administrator {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  enabled: boolean;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
}
interface AdminSession {
  sub: string;
  role: AdminRole;
  exp: number;
  jti: string;
}
interface AdminAuditLog {
  id: string;
  administratorId: string | null;
  username: string;
  action: string;
  resource: string;
  method: string;
  status: "SUCCESS" | "FAILED";
  ip: string;
  createdAt: string;
}
type MasterBoxConversation = { id: string; messages?: MasterBoxMessage[] };
type MasterBoxMessage = {
  id: string;
  direction: string;
  content: unknown;
  createdAt: string;
};
type SupportSession = { conversationId: string; riderId: string; exp: number };
type ClientSession = { sub: string; exp: number; jti: string };
type DriverSessionToken = { sub: string; exp: number; jti: string };
type ProvisionalDriverSessionToken = DriverSessionToken & {
  orderUrlId: string;
  tripId: string;
  scope: "ORDER_INVITE";
};
type PhoneChallenge = {
  countryCode: string;
  phoneNumber: string;
  code: string;
  exp: number;
  attempts: number;
};
type ClientPhoneChangeChallenge = PhoneChallenge & { userId: string };

type User = {
  id: string;
  countryCode: string;
  phoneNumber: string;
  name: string | null;
  cashBalance: number;
  fareBalance: number;
  createdAt: string;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
};
interface Trip {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  region: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
}
type AddressRegion = "大陸" | "香港" | "澳門";
interface RecommendedAddress {
  id: string;
  region: AddressRegion;
  city: string | null;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  enabled: boolean;
  order: number;
}
interface MainlandCity {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}
interface CharterOrder {
  id: string;
  userId: string;
  originRegion: string;
  origin: string;
  destinationRegion: string;
  destination: string;
  scheduledAt: string;
  durationHours: number;
  status: string;
  createdAt: string;
}
interface FlightAirport {
  iata: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}
interface FlightLookupResult {
  flightNumber: string;
  direction: "arrival" | "departure";
  status: string;
  scheduledTime: string;
  origin: FlightAirport;
  destination: FlightAirport;
}
interface VehicleCategory {
  id: string;
  name: string;
  tabLabel: string;
  order: number;
  enabled: boolean;
}
interface VehicleCatalogItem {
  id: string;
  categoryId: string | null;
  brand: string;
  model: string;
  series: string;
  seats: number;
  image: string;
  imageData?: Prisma.Bytes | null;
  imageMime?: string | null;
  logoData?: Prisma.Bytes | null;
  logoMime?: string | null;
  colorLabel: string;
  modelChoiceLabel: string;
  enabled: boolean;
  order: number;
  updatedAt?: Date | string;
}
type VehicleExtraTriggerType = "NONE" | "IMMEDIATE" | "NIGHT" | "WEATHER";
interface VehicleExtraOption {
  id: string;
  name: string;
  label: string;
  price: number;
  currency: string;
  enabled: boolean;
  order: number;
  requiredForImmediate: boolean;
  requiredWithinMinutes: number | null;
  triggerType: string;
  triggerEnabled: boolean;
  nightStartTime: string | null;
  nightEndTime: string | null;
}
interface DistancePricingTier {
  id: string;
  fromKm: number;
  toKm: number | null;
  pricePerKm: number;
  order: number;
}
interface DistancePricingSettings {
  categoryId: string;
  minimumFare: number;
  currency: string;
  tiers: DistancePricingTier[];
}
interface RouteMinimumFareSettings {
  id: string;
  originRegion: string;
  originCity: string | null;
  destinationRegion: string;
  destinationCity: string | null;
  categoryId: string | null;
  minimumFare: number;
  currency: string;
  enabled: boolean;
}
interface QuoteExtraRequest {
  id?: unknown;
  quantity?: unknown;
}
interface CreateQuoteRequest {
  categoryId?: unknown;
  vehicleId?: unknown;
  distanceMeters?: unknown;
  durationSeconds?: unknown;
  extraIds?: unknown;
  extras?: unknown;
  displayCurrency?: unknown;
  currency?: unknown;
  couponCode?: unknown;
  userId?: unknown;
  membershipLevel?: unknown;
  originRegion?: unknown;
  originCity?: unknown;
  destinationRegion?: unknown;
  destinationCity?: unknown;
  scheduledAt?: unknown;
}
interface QuoteExtraSelection {
  id: string;
  quantity: number;
}
interface PromotionInput {
  id?: unknown;
  name?: unknown;
  kind?: unknown;
  discountType?: unknown;
  stackingMode?: unknown;
  discountValue?: unknown;
  currency?: unknown;
  minimumSpend?: unknown;
  maximumDiscount?: unknown;
  priority?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  enabled?: unknown;
  couponCode?: unknown;
  usageLimit?: unknown;
  membershipLevel?: unknown;
  originRegion?: unknown;
  originCity?: unknown;
  destinationRegion?: unknown;
  destinationCity?: unknown;
  weekdays?: unknown;
  timeStart?: unknown;
  timeEnd?: unknown;
}
interface MileageRewardInput {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  cost?: unknown;
  enabled?: unknown;
  stock?: unknown;
  couponValue?: unknown;
  couponCurrency?: unknown;
  promotionId?: unknown;
}
interface MembershipPlan {
  id: string;
  level: string;
  name: string;
  monthly: number;
  yearly: number;
  recommended: boolean;
  benefits: string[];
  enabled: boolean;
  order: number;
}
const prisma = new PrismaClient();

async function primaryDriverVehicle(
  client: Pick<Prisma.TransactionClient, "driverVehicleAssignment">,
  driverId: string,
  enabledOnly = false,
) {
  const assignment = await client.driverVehicleAssignment.findFirst({
    where: {
      driverId,
      enabled: true,
      ...(enabledOnly ? { vehicle: { enabled: true } } : {}),
    },
    include: { vehicle: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return assignment?.vehicle ?? null;
}

const tripOfferLeadTimeMs = 60 * 60 * 1000;

function tripOfferCutoff(now = new Date()) {
  return new Date(now.getTime() + tripOfferLeadTimeMs);
}

function tripOfferIsExpired(scheduledAt: Date, now = new Date()) {
  return scheduledAt <= tripOfferCutoff(now);
}

async function requireActiveDriverVehicle(
  client: Pick<Prisma.TransactionClient, "driverVehicleAssignment">,
  driverId: string,
  vehicleId?: string,
) {
  const assignment = vehicleId
    ? await client.driverVehicleAssignment.findFirst({
        where: {
          driverId,
          vehicleId,
          enabled: true,
          vehicle: { enabled: true },
        },
        include: { vehicle: true },
      })
    : null;
  const vehicle = vehicleId
    ? assignment?.vehicle
    : await primaryDriverVehicle(client, driverId, true);
  if (!vehicle)
    throw new ForbiddenException(
      "An active assigned vehicle is required before accepting or operating trips",
    );
  return vehicle;
}

function tripVehicleSnapshot(vehicle: {
  id: string;
  vehicleCategory: string;
  vehicleColor: string;
  vehicleOwnership: string;
  plateType: string;
  hkPlate: string | null;
  macauPlate: string | null;
  mainlandPlate: string | null;
}) {
  return {
    vehicleId: vehicle.id,
    vehicleCategory: vehicle.vehicleCategory,
    vehicleColor: vehicle.vehicleColor,
    vehicleOwnership: vehicle.vehicleOwnership,
    vehiclePlateType: vehicle.plateType,
    vehiclePlate:
      vehicle.hkPlate || vehicle.macauPlate || vehicle.mainlandPlate || null,
    vehicleHkPlate: vehicle.hkPlate,
    vehicleMacauPlate: vehicle.macauPlate,
    vehicleMainlandPlate: vehicle.mainlandPlate,
  };
}

async function promotePrimaryDriverVehicle(
  tx: Prisma.TransactionClient,
  driverId: string,
) {
  const assignment = await tx.driverVehicleAssignment.findFirst({
    where: { driverId, enabled: true, vehicle: { enabled: true } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  await tx.driverVehicleAssignment.updateMany({
    where: { driverId },
    data: { isPrimary: false },
  });
  if (assignment)
    await tx.driverVehicleAssignment.update({
      where: { id: assignment.id },
      data: { isPrimary: true },
    });
}

async function ensurePrimaryDriverVehicle(
  tx: Prisma.TransactionClient,
  driverId: string,
) {
  const primary = await tx.driverVehicleAssignment.findFirst({
    where: { driverId, enabled: true, isPrimary: true, vehicle: { enabled: true } },
    select: { id: true },
  });
  if (!primary) await promotePrimaryDriverVehicle(tx, driverId);
}

type DriverOrderEvent = {
  eventId: string;
  reason: "available" | "taken" | "cancelled";
  tripId?: string;
  driverId?: string;
  occurredAt: string;
};
type DriverOrderEventInput = Pick<
  DriverOrderEvent,
  "reason" | "tripId" | "driverId"
>;
type NotificationEvent = {
  eventId: string;
  recipientType: "user" | "driver";
  recipientIds: string[];
  occurredAt: string;
};
const driverOrderEvents = new Subject<DriverOrderEvent>();
const notificationEvents = new Subject<NotificationEvent>();
const locallyPublishedEventIds = new Set<string>();

function rememberLocallyPublishedEvent(eventId: string) {
  locallyPublishedEventIds.add(eventId);
  if (locallyPublishedEventIds.size <= 1000) return;
  const oldest = locallyPublishedEventIds.values().next().value;
  if (oldest) locallyPublishedEventIds.delete(oldest);
}
const driverEventTickets = new Map<
  string,
  { driverId: string; expiresAt: number }
>();
const notificationEventTickets = new Map<
  string,
  { recipientType: "user" | "driver"; recipientId: string; expiresAt: number }
>();
let driverEventNotifier: PgClient | undefined;
let driverEventNotifierStarted = false;
let driverEventNotifierStopping = false;
let driverEventNotifierRetry: NodeJS.Timeout | undefined;

function scheduleDriverEventNotifierReconnect(client: PgClient) {
  if (driverEventNotifierStopping || driverEventNotifier !== client) return;
  driverEventNotifierStarted = false;
  driverEventNotifier = undefined;
  void client.end().catch(() => undefined);
  driverEventNotifierRetry ??= setTimeout(() => {
    driverEventNotifierRetry = undefined;
    void startDriverEventNotifier();
  }, 5000);
}

async function startDriverEventNotifier() {
  if (driverEventNotifierStopping || driverEventNotifierStarted) return;
  driverEventNotifierStarted = true;
  const client = new PgClient({ connectionString: process.env.DATABASE_URL });
  driverEventNotifier = client;
  client.on('notification', (message) => {
    if (!message.payload) return;
    try {
      if (message.channel === 'notification_events') {
        const event = JSON.parse(message.payload) as NotificationEvent;
        if (locallyPublishedEventIds.delete(event.eventId)) return;
        notificationEvents.next(event);
        return;
      }
      const event = JSON.parse(message.payload) as DriverOrderEvent;
      if (locallyPublishedEventIds.delete(event.eventId)) return;
      driverOrderEvents.next(event);
    } catch (error) {
      console.error('Invalid realtime event payload', error);
    }
  });
  client.on('error', (error) => {
    console.error('Driver order event listener failed', error);
    scheduleDriverEventNotifierReconnect(client);
  });
  client.on('end', () => scheduleDriverEventNotifierReconnect(client));
  try {
    await client.connect();
    await client.query('LISTEN driver_order_events');
    await client.query('LISTEN notification_events');
  } catch (error) {
    console.error('Unable to start driver order event listener', error);
    scheduleDriverEventNotifierReconnect(client);
  }
}

async function stopDriverEventNotifier() {
  driverEventNotifierStopping = true;
  if (driverEventNotifierRetry) clearTimeout(driverEventNotifierRetry);
  driverEventNotifierRetry = undefined;
  driverEventNotifierStarted = false;
  const client = driverEventNotifier;
  driverEventNotifier = undefined;
  await client?.end().catch(() => undefined);
}

async function publishDriverOrderEvent(input: DriverOrderEventInput) {
  const event: DriverOrderEvent = {
    ...input,
    eventId: randomBytes(16).toString("base64url"),
    occurredAt: new Date().toISOString(),
  };
  rememberLocallyPublishedEvent(event.eventId);
  driverOrderEvents.next(event);
  try {
    await prisma.$executeRawUnsafe(
      `SELECT pg_notify('driver_order_events', $1)`,
      JSON.stringify(event),
    );
  } catch (error) {
    locallyPublishedEventIds.delete(event.eventId);
    console.error('Unable to publish driver order event', error);
  }
}
async function publishNotificationEvent(input: Pick<
  NotificationEvent,
  "recipientType" | "recipientIds"
>) {
  const recipientIds = [...new Set(input.recipientIds)];
  for (let offset = 0; offset < recipientIds.length; offset += 100) {
    const event: NotificationEvent = {
      recipientType: input.recipientType,
      recipientIds: recipientIds.slice(offset, offset + 100),
      eventId: randomBytes(16).toString("base64url"),
      occurredAt: new Date().toISOString(),
    };
    rememberLocallyPublishedEvent(event.eventId);
    notificationEvents.next(event);
    try {
      await prisma.$executeRawUnsafe(
        `SELECT pg_notify('notification_events', $1)`,
        JSON.stringify(event),
      );
    } catch (error) {
      locallyPublishedEventIds.delete(event.eventId);
      console.error('Unable to publish notification event', error);
    }
  }
}
function pruneDriverEventTickets() {
  const now = Date.now();
  for (const [ticket, value] of driverEventTickets) {
    if (value.expiresAt <= now) driverEventTickets.delete(ticket);
  }
}
function pruneNotificationEventTickets() {
  const now = Date.now();
  for (const [ticket, value] of notificationEventTickets) {
    if (value.expiresAt <= now) notificationEventTickets.delete(ticket);
  }
}
function startNotificationWebSocketServer(server: ReturnType<NestExpressApplication["getHttpServer"]>) {
  const socketServer = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request: { url?: string }, socket: { destroy: () => void }, head: Buffer) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/notifications/socket") return;
    pruneNotificationEventTickets();
    const ticket = url.searchParams.get("ticket");
    const entry = ticket ? notificationEventTickets.get(ticket) : undefined;
    if (!ticket || !entry || entry.recipientType !== "user" || entry.expiresAt <= Date.now()) {
      socket.destroy();
      return;
    }
    notificationEventTickets.delete(ticket);
    socketServer.handleUpgrade(request as never, socket as never, head, (client) => {
      socketServer.emit("connection", client, request, entry);
    });
  });
  socketServer.on("connection", (client: WebSocket, _request: IncomingMessage, entry: { recipientId: string }) => {
    const subscription = notificationEvents.subscribe((event) => {
      if (event.recipientType !== "user" || !event.recipientIds.includes(entry.recipientId) || client.readyState !== WebSocket.OPEN) return;
      client.send(JSON.stringify(event));
    });
    client.on("close", () => subscription.unsubscribe());
    client.on("error", () => subscription.unsubscribe());
  });
  return socketServer;
}

const appSettingsDefaults = {
  id: "default",
  language: "繁體中文",
  region: "香港",
  currency: "HKD",
  pricingCurrency: "RMB",
  walletCurrency: "RMB",
  exchangeRate: 0.92,
  adminLogo: null as string | null,
  severeWeatherEnabled: false,
  driverRaceEnabled: false,
  dispatchSchedulingEnabled: true,
  driverPayoutPercentage: 100,
  fareBalancePayEnabled: true,
  cashBalancePayEnabled: true,
  wechatPayEnabled: true,
  alipayPayEnabled: true,
  bankCardPayEnabled: true,
  sandboxMode: false,
  mileageSpendPerKm: 10,
  mileageValidityMonths: 12,
  invitationEnabled: true,
  invitationInviterMileage: 300,
  invitationInviteeFare: 50,
  invitationQualificationDays: 30,
  invitationMileageValidityMonths: 12,
};
const currencyLabels = { RMB: "RMB", HKD: "HKD" } as const;
const configuredCurrencyLabel = (settings: { pricingCurrency: string }) =>
  currencyLabels[settings.pricingCurrency as keyof typeof currencyLabels] ||
  currencyLabels.RMB;
const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

async function openEligibleTripsForDispatch(
  tx: Prisma.TransactionClient,
  driverPayoutPercentage: number,
  tripId?: string,
) {
  const tripsToOpen = await tx.trip.findMany({
    where: {
      ...(tripId ? { id: tripId } : {}),
      status: "CONFIRMED",
      executionPhase: null,
      driverId: null,
      ...publicDriverOrderChannelFilter,
      scheduledAt: { gt: tripOfferCutoff() },
      payment: { is: { status: "PAID" } },
    },
    select: {
      id: true,
      payment: { select: { total: true, currency: true } },
    },
  });
  let opened = 0;
  for (const trip of tripsToOpen) {
    if (!trip.payment) continue;
    const calculatedAmount = roundMoney(
      (trip.payment.total * driverPayoutPercentage) / 100,
    );
    const result = await tx.trip.updateMany({
      where: {
        id: trip.id,
        status: "CONFIRMED",
        executionPhase: null,
        driverId: null,
        ...publicDriverOrderChannelFilter,
      },
      data: {
        executionPhase: "WAITING_DRIVER",
        driverPayoutPercentage,
        driverPayoutCalculatedAmount: calculatedAmount,
        driverPayoutAmount: calculatedAmount,
        driverPayoutCurrency: trip.payment.currency,
      },
    });
    opened += result.count;
  }
  return opened;
}
const normalizeRuleText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const normalizeWeekdays = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    : [];
const timeToMinutes = (value: string | null | undefined) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
};
const normalizeTriggerType = (
  value: unknown,
  legacyImmediate = false,
): VehicleExtraTriggerType => {
  if (value === "IMMEDIATE" || value === "NIGHT" || value === "WEATHER")
    return value;
  return legacyImmediate ? "IMMEDIATE" : "NONE";
};
const hongKongMinutes = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return Number.isFinite(hour) && Number.isFinite(minute)
    ? hour * 60 + minute
    : null;
};
const normalizeCoordinate = (value: unknown, min: number, max: number) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};
const normalizeRoutePoints = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const points = value
    .map((point) => ({
      latitude: normalizeCoordinate((point as { latitude?: unknown })?.latitude, -90, 90),
      longitude: normalizeCoordinate((point as { longitude?: unknown })?.longitude, -180, 180),
    }))
    .filter((point): point is { latitude: number; longitude: number } => point.latitude !== null && point.longitude !== null)
    .slice(0, 2000);
  return points.length >= 2 ? points : null;
};
const routeMapData = (body: {
  originLatitude?: unknown;
  originLongitude?: unknown;
  destinationLatitude?: unknown;
  destinationLongitude?: unknown;
  routePoints?: unknown;
}) => {
  const originLatitude = normalizeCoordinate(body.originLatitude, -90, 90);
  const originLongitude = normalizeCoordinate(body.originLongitude, -180, 180);
  const destinationLatitude = normalizeCoordinate(body.destinationLatitude, -90, 90);
  const destinationLongitude = normalizeCoordinate(body.destinationLongitude, -180, 180);
  const routePoints = normalizeRoutePoints(body.routePoints);
  const hasOriginCoordinate =
    body.originLatitude !== undefined || body.originLongitude !== undefined;
  const hasDestinationCoordinate =
    body.destinationLatitude !== undefined ||
    body.destinationLongitude !== undefined;
  return {
    ...(hasOriginCoordinate
      ? {
          originLatitude:
            originLatitude !== null && originLongitude !== null
              ? originLatitude
              : null,
          originLongitude:
            originLatitude !== null && originLongitude !== null
              ? originLongitude
              : null,
        }
      : {}),
    ...(hasDestinationCoordinate
      ? {
          destinationLatitude:
            destinationLatitude !== null && destinationLongitude !== null
              ? destinationLatitude
              : null,
          destinationLongitude:
            destinationLatitude !== null && destinationLongitude !== null
              ? destinationLongitude
              : null,
        }
      : {}),
    ...(routePoints ? { routePoints } : {}),
  };
};
const parseScheduledAt = (value: unknown) => {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return new Date(value as string);
  const trimmed = value.trim();
  if (!trimmed) return new Date("");
  const localDateTime =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;
  return new Date(localDateTime.test(trimmed) ? `${trimmed}+08:00` : trimmed);
};
const extraTriggerMatches = (
  extra: Pick<
    VehicleExtraOption,
    | "triggerType"
    | "triggerEnabled"
    | "requiredForImmediate"
    | "requiredWithinMinutes"
    | "nightStartTime"
    | "nightEndTime"
  >,
  scheduledAt: Date,
  now: Date,
  severeWeatherEnabled: boolean,
) => {
  const triggerType = normalizeTriggerType(
    extra.triggerType,
    extra.requiredForImmediate,
  );
  if (!extra.triggerEnabled) return false;
  if (triggerType === "IMMEDIATE") {
    const window = extra.requiredWithinMinutes;
    if (window === null) return false;
    const minutesUntilDeparture =
      (scheduledAt.getTime() - now.getTime()) / 60000;
    return minutesUntilDeparture <= window;
  }
  if (triggerType === "WEATHER") return severeWeatherEnabled;
  if (triggerType !== "NIGHT") return false;
  const start = timeToMinutes(extra.nightStartTime);
  const end = timeToMinutes(extra.nightEndTime);
  const current = hongKongMinutes(scheduledAt);
  if (start === null || end === null || current === null) return false;
  return start <= end
    ? current >= start && current <= end
    : current >= start || current <= end;
};
const promotionMatchesContext = (
  promotion: {
    originRegion: string | null;
    originCity: string | null;
    destinationRegion: string | null;
    destinationCity: string | null;
    weekdays: unknown;
    timeStart: string | null;
    timeEnd: string | null;
  },
  context: {
    originRegion: string;
    originCity: string;
    destinationRegion: string;
    destinationCity: string;
    scheduledAt: Date;
  },
) => {
  if (promotion.originRegion && promotion.originRegion !== context.originRegion)
    return false;
  if (promotion.originCity && promotion.originCity !== context.originCity)
    return false;
  if (
    promotion.destinationRegion &&
    promotion.destinationRegion !== context.destinationRegion
  )
    return false;
  if (
    promotion.destinationCity &&
    promotion.destinationCity !== context.destinationCity
  )
    return false;
  const weekdays = normalizeWeekdays(promotion.weekdays);
  if (weekdays.length && !weekdays.includes(context.scheduledAt.getDay() || 7))
    return false;
  const start = timeToMinutes(promotion.timeStart);
  const end = timeToMinutes(promotion.timeEnd);
  if (start !== null && end !== null) {
    const current =
      context.scheduledAt.getHours() * 60 + context.scheduledAt.getMinutes();
    const inRange =
      start <= end
        ? current >= start && current <= end
        : current >= start || current <= end;
    if (!inRange) return false;
  }
  return true;
};
const membershipPlanDefaults: MembershipPlan[] = [
  {
    id: "silver",
    level: "SILVER",
    name: "銀卡會員",
    monthly: 68,
    yearly: 688,
    recommended: false,
    benefits: ["每月 2 張乘車券", "優先客服通道", "免費等候 10 分鐘"],
    enabled: true,
    order: 1,
  },
  {
    id: "black",
    level: "BLACK GOLD",
    name: "黑金會員",
    monthly: 128,
    yearly: 1288,
    recommended: true,
    benefits: ["每月 4 張乘車券", "專屬行程管家", "免費等候 20 分鐘"],
    enabled: true,
    order: 2,
  },
  {
    id: "diamond",
    level: "DIAMOND",
    name: "鑽石會員",
    monthly: 228,
    yearly: 2288,
    recommended: false,
    benefits: ["專屬車型升級", "機場快速接送", "全年專屬客服"],
    enabled: true,
    order: 3,
  },
];

const membershipPlanResponse = (plan: {
  id: string;
  level: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  benefits: Prisma.JsonValue;
  voucherCount: number;
  mileageRate: number;
  recommended: boolean;
  enabled: boolean;
  order: number;
}) => ({
  id: plan.id,
  level: plan.level,
  name: plan.name,
  description: plan.description,
  monthly: plan.monthlyPrice,
  yearly: plan.yearlyPrice,
  currency: plan.currency,
  benefits: Array.isArray(plan.benefits) ? plan.benefits.map(String) : [],
  voucherCount: plan.voucherCount,
  mileageRate: plan.mileageRate,
  recommended: plan.recommended,
  enabled: plan.enabled,
  order: plan.order,
});

async function ensureMembershipPlanDefaults() {
  const settings = await prisma.appSetting.findUniqueOrThrow({
    where: { id: appSettingsDefaults.id },
    select: { pricingCurrency: true, exchangeRate: true },
  });
  const currency = configuredCurrencyLabel(settings);
  for (const plan of membershipPlanDefaults) {
    const existing = await prisma.membershipPlan.findUnique({ where: { id: plan.id } });
    if (!existing) {
      await prisma.membershipPlan.create({
        data: {
          id: plan.id,
          level: plan.level,
          name: plan.name,
          monthlyPrice: convertCurrency(plan.monthly, "HKD", currency, settings.exchangeRate),
          yearlyPrice: convertCurrency(plan.yearly, "HKD", currency, settings.exchangeRate),
          currency,
          benefits: plan.benefits,
          voucherCount: Number(plan.benefits[0]?.match(/\d+/)?.[0] || 0),
          mileageRate: plan.id === "silver" ? 1.1 : plan.id === "black" ? 1.25 : 1.5,
          recommended: plan.recommended,
          enabled: plan.enabled,
          order: plan.order,
        },
      });
    } else if (existing.currency !== currency) {
      await prisma.membershipPlan.update({
        where: { id: plan.id },
        data: {
          monthlyPrice: convertCurrency(existing.monthlyPrice, existing.currency, currency, settings.exchangeRate),
          yearlyPrice: convertCurrency(existing.yearlyPrice, existing.currency, currency, settings.exchangeRate),
          currency,
        },
      });
    }
  }
}
const generateUserId = async () => {
  while (true) {
    const id = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(
      6,
      "0",
    );
    if (
      !(await prisma.user.findUnique({ where: { id }, select: { id: true } }))
    )
      return id;
  }
};
const users: User[] = [
  {
    id: "483271",
    countryCode: "+852",
    phoneNumber: "55550101",
    name: "Demo Rider",
    cashBalance: 120,
    fareBalance: 80,
    createdAt: "2026-08-22T09:30:00.000Z",
    lastLoginAt: null,
    lastLogoutAt: null,
  },
  {
    id: "719604",
    countryCode: "+86",
    phoneNumber: "13800000202",
    name: "Alex Chen",
    cashBalance: 0,
    fareBalance: 200,
    createdAt: "2026-08-27T14:10:00.000Z",
    lastLoginAt: null,
    lastLogoutAt: null,
  },
];
const phoneChallenges = new Map<string, PhoneChallenge>();
const clientPhoneChangeChallenges = new Map<
  string,
  ClientPhoneChangeChallenge
>();
const phoneChallengeRequests = new Map<
  string,
  { count: number; windowStartedAt: number }
>();
const PHONE_CODE_TTL_MS = 5 * 60 * 1000;
const PHONE_CODE_MAX_ATTEMPTS = 5;
const PHONE_CODE_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const PHONE_CODE_MAX_REQUESTS = 3;
const trips: Trip[] = [
  {
    id: "trip_demo_001",
    userId: "483271",
    origin: "Hong Kong Airport",
    destination: "Shenzhen Bay Port",
    region: "GUANGDONG",
    scheduledAt: "2026-09-02T10:00:00.000Z",
    status: "CONFIRMED",
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "trip_demo_002",
    userId: "719604",
    origin: "Macau Ferry Terminal",
    destination: "Zhuhai Gongbei",
    region: "MACAU",
    scheduledAt: "2026-09-03T03:30:00.000Z",
    status: "PENDING",
    createdAt: "2026-09-01T11:00:00.000Z",
  },
];
const charterOrders: CharterOrder[] = [
  {
    id: "charter_demo_001",
    userId: "483271",
    originRegion: "香港",
    origin: "離島區 · 香港國際機場",
    destinationRegion: "澳門",
    destination: "嘉模堂區 · 偉龍馬路",
    scheduledAt: "2026-09-05T01:00:00.000Z",
    durationHours: 4,
    status: "PENDING",
    createdAt: "2026-09-03T02:00:00.000Z",
  },
];
const vehicleCategoryDefaults: VehicleCategory[] = [
  {
    id: "standard-mpv",
    name: "普通跨境商務車",
    tabLabel: "普通MPV",
    order: 1,
    enabled: true,
  },
  {
    id: "premium-mpv",
    name: "高級跨境商務車",
    tabLabel: "高級MPV",
    order: 2,
    enabled: true,
  },
  {
    id: "standard-car",
    name: "普通跨境轎車",
    tabLabel: "普通轎車",
    order: 3,
    enabled: true,
  },
  {
    id: "premium-car",
    name: "頂級跨境轎車",
    tabLabel: "頂級轎車",
    order: 4,
    enabled: true,
  },
];
const vehicleExtraDefaults: VehicleExtraOption[] = [
  {
    id: "instant-order",
    name: "instant-order",
    label: "即時訂單",
    price: 0,
    currency: "RMB",
    enabled: true,
    order: 0,
    requiredForImmediate: true,
    requiredWithinMinutes: 60,
    triggerType: "IMMEDIATE",
    triggerEnabled: true,
    nightStartTime: null,
    nightEndTime: null,
  },
  {
    id: "night-surcharge",
    name: "night-surcharge",
    label: "深夜加班費",
    price: 100,
    currency: "RMB",
    enabled: true,
    order: 1,
    requiredForImmediate: false,
    requiredWithinMinutes: null,
    triggerType: "NIGHT",
    triggerEnabled: true,
    nightStartTime: "22:00",
    nightEndTime: "06:00",
  },
  {
    id: "severe-weather",
    name: "severe-weather",
    label: "惡劣天氣費",
    price: 100,
    currency: "RMB",
    enabled: true,
    order: 2,
    requiredForImmediate: false,
    requiredWithinMinutes: null,
    triggerType: "WEATHER",
    triggerEnabled: true,
    nightStartTime: null,
    nightEndTime: null,
  },
  {
    id: "child-seat",
    name: "child-seat",
    label: "兒童安全座椅",
    price: 50,
    currency: "RMB",
    enabled: true,
    order: 3,
    requiredForImmediate: false,
    requiredWithinMinutes: null,
    triggerType: "NONE",
    triggerEnabled: true,
    nightStartTime: null,
    nightEndTime: null,
  },
  {
    id: "additional-stop",
    name: "additional-stop",
    label: "額外停靠點",
    price: 100,
    currency: "RMB",
    enabled: true,
    order: 4,
    requiredForImmediate: false,
    requiredWithinMinutes: null,
    triggerType: "NONE",
    triggerEnabled: true,
    nightStartTime: null,
    nightEndTime: null,
  },
];
const defaultDistancePricing = (
  categoryId: string,
): DistancePricingSettings => ({
  categoryId,
  minimumFare: 800,
  currency: "RMB",
  tiers: [
    {
      id: `${categoryId}-tier-0-20`,
      fromKm: 0,
      toKm: 20,
      pricePerKm: 40,
      order: 1,
    },
    {
      id: `${categoryId}-tier-20-120`,
      fromKm: 20,
      toKm: 120,
      pricePerKm: 15,
      order: 2,
    },
    {
      id: `${categoryId}-tier-120-plus`,
      fromKm: 120,
      toKm: null,
      pricePerKm: 12,
      order: 3,
    },
  ],
});
const vehicleDefaults: VehicleCatalogItem[] = [
  {
    id: "standard-mpv",
    categoryId: "standard-mpv",
    brand: "",
    model: "跨境商務車",
    series: "",
    seats: 6,
    image: "/static/vehicles/alphard.png",
    colorLabel: "不限顏色",
    modelChoiceLabel: "不限車款",
    enabled: true,
    order: 1,
  },
  {
    id: "premium-vellfire",
    categoryId: "premium-mpv",
    brand: "Toyota",
    model: "Vellfire",
    series: "20系",
    seats: 7,
    image: "/static/vehicles/vellfire.png",
    colorLabel: "不限顏色",
    modelChoiceLabel: "",
    enabled: true,
    order: 1,
  },
  {
    id: "premium-alphard",
    categoryId: "premium-mpv",
    brand: "Toyota",
    model: "Alphard",
    series: "30系",
    seats: 6,
    image: "/static/vehicles/alphard.png",
    colorLabel: "不限顏色",
    modelChoiceLabel: "",
    enabled: true,
    order: 2,
  },
  {
    id: "tesla-s",
    categoryId: "standard-car",
    brand: "Tesla",
    model: "Model",
    series: "S",
    seats: 5,
    image: "/static/vehicles/tesla-s.png",
    colorLabel: "不限顏色",
    modelChoiceLabel: "",
    enabled: true,
    order: 1,
  },
];
const recommendedAddressDefaults: RecommendedAddress[] = (
  [
    [
      "hk-airport",
      "香港",
      null,
      "香港國際機場",
      "香港特別行政區-離島區-香港赤臘角天路1號",
    ],
    [
      "hk-disney",
      "香港",
      null,
      "香港迪士尼樂園",
      "香港特別行政區-荃灣區-大嶼山竹篙灣",
    ],
    [
      "sz-airport",
      "大陸",
      "深圳市",
      "深圳寶安國際機場",
      "深圳市-寶安區-寶安大道",
    ],
    ["sz-bay", "大陸", "深圳市", "深圳灣口岸", "深圳市-南山區-東濱路"],
    [
      "macau-airport",
      "澳門",
      null,
      "澳門國際機場",
      "澳門特別行政區-嘉模堂區-偉龍馬路",
    ],
    [
      "macau-ruins",
      "澳門",
      null,
      "澳門大三巴牌坊",
      "澳門特別行政區-花王堂區-炮台山下",
    ],
  ] as Array<[string, AddressRegion, string | null, string, string]>
).map(([id, region, city, name, address], index) => ({
  id,
  region,
  city: region === "大陸" ? city : null,
  name,
  address,
  latitude: null,
  longitude: null,
  enabled: true,
  order: index + 1,
}));
async function ensurePricingDefaults() {
  await prisma.$transaction(async (tx) => {
    await tx.appSetting.upsert({
      where: { id: appSettingsDefaults.id },
      create: appSettingsDefaults,
      update: {},
    });
    let appSettings = await tx.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const normalizedRate = normalizeExchangeRate(appSettings.exchangeRate);
    if (
      normalizedRate !== null &&
      normalizedRate !== appSettings.exchangeRate
    ) {
      appSettings = await tx.appSetting.update({
        where: { id: appSettings.id },
        data: { exchangeRate: normalizedRate },
      });
    }
    for (const category of vehicleCategoryDefaults) {
      await tx.vehicleCategory.upsert({
        where: { id: category.id },
        create: category,
        update: {},
      });
      const pricing = {
        ...defaultDistancePricing(category.id),
        currency: configuredCurrencyLabel(appSettings),
      };
      await tx.categoryDistancePricing.upsert({
        where: { categoryId: category.id },
        create: {
          categoryId: category.id,
          minimumFare: pricing.minimumFare,
          currency: pricing.currency,
          tiers: { create: pricing.tiers },
        },
        update: {},
      });
    }
    for (const vehicle of vehicleDefaults) {
      await tx.vehicle.upsert({
        where: { id: vehicle.id },
        create: vehicle,
        update: {},
      });
    }
    for (const extra of vehicleExtraDefaults) {
      await tx.vehicleExtra.upsert({
        where: { id: extra.id },
        create: extra,
        update: {},
      });
    }
    if ((await tx.recommendedAddress.count()) === 0) {
      for (const address of recommendedAddressDefaults) {
        await tx.recommendedAddress.upsert({
          where: { id: address.id },
          create: address,
          update: {},
        });
      }
    }
    for (const user of users) {
      await tx.user.upsert({
        where: {
          countryCode_phoneNumber: {
            countryCode: user.countryCode,
            phoneNumber: user.phoneNumber,
          },
        },
        create: { ...user, createdAt: new Date(user.createdAt) },
        update: {},
      });
    }
  });
}
function appSettingsResponse(settings: typeof appSettingsDefaults) {
  return {
    language: settings.language,
    region: settings.region,
    currency: settings.currency,
    pricingCurrency: settings.pricingCurrency,
    walletCurrency: settings.walletCurrency,
    exchangeRate:
      normalizeExchangeRate(settings.exchangeRate) ??
      appSettingsDefaults.exchangeRate,
    adminLogo: settings.adminLogo,
    severeWeatherEnabled: settings.severeWeatherEnabled,
    driverRaceEnabled: settings.driverRaceEnabled ?? false,
    dispatchSchedulingEnabled: settings.dispatchSchedulingEnabled ?? true,
    driverPayoutPercentage: settings.driverPayoutPercentage ?? 100,
    fareBalancePayEnabled: settings.fareBalancePayEnabled ?? true,
    cashBalancePayEnabled: settings.cashBalancePayEnabled ?? true,
    wechatPayEnabled: settings.wechatPayEnabled ?? true,
    alipayPayEnabled: settings.alipayPayEnabled ?? true,
    bankCardPayEnabled: settings.bankCardPayEnabled ?? true,
    sandboxMode: settings.sandboxMode ?? false,
    mileageSpendPerKm: settings.mileageSpendPerKm ?? 10,
    mileageValidityMonths: settings.mileageValidityMonths ?? 12,
    invitationEnabled: settings.invitationEnabled ?? true,
    invitationInviterMileage: settings.invitationInviterMileage ?? 300,
    invitationInviteeFare: settings.invitationInviteeFare ?? 50,
    invitationQualificationDays: settings.invitationQualificationDays ?? 30,
    invitationMileageValidityMonths:
      settings.invitationMileageValidityMonths ?? 12,
  };
}
function validateAdminLogo(value: string) {
  const match =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match)
    throw new HttpException(
      "Logo must be a PNG, JPEG, or WebP image",
      HttpStatus.BAD_REQUEST,
    );
  const image = Buffer.from(match[2], "base64");
  if (!image.length || image.length > 1024 * 1024)
    throw new HttpException(
      "Logo file must not exceed 1 MB",
      HttpStatus.BAD_REQUEST,
    );
  const mime = match[1];
  let dimensions: [number, number] | null = null;
  if (
    mime === "image/png" &&
    image.length >= 24 &&
    image.subarray(1, 4).toString() === "PNG"
  )
    dimensions = [image.readUInt32BE(16), image.readUInt32BE(20)];
  if (mime === "image/jpeg" && image[0] === 0xff && image[1] === 0xd8) {
    for (let offset = 2; offset + 8 < image.length;) {
      if (image[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = image[offset + 1];
      const length = image.readUInt16BE(offset + 2);
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        dimensions = [
          image.readUInt16BE(offset + 7),
          image.readUInt16BE(offset + 5),
        ];
        break;
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (
    mime === "image/webp" &&
    image.length >= 30 &&
    image.subarray(0, 4).toString() === "RIFF" &&
    image.subarray(8, 12).toString() === "WEBP"
  ) {
    const kind = image.subarray(12, 16).toString();
    if (kind === "VP8X")
      dimensions = [1 + image.readUIntLE(24, 3), 1 + image.readUIntLE(27, 3)];
    if (
      kind === "VP8 " &&
      image[23] === 0x9d &&
      image[24] === 0x01 &&
      image[25] === 0x2a
    )
      dimensions = [
        image.readUInt16LE(26) & 0x3fff,
        image.readUInt16LE(28) & 0x3fff,
      ];
    if (kind === "VP8L" && image[20] === 0x2f) {
      const bits = image.readUInt32LE(21);
      dimensions = [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
  }
  if (!dimensions)
    throw new HttpException(
      "Invalid or unsupported logo image",
      HttpStatus.BAD_REQUEST,
    );
  return value;
}
function vehicleCategoryResponse(category: VehicleCategory) {
  return {
    id: category.id,
    name: category.name,
    tabLabel: category.tabLabel,
    order: category.order,
    enabled: category.enabled,
  };
}
function vehicleAssetVersion(vehicle: VehicleCatalogItem) {
  if (!vehicle.updatedAt) return "";
  const version = vehicle.updatedAt instanceof Date
    ? vehicle.updatedAt.getTime()
    : new Date(vehicle.updatedAt).getTime();
  return Number.isFinite(version) ? `?v=${version}` : "";
}
function vehicleImagePath(vehicle: VehicleCatalogItem) {
  return vehicle.imageData && vehicle.imageMime
    ? `/vehicles/${encodeURIComponent(vehicle.id)}/image${vehicleAssetVersion(vehicle)}`
    : vehicle.image;
}
function vehicleLogoPath(vehicle: VehicleCatalogItem) {
  return vehicle.logoData && vehicle.logoMime
    ? `/vehicles/${encodeURIComponent(vehicle.id)}/logo${vehicleAssetVersion(vehicle)}`
    : null;
}
function vehicleResponse(vehicle: VehicleCatalogItem) {
  return {
    id: vehicle.id,
    categoryId: vehicle.categoryId,
    brand: vehicle.brand,
    model: vehicle.model,
    series: vehicle.series,
    seats: vehicle.seats,
    image: vehicleImagePath(vehicle),
    fallbackImage: vehicle.image,
    hasStoredImage: Boolean(vehicle.imageData && vehicle.imageMime),
    logo: vehicleLogoPath(vehicle),
    hasStoredLogo: Boolean(vehicle.logoData && vehicle.logoMime),
    colorLabel: vehicle.colorLabel,
    modelChoiceLabel: vehicle.modelChoiceLabel,
    enabled: vehicle.enabled,
    order: vehicle.order,
  };
}
function vehicleExtraResponse(extra: VehicleExtraOption) {
  return {
    id: extra.id,
    name: extra.name,
    label: extra.label,
    price: extra.price,
    currency: extra.currency,
    enabled: extra.enabled,
    order: extra.order,
    requiredForImmediate: extra.requiredForImmediate,
    requiredWithinMinutes: extra.requiredWithinMinutes,
    triggerType: extra.triggerType,
    triggerEnabled: extra.triggerEnabled,
    nightStartTime: extra.nightStartTime,
    nightEndTime: extra.nightEndTime,
  };
}
function pricingResponse(pricing: DistancePricingSettings) {
  return {
    categoryId: pricing.categoryId,
    minimumFare: pricing.minimumFare,
    currency: pricing.currency,
    tiers: pricing.tiers.map((tier) => ({
      id: tier.id,
      fromKm: tier.fromKm,
      toKm: tier.toKm,
      pricePerKm: tier.pricePerKm,
      order: tier.order,
    })),
  };
}
function routeMinimumFareResponse(item: RouteMinimumFareSettings) {
  return {
    id: item.id,
    originRegion: item.originRegion,
    originCity: item.originCity,
    destinationRegion: item.destinationRegion,
    destinationCity: item.destinationCity,
    categoryId: item.categoryId,
    minimumFare: item.minimumFare,
    currency: item.currency,
    enabled: item.enabled,
  };
}
function parseRouteMinimumFare(body: Partial<RouteMinimumFareSettings>) {
  const originRegion = body.originRegion?.trim();
  const destinationRegion = body.destinationRegion?.trim();
  const originCity = body.originCity?.trim() || null;
  const destinationCity = body.destinationCity?.trim() || null;
  const minimumFare = Number(body.minimumFare);
  const currency = body.currency?.trim();
  if (
    !originRegion ||
    !destinationRegion ||
    !Number.isFinite(minimumFare) ||
    minimumFare < 0 ||
    !currency ||
    !currencyCode(currency)
  ) {
    throw new HttpException(
      "Valid route minimum fare fields are required",
      HttpStatus.BAD_REQUEST,
    );
  }
  return {
    originRegion,
    originCity,
    destinationRegion,
    destinationCity,
    categoryId: body.categoryId?.trim() || null,
    minimumFare,
    currency,
    enabled: body.enabled ?? true,
  };
}
function validVehicleCategory(body: Partial<VehicleCategory>) {
  return body.id && body.name?.trim() && body.tabLabel?.trim();
}
type ManagedUser = {
  id: string;
  countryCode: string;
  phoneNumber: string;
  name: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  avatarData: Uint8Array | null;
  email: string | null;
  passwordHash: string | null;
  gender: string | null;
  region: string | null;
  birthday: Date | null;
  cashBalance: number;
  fareBalance: number;
  membershipLevel: string | null;
  enabled: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  lastLogoutAt: Date | null;
  authIdentities?: Array<{ provider: string }>;
  verificationCodes?: Array<{
    id: string;
    purpose: string;
    status: string;
    attempts: number;
    expiresAt: Date;
    consumedAt: Date | null;
    createdAt: Date;
  }>;
};
function loginMethods(user: ManagedUser) {
  const methods = ["SMS 驗證碼"];
  if (user.passwordHash) methods.push("密碼");
  for (const identity of user.authIdentities || [])
    if (identity.provider === "wechat") methods.push("WeChat");
  for (const identity of user.authIdentities || [])
    if (identity.provider === "apple") methods.push("Apple");
  return [...new Set(methods)];
}
const avatarUrlLifetimeMs = 5 * 60 * 1000;
function avatarUrlFor(userId: string) {
  const expires = Date.now() + avatarUrlLifetimeMs;
  const payload = `${userId}.${expires}`;
  const signature = createHmac("sha256", clientSecret())
    .update(payload)
    .digest("base64url");
  return `/client/avatar/${encodeURIComponent(userId)}?expires=${expires}&signature=${signature}`;
}
function validAvatarSignature(userId: string, expires: number, signature: string) {
  const now = Date.now();
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + avatarUrlLifetimeMs) return false;
  const expected = createHmac("sha256", clientSecret())
    .update(`${userId}.${expires}`)
    .digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
function userResponse(user: ManagedUser) {
  return {
    id: user.id,
    countryCode: user.countryCode,
    phoneNumber: user.phoneNumber,
    phone: `${user.countryCode} ${user.phoneNumber}`,
    name: user.name,
    displayName: user.displayName,
    avatarUrl: user.avatarData ? avatarUrlFor(user.id) : null,
    email: user.email,
    gender: user.gender,
    region: user.region,
    birthday: user.birthday?.toISOString().slice(0, 10) || null,
    cashBalance: user.cashBalance,
    fareBalance: user.fareBalance,
    membershipLevel: user.membershipLevel,
    enabled: user.enabled,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    lastLogoutAt: user.lastLogoutAt?.toISOString() || null,
    loginMethods: loginMethods(user),
    verificationCodeCount: user.verificationCodes?.length || 0,
  };
}
function clientSecurityResponse(
  user: ManagedUser & { authIdentities?: Array<{ provider: string }> },
) {
  return {
    countryCode: user.countryCode,
    phoneNumber: user.phoneNumber,
    email: user.email,
    passwordSet: !!user.passwordHash,
    linkedProviders: (user.authIdentities || [])
      .map((identity) => identity.provider)
      .filter(
        (provider): provider is "apple" | "wechat" =>
          provider === "apple" || provider === "wechat",
      ),
  };
}
function parsePhoneIdentity(body: {
  countryCode?: string;
  phoneNumber?: string;
}) {
  const countryCode = body.countryCode?.trim() || "";
  const phoneNumber = body.phoneNumber?.replace(/[\s-]/g, "") || "";
  const expectedLength =
    countryCode === "+852" || countryCode === "+853"
      ? 8
      : countryCode === "+86"
        ? 11
        : null;
  const validLength = expectedLength
    ? phoneNumber.length === expectedLength
    : phoneNumber.length >= 4 && phoneNumber.length <= 15;
  if (
    !/^\+\d{1,4}$/.test(countryCode) ||
    !/^\d+$/.test(phoneNumber) ||
    !validLength
  ) {
    throw new HttpException(
      expectedLength
        ? `Phone number must contain ${expectedLength} digits for ${countryCode}`
        : "A valid country code and phone number are required",
      HttpStatus.BAD_REQUEST,
    );
  }
  return { countryCode, phoneNumber };
}
function validateCommonPassenger(
  body: {
    name?: string;
    phone?: string;
    phoneRegion?: string;
    gender?: string;
    documentType?: string;
    passportCountry?: string;
    isDefault?: boolean;
  },
  fallback?: {
    name: string;
    phone: string;
    phoneRegion: string;
    gender: string;
    documentType: string;
    passportCountry: string | null;
    isDefault: boolean;
  },
) {
  const value = {
    name: body.name?.trim() ?? fallback?.name ?? "",
    phone: body.phone?.trim() ?? fallback?.phone ?? "",
    phoneRegion: body.phoneRegion?.trim() ?? fallback?.phoneRegion ?? "+852",
    gender: body.gender?.trim() ?? fallback?.gender ?? "先生",
    documentType:
      body.documentType?.trim() ?? fallback?.documentType ?? "港澳通行證",
    passportCountry:
      body.passportCountry?.trim() || fallback?.passportCountry || null,
    isDefault: body.isDefault ?? fallback?.isDefault ?? false,
  };
  if (
    !value.name ||
    value.name.length > 100 ||
    !value.phone ||
    !/^[0-9\s-]{4,30}$/.test(value.phone) ||
    !["先生", "女士"].includes(value.gender) ||
    !["港澳通行證", "香港身分證", "澳門身分證", "護照"].includes(
      value.documentType,
    ) ||
    (value.documentType === "護照" && !value.passportCountry)
  )
    throw new HttpException(
      "Invalid common passenger fields",
      HttpStatus.BAD_REQUEST,
    );
  return value;
}
function parseProfileEmail(value?: string) {
  const email = value?.trim() || null;
  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    throw new HttpException(
      "A valid email is required",
      HttpStatus.BAD_REQUEST,
    );
  return email;
}
function parseBirthday(value?: string) {
  if (!value) return null;
  const birthday = new Date(value);
  if (Number.isNaN(birthday.getTime()))
    throw new HttpException(
      "A valid birthday is required",
      HttpStatus.BAD_REQUEST,
    );
  return birthday;
}
function clientSecret() {
  const value =
    process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "development-client-secret";
  throw new HttpException(
    "Client session secret is not configured",
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
function clientTokenFor(session: ClientSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${createHmac("sha256", clientSecret()).update(payload).digest("base64url")}`;
}
function driverSecret() {
  const value =
    process.env.DRIVER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "development-driver-secret";
  throw new HttpException(
    "Driver session secret is not configured",
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
function driverTokenFor(session: DriverSessionToken) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${createHmac("sha256", driverSecret()).update(payload).digest("base64url")}`;
}
function orderUrlTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function orderUrlTokenEncryptionKey() {
  const secret =
    process.env.ORDER_URL_ENCRYPTION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ORDER_URL_ENCRYPTION_SECRET must be configured");
  return createHash("sha256").update(secret).digest();
}
function encryptOrderUrlToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", orderUrlTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((value) => value.toString("base64url"))
    .join(".");
}
function decryptOrderUrlToken(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted order URL token");
  const [iv, authTag, encrypted] = parts.map((part) =>
    Buffer.from(part, "base64url"),
  );
  const decipher = createDecipheriv(
    "aes-256-gcm",
    orderUrlTokenEncryptionKey(),
    iv,
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
function orderUrlValue(token: string) {
  try {
    return buildDriverOrderUrl(token);
  } catch (error) {
    throw new HttpException(
      error instanceof Error ? error.message : "Invalid driver order URL configuration",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
function provisionalDriverTokenFor(session: ProvisionalDriverSessionToken) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${createHmac("sha256", driverSecret()).update(payload).digest("base64url")}`;
}
async function provisionalDriverSessionFrom(req: RequestLike) {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const [payload, signature] = value?.split(".") || [];
  if (!payload || !signature)
    throw new UnauthorizedException("Valid provisional driver session required");
  const expected = createHmac("sha256", driverSecret())
    .update(payload)
    .digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw new Error("signature mismatch");
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as ProvisionalDriverSessionToken;
    if (
      session.scope !== "ORDER_INVITE" ||
      !session.sub ||
      !session.jti ||
      !session.orderUrlId ||
      !session.tripId ||
      session.exp <= Date.now()
    )
      throw new Error("invalid session");
    const stored = await prisma.provisionalDriverSession.findUnique({
      where: { jti: session.jti },
      include: { driver: true, orderUrl: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now() ||
      stored.driverId !== session.sub ||
      stored.tripId !== session.tripId ||
      stored.orderUrlId !== session.orderUrlId ||
      !stored.driver.enabled ||
      stored.orderUrl.revokedAt
    )
      throw new Error("revoked session");
    return session;
  } catch {
    throw new UnauthorizedException("Valid provisional driver session required");
  }
}
async function driverAuthResponse(driver: any) {
  if (!driver.enabled)
    throw new ForbiddenException("Driver account is disabled");
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const session: DriverSessionToken = {
    sub: driver.id,
    exp,
    jti: randomBytes(16).toString("hex"),
  };
  await prisma.driverSession.create({
    data: { jti: session.jti, driverId: driver.id, expiresAt: new Date(exp) },
  });
  return {
    token: driverTokenFor(session),
    expiresAt: new Date(exp).toISOString(),
    driver: driverResponse(driver),
  };
}
async function driverSessionFrom(
  req: RequestLike,
): Promise<DriverSessionToken> {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const [payload, signature] = value?.split(".") || [];
  if (!payload || !signature)
    throw new UnauthorizedException("Valid driver session required");
  const expected = createHmac("sha256", driverSecret())
    .update(payload)
    .digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw new Error("signature mismatch");
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as DriverSessionToken;
    if (!session.sub || !session.jti || session.exp <= Date.now())
      throw new Error("invalid session");
    const stored = await prisma.driverSession.findUnique({
      where: { jti: session.jti },
      include: { driver: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now() ||
      stored.driverId !== session.sub ||
      !stored.driver.enabled
    )
      throw new Error("revoked session");
    return session;
  } catch {
    throw new UnauthorizedException("Valid driver session required");
  }
}
function requireReviewedDriver(driver: {
  reviewStatus: string;
  enabled: boolean;
}) {
  if (!driver.enabled)
    throw new ForbiddenException("Driver account is disabled");
  if (driver.reviewStatus !== "APPROVED")
    throw new ForbiddenException(
      "Driver approval is required before accepting or operating trips",
    );
}
async function reviewedDriverFrom(req: RequestLike) {
  const session = await driverSessionFrom(req);
  const driver = await prisma.driver.findUnique({ where: { id: session.sub } });
  if (!driver) throw new UnauthorizedException("Driver not found");
  requireReviewedDriver(driver);
  return { session, driver };
}
function normalizeInvitationCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

async function invitationCodeFor(userId: string) {
  const existing = await prisma.invitationCode.findUnique({ where: { userId } });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await prisma.invitationCode.create({
        data: { userId, code: `MTP${randomBytes(4).toString("hex").toUpperCase()}` },
      });
      return created.code;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const created = await prisma.invitationCode.findUnique({ where: { userId } });
      if (created) return created.code;
    }
  }
  throw new HttpException("Unable to generate invitation code", HttpStatus.SERVICE_UNAVAILABLE);
}

async function rewardInvitation(tx: Prisma.TransactionClient, inviteeId: string, tripId: string) {
  const invitation = await tx.invitation.findUnique({ where: { inviteeId } });
  if (!invitation || invitation.status !== "REGISTERED") return;
  const completedTrips = await tx.trip.count({ where: { userId: inviteeId, status: "COMPLETED" } });
  if (completedTrips !== 1) return;
  const now = new Date();
  if (now > invitation.expiresAt) {
    await tx.invitation.updateMany({ where: { id: invitation.id, status: "REGISTERED" }, data: { status: "EXPIRED" } });
    return;
  }
  const claimed = await tx.invitation.updateMany({
    where: { id: invitation.id, status: "REGISTERED", qualifiedTripId: null },
    data: { status: "REWARDED", qualifiedTripId: tripId, rewardedAt: now },
  });
  if (claimed.count !== 1) return;
  const account = await tx.mileageAccount.upsert({
    where: { userId: invitation.inviterId },
    create: { userId: invitation.inviterId, balance: invitation.inviterMileageReward, lifetimeEarned: invitation.inviterMileageReward },
    update: { balance: { increment: invitation.inviterMileageReward }, lifetimeEarned: { increment: invitation.inviterMileageReward } },
  });
  await tx.mileageLedger.create({
    data: {
      userId: invitation.inviterId,
      amount: invitation.inviterMileageReward,
      balanceAfter: account.balance,
      type: "EARN",
      reason: "邀請好友完成首趟行程",
      expiresAt: new Date(new Date(now).setMonth(now.getMonth() + invitation.mileageValidityMonths)),
    },
  });
  const settings = await tx.appSetting.findUniqueOrThrow({
    where: { id: appSettingsDefaults.id },
  });
  const rewardAmount = convertCurrency(
    invitation.inviteeFareReward,
    invitation.rewardCurrency,
    currencyCode(settings.walletCurrency) ?? "RMB",
    settings.exchangeRate,
  );
  const invitee = await tx.user.update({ where: { id: inviteeId }, data: { fareBalance: { increment: rewardAmount } } });
  await tx.walletTransaction.create({
    data: { userId: inviteeId, wallet: "FARE", type: "INVITATION_REWARD", amount: rewardAmount, balanceAfter: invitee.fareBalance, reason: "完成受邀首趟行程" },
  });
}

async function clientAuthResponse(user: ManagedUser) {
  if (!user.enabled) throw new ForbiddenException("User account is disabled");
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const session: ClientSession = {
    sub: user.id,
    exp,
    jti: randomBytes(16).toString("hex"),
  };
  await prisma.clientSession.create({
    data: { jti: session.jti, userId: user.id, expiresAt: new Date(exp) },
  });
  return {
    token: clientTokenFor(session),
    expiresAt: new Date(exp).toISOString(),
    user: userResponse(user),
  };
}
async function clientSessionFrom(req: RequestLike): Promise<ClientSession> {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const [payload, signature] = value?.split(".") || [];
  if (!payload || !signature)
    throw new UnauthorizedException("Valid client session required");
  const expected = createHmac("sha256", clientSecret())
    .update(payload)
    .digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw new Error("signature mismatch");
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as ClientSession;
    if (!session.sub || !session.jti || session.exp <= Date.now())
      throw new Error("invalid session");
    const stored = await prisma.clientSession.findUnique({
      where: { jti: session.jti },
      include: { user: { select: { enabled: true } } },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now() ||
      stored.userId !== session.sub ||
      !stored.user.enabled
    )
      throw new Error("revoked session");
    return session;
  } catch {
    throw new UnauthorizedException("Valid client session required");
  }
}
function calculateDistanceFare(
  distanceKm: number,
  pricing: DistancePricingSettings,
) {
  const subtotal = [...pricing.tiers]
    .sort((a, b) => a.order - b.order)
    .reduce((total, tier) => {
      const upperBound =
        tier.toKm === null ? distanceKm : Math.min(distanceKm, tier.toKm);
      return total + Math.max(0, upperBound - tier.fromKm) * tier.pricePerKm;
    }, 0);
  return Math.max(pricing.minimumFare, subtotal);
}
function currencyCode(currency: string) {
  if (
    currency === "RMB" ||
    currency === "RMB¥" ||
    currency === "CNY" ||
    currency === currencyLabels.RMB
  )
    return "RMB";
  if (
    currency === "HKD" ||
    currency === "HKD$" ||
    currency === currencyLabels.HKD
  )
    return "HKD";
  return null;
}
function displayCurrency(value: unknown, fallback: string) {
  if (value !== undefined && typeof value !== "string")
    throw new HttpException(
      "Currency must be RMB or HKD",
      HttpStatus.BAD_REQUEST,
    );
  const code = currencyCode(
    typeof value === "string" ? value.trim() : fallback,
  );
  if (!code)
    throw new HttpException(
      "Currency must be RMB or HKD",
      HttpStatus.BAD_REQUEST,
    );
  return code;
}
function normalizeExchangeRate(value: unknown) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate >= 10 ? rate / 100 : rate;
}
function convertCurrency(
  amount: number,
  sourceCurrency: string,
  targetCurrency: "RMB" | "HKD",
  exchangeRate: number,
) {
  const source = currencyCode(sourceCurrency);
  if (!source)
    throw new HttpException(
      "Pricing currency must be RMB or HKD",
      HttpStatus.BAD_REQUEST,
    );
  if (source === targetCurrency) return roundMoney(amount);
  const normalizedRate = normalizeExchangeRate(exchangeRate);
  if (normalizedRate === null)
    throw new HttpException(
      "Exchange rate is unavailable",
      HttpStatus.CONFLICT,
    );
  return roundMoney(
    source === "RMB" ? amount / normalizedRate : amount * normalizedRate,
  );
}
function parseQuoteExtras(body: CreateQuoteRequest): QuoteExtraSelection[] {
  const source = body.extras === undefined ? body.extraIds : body.extras;
  if (source === undefined) return [];
  if (!Array.isArray(source))
    throw new HttpException("Extras must be an array", HttpStatus.BAD_REQUEST);
  const selections = new Map<string, number>();
  for (const item of source) {
    const option =
      typeof item === "string"
        ? { id: item, quantity: 1 }
        : (item as QuoteExtraRequest);
    const id = typeof option?.id === "string" ? option.id.trim() : "";
    const quantity =
      option?.quantity === undefined ? 1 : Number(option.quantity);
    if (!id || !Number.isInteger(quantity) || quantity <= 0)
      throw new HttpException(
        "Quote extras must have valid ids and quantities",
        HttpStatus.BAD_REQUEST,
      );
    selections.set(id, (selections.get(id) || 0) + quantity);
  }
  return [...selections].map(([id, quantity]) => ({ id, quantity }));
}
function quoteDistanceLines(
  distanceKm: number,
  pricing: DistancePricingSettings,
) {
  const tierLines = [...pricing.tiers]
    .sort((a, b) => a.order - b.order)
    .flatMap((tier) => {
      const upperBound =
        tier.toKm === null ? distanceKm : Math.min(distanceKm, tier.toKm);
      const quantity = Math.max(0, upperBound - tier.fromKm);
      return quantity > 0
        ? [
            {
              type: "DISTANCE_TIER" as const,
              sourceId: tier.id,
              label: `距離費用 ${tier.fromKm}–${tier.toKm ?? "以上"} 公里`,
              quantity,
              unitAmount: tier.pricePerKm,
              totalAmount: quantity * tier.pricePerKm,
            },
          ]
        : [];
    });
  const tierSubtotal = tierLines.reduce(
    (total, line) => total + line.totalAmount,
    0,
  );
  if (tierSubtotal <= pricing.minimumFare) {
    return [
      {
        type: "MINIMUM_FARE" as const,
        sourceId: null,
        label: "最低車資",
        quantity: 1,
        unitAmount: pricing.minimumFare,
        totalAmount: pricing.minimumFare,
      },
    ];
  }

  return tierLines;
}
function routeMinimumFareLine(
  routeMinimumFare: RouteMinimumFareSettings | null,
  distanceFare: number,
  exchangeRate: number,
) {
  if (!routeMinimumFare) return [];
  const minimumFare = convertCurrency(
    routeMinimumFare.minimumFare,
    routeMinimumFare.currency,
    "RMB",
    exchangeRate,
  );
  if (minimumFare <= distanceFare) return [];
  return [
    {
      type: "ADJUSTMENT" as const,
      sourceId: routeMinimumFare.id,
      label: "路線最低車資",
      quantity: 1,
      unitAmount: minimumFare,
      totalAmount: minimumFare - distanceFare,
    },
  ];
}
function quoteExpiryDate() {
  const configuredMinutes = Number(process.env.QUOTE_TTL_MINUTES);
  const minutes =
    Number.isInteger(configuredMinutes) &&
    configuredMinutes > 0 &&
    configuredMinutes <= 24 * 60
      ? configuredMinutes
      : 15;
  return new Date(Date.now() + minutes * 60 * 1000);
}
type PersistedQuote = {
  id: string;
  distanceKm: number;
  durationSeconds: number | null;
  currency: string;
  subtotal: number;
  total: number;
  expiresAt: Date | null;
  createdAt: Date;
  pricing: {
    categoryId: string;
    categoryName: string;
    tabLabel: string;
    minimumFare: number;
    currency: string;
    tiers: Array<{
      sourceTierId: string;
      fromKm: number;
      toKm: number | null;
      pricePerKm: number;
      order: number;
    }>;
  } | null;
  vehicle: {
    vehicleId: string;
    categoryId: string | null;
    brand: string;
    model: string;
    series: string;
    seats: number;
    image: string;
    colorLabel: string;
    modelChoiceLabel: string;
  } | null;
  lines: Array<{
    type: string;
    sourceId: string | null;
    label: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    currency: string;
    order: number;
  }>;
  promotionUsages?: Array<{
    id: string;
    promotionId: string;
    status: string;
    createdAt: Date;
    usedAt: Date | null;
    releasedAt: Date | null;
    promotion: {
      id: string;
      name: string;
      kind: string;
      discountType: string;
      discountValue: number;
      currency: string;
      minimumSpend: number;
      maximumDiscount: number | null;
      couponCode: string | null;
    };
  }>;
};
function asIsoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function quoteResponse(quote: PersistedQuote) {
  const lines = Array.isArray(quote.lines) ? quote.lines : [];
  const promotionUsages = Array.isArray(quote.promotionUsages) ? quote.promotionUsages : [];
  const discountLines = lines.filter(
    (line) => line.type === "DISCOUNT" && line.totalAmount < 0,
  );
  return {
    id: quote.id,
    distanceMeters: quote.distanceKm * 1000,
    distanceKm: quote.distanceKm,
    durationSeconds: quote.durationSeconds || 0,
    currency: quote.currency,
    subtotal: quote.subtotal,
    total: quote.total,
    createdAt: asIsoDate(quote.createdAt),
    expiresAt: asIsoDate(quote.expiresAt),
    pricing: quote.pricing && {
      categoryId: quote.pricing.categoryId,
      categoryName: quote.pricing.categoryName,
      tabLabel: quote.pricing.tabLabel,
      minimumFare: quote.pricing.minimumFare,
      currency: quote.pricing.currency,
      tiers: Array.isArray(quote.pricing.tiers) ? quote.pricing.tiers.map((tier) => ({
        id: tier.sourceTierId,
        fromKm: tier.fromKm,
        toKm: tier.toKm,
        pricePerKm: tier.pricePerKm,
        order: tier.order,
      })) : [],
    },
    vehicle: quote.vehicle && {
      id: quote.vehicle.vehicleId,
      categoryId: quote.vehicle.categoryId,
      brand: quote.vehicle.brand,
      model: quote.vehicle.model,
      series: quote.vehicle.series,
      seats: quote.vehicle.seats,
      image: quote.vehicle.image,
      colorLabel: quote.vehicle.colorLabel,
      modelChoiceLabel: quote.vehicle.modelChoiceLabel,
    },
    appliedPromotion: discountLines.length
      ? {
          id: discountLines[0].sourceId,
          label: discountLines.map((line) => line.label).join(" + "),
          discount: roundMoney(
            discountLines.reduce(
              (sum, line) => sum + Math.abs(line.totalAmount),
              0,
            ),
          ),
          currency: discountLines[0].currency,
        }
      : null,
    promotions: promotionUsages.filter((usage) => usage.promotion).map((usage) => ({
      id: usage.promotion.id,
      usageId: usage.id,
      name: usage.promotion.name,
      kind: usage.promotion.kind,
      discountType: usage.promotion.discountType,
      discountValue: usage.promotion.discountValue,
      currency: usage.promotion.currency,
      minimumSpend: usage.promotion.minimumSpend,
      maximumDiscount: usage.promotion.maximumDiscount,
      couponCode: usage.promotion.couponCode,
      status: usage.status,
      createdAt: asIsoDate(usage.createdAt),
      usedAt: asIsoDate(usage.usedAt),
      releasedAt: asIsoDate(usage.releasedAt),
      discount: roundMoney(
        discountLines
          .filter((line) => line.sourceId === usage.promotionId)
          .reduce((sum, line) => sum + Math.abs(line.totalAmount), 0),
      ),
    })),
    lines: lines.map((line) => ({
      type: line.type,
      sourceId: line.sourceId,
      label: line.label,
      quantity: line.quantity,
      unitAmount: line.unitAmount,
      totalAmount: line.totalAmount,
      currency: line.currency,
      order: line.order,
    })),
  };
}
function driverVehicleResponse(vehicle: {
  id: string;
  driverId?: string | null;
  plateType: string;
  hkPlate: string | null;
  mainlandPlate: string | null;
  macauPlate: string | null;
  vehicleOwnership: string;
  vehicleCategory: string;
  vehicleColor: string;
  vehiclePhotos: unknown;
  vehiclePhotoData?: Uint8Array | null;
  vehiclePhotoMime?: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { vehiclePhotoData, vehiclePhotoMime, ...publicVehicle } = vehicle;
  return {
    ...publicVehicle,
    vehiclePhotos: vehiclePhotoData && vehiclePhotoMime ? [`/admin/driver-vehicles/${vehicle.id}/photo`] : [],
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

function driverResponse(driver: {
  id: string;
  driverType: string;
  name: string;
  affiliation: string;
  phoneCountryCode: string;
  phone: string;
  hongKongMacauCountryCode: string | null;
  hongKongMacauPhone: string | null;
  mainlandPhone: string | null;
  reviewStatus: string;
  reviewReason?: string | null;
  reviewSubmittedAt?: Date;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  settlementMethod: string | null;
  settlementAccount: string | null;
  wechatId: string | null;
  wechatQrCodeData?: Uint8Array | null;
  wechatQrCodeMime?: string | null;
  isOnline?: boolean;
  enabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const {
    wechatQrCodeData,
    wechatQrCodeMime,
    ...publicDriver
  } = driver;
  return {
    ...publicDriver,
    isOnline: driver.isOnline ?? false,
    wechatQrCodeUrl:
      wechatQrCodeData && wechatQrCodeMime
        ? "/driver/auth/me/wechat-qr-code"
        : null,
    reviewSubmittedAt: driver.reviewSubmittedAt?.toISOString() || null,
    reviewedAt: driver.reviewedAt?.toISOString() || null,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  };
}

type VehiclePlateData = {
  vehicleOwnership: string;
  plateType: string;
  hkPlate: string;
  macauPlate: string;
  mainlandPlate: string;
};

function normalizeHongKongPlate(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeMacauPlate(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeMainlandPlate(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/[•・]/g, "·").toUpperCase()
    : "";
}

function normalizeVehiclePlateData(body: {
  vehicleOwnership?: unknown;
  plateType?: unknown;
  hkPlate?: unknown;
  macauPlate?: unknown;
  mainlandPlate?: unknown;
}): VehiclePlateData {
  const vehicleOwnership =
    typeof body.vehicleOwnership === "string"
      ? body.vehicleOwnership.trim()
      : "";
  const plateType =
    typeof body.plateType === "string" ? body.plateType.trim() : "";
  const isSinglePlate = plateType === "單牌";
  const isTriplePlate = plateType === "三地牌";
  return {
    vehicleOwnership,
    plateType,
    hkPlate:
      vehicleOwnership === "澳門" && !isTriplePlate
        ? ""
        : normalizeHongKongPlate(body.hkPlate),
    macauPlate:
      vehicleOwnership !== "澳門" && !isTriplePlate
        ? ""
        : normalizeMacauPlate(body.macauPlate),
    mainlandPlate: isSinglePlate
      ? ""
      : normalizeMainlandPlate(body.mainlandPlate),
  };
}

function validVehiclePlateData(body: {
  vehicleOwnership?: unknown;
  plateType?: unknown;
  hkPlate?: unknown;
  macauPlate?: unknown;
  mainlandPlate?: unknown;
}) {
  const {
    vehicleOwnership: ownership,
    plateType,
    hkPlate,
    macauPlate,
    mainlandPlate,
  } = normalizeVehiclePlateData(body);
  if (!["香港", "澳門", "中國內地"].includes(ownership)) return false;
  if (!["單牌", "兩地牌", "三地牌"].includes(plateType)) return false;
  if (
    hkPlate &&
    (!/^[A-Z0-9 ]+$/.test(hkPlate) || hkPlate.replace(/ /g, "").length > 8)
  )
    return false;
  if (macauPlate && !/^[A-Z]{2}-[0-9]{2}-[0-9]{2}$/.test(macauPlate))
    return false;
  const mainlandPattern =
    ownership === "香港"
      ? /^粵Z·\S+港$/
      : ownership === "澳門"
        ? /^粵Z·\S+澳$/
        : /^粵[A-Z]·\S+$/;
  if (
    mainlandPlate &&
    (!mainlandPattern.test(mainlandPlate) || /\s/.test(mainlandPlate))
  )
    return false;
  if (ownership === "中國內地")
    return plateType === "兩地牌" && Boolean(hkPlate && mainlandPlate);
  if (plateType === "三地牌") {
    return ownership === "香港"
      ? Boolean(hkPlate && mainlandPlate)
      : Boolean(hkPlate && macauPlate && mainlandPlate);
  }
  const localPlate = ownership === "香港" ? hkPlate : macauPlate;
  return plateType === "單牌"
    ? Boolean(localPlate)
    : Boolean(localPlate && mainlandPlate);
}

function validDriverPayload(body: Partial<Prisma.DriverCreateInput> & Record<string, unknown>) {
  const required = [
    "name",
    "affiliation",
    "phone",
    "vehicleCategory",
    "vehicleColor",
  ] as const;
  if (
    required.some(
      (field) => typeof body[field] !== "string" || !body[field]!.trim(),
    )
  )
    return false;
  return validVehiclePlateData({
    vehicleOwnership: body.vehicleOwnership || "香港",
    plateType: body.plateType,
    hkPlate: body.hkPlate,
    macauPlate: body.macauPlate,
    mainlandPlate: body.mainlandPlate,
  });
}

function tripResponse(trip: AdminTripDetail | ({
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user: Parameters<typeof userResponse>[0];
  driver?: TripDriverSummary | null;
  quote?: PersistedQuote | null;
  payment?: {
    id: string;
    total: number;
    currency: string;
    fareAmount: number;
    cashAmount: number;
    externalAmount: number;
    externalPaymentMethod: string | null;
    externalReference: string | null;
    status: string;
    refundedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  settlement?: {
    id: string;
    driverId: string;
    method: string;
    settledAt: Date;
  } | null;
  [key: string]: unknown;
})) {
  const { quote, ...data } = trip;
  return {
    ...data,
    scheduledAt: asIsoDate(trip.scheduledAt),
    createdAt: asIsoDate(trip.createdAt),
    updatedAt: asIsoDate(trip.updatedAt),
    user: userResponse(trip.user),
    driver: trip.driver ? tripDriverResponse(trip.driver) : null,
    payment: trip.payment
      ? {
          id: trip.payment.id,
          total: trip.payment.total,
          currency: trip.payment.currency,
          fareAmount: trip.payment.fareAmount,
          cashAmount: trip.payment.cashAmount,
          externalAmount: trip.payment.externalAmount,
          externalPaymentMethod: trip.payment.externalPaymentMethod,
          externalReference: trip.payment.externalReference,
          status: trip.payment.status,
          refundedAt: asIsoDate(trip.payment.refundedAt),
          createdAt: asIsoDate(trip.payment.createdAt),
          updatedAt: asIsoDate(trip.payment.updatedAt),
        }
      : null,
    settlement: trip.settlement
      ? {
          id: trip.settlement.id,
          driverId: trip.settlement.driverId,
          method: trip.settlement.method,
          settledAt: asIsoDate(trip.settlement.settledAt),
        }
      : null,
    quote: quote ? quoteResponse(quote) : null,
  };
}
const adminTripListSelect = Prisma.validator<Prisma.TripSelect>()({
  id: true,
  userId: true,
  origin: true,
  destination: true,
  region: true,
  scheduledAt: true,
  passengerName: true,
  passengerPhone: true,
  status: true,
  executionPhase: true,
  driverId: true,
  driverPayoutCalculatedAmount: true,
  driverPayoutAmount: true,
  driverPayoutCurrency: true,
  driverName: true,
  driverPhone: true,
  vehicleCategory: true,
  vehiclePlate: true,
  vehicleHkPlate: true,
  vehicleMacauPlate: true,
  vehicleMainlandPlate: true,
  assignedAt: true,
  acceptedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      countryCode: true,
      phoneNumber: true,
      name: true,
      displayName: true,
    },
  },
  payment: {
    select: { id: true, total: true, currency: true, status: true },
  },
  settlement: {
    select: { id: true, driverId: true, method: true, settledAt: true },
  },
  driver: { select: tripDriverSelect },
});

type AdminTripListItem = Prisma.TripGetPayload<{ select: typeof adminTripListSelect }> & {
  orderUrls?: Array<{
    id: string;
    tripId: string;
    driverId: string | null;
    source: string;
    createdByAdminId: string | null;
    reservedAt: Date | null;
    acceptedAt: Date | null;
    completedAt: Date | null;
    provisionalDriverId: string | null;
    validFrom: Date;
    validUntil: Date;
    usedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    driver?: { id: string; name: string; phone: string } | null;
  }>;
};
function adminTripListResponse(trip: AdminTripListItem) {
  return {
    ...trip,
    scheduledAt: trip.scheduledAt.toISOString(),
    assignedAt: trip.assignedAt?.toISOString() || null,
    acceptedAt: trip.acceptedAt?.toISOString() || null,
    completedAt: trip.completedAt?.toISOString() || null,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    user: {
      ...trip.user,
      phone: `${trip.user.countryCode} ${trip.user.phoneNumber}`,
    },
    settlement: trip.settlement
      ? { ...trip.settlement, settledAt: trip.settlement.settledAt.toISOString() }
      : null,
    orderUrls: trip.orderUrls?.map((item) => ({
      ...item,
      validFrom: item.validFrom.toISOString(),
      validUntil: item.validUntil.toISOString(),
      reservedAt: item.reservedAt?.toISOString() || null,
      acceptedAt: item.acceptedAt?.toISOString() || null,
      completedAt: item.completedAt?.toISOString() || null,
      usedAt: item.usedAt?.toISOString() || null,
      revokedAt: item.revokedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
function driverTripResponse(
  trip: {
    id: string;
  userId: string;
  origin: string;
  destination: string;
  scheduledAt: Date;
  acceptedAt: Date | null;
  arrivedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt?: Date | null;
  cancellationSource?: string | null;
  status: string;
  executionPhase: string | null;
  driverId?: string | null;
  vehicleId: string | null;
  vehicleCategory: string | null;
  vehicleColor: string | null;
  vehicleOwnership: string | null;
  vehiclePlateType: string | null;
  vehiclePlate: string | null;
  vehicleHkPlate: string | null;
  vehicleMacauPlate: string | null;
  vehicleMainlandPlate: string | null;
  driverPayoutAmount: number | null;
  driverPayoutCurrency: string | null;
  passengerPhone?: string | null;
  passengerPhoneRegion?: string | null;
  passengerGender?: string | null;
  user?: {
    id: string;
    name: string | null;
    displayName: string | null;
    gender: string | null;
    countryCode: string;
    phoneNumber: string;
  };
  settlement?: {
    id: string;
    driverId: string;
    method: string;
    settledAt: Date;
  } | null;
  },
  includePassengerPhone = false,
) {
  return {
  id: trip.id,
  userId: trip.userId,
  passengerName: trip.user?.name || trip.user?.displayName || null,
  passengerGender: trip.passengerGender || trip.user?.gender || null,
  passengerPhone: includePassengerPhone
    ? trip.passengerPhone || trip.user?.phoneNumber || null
    : undefined,
  passengerPhoneCountryCode: includePassengerPhone
    ? trip.passengerPhoneRegion || trip.user?.countryCode || null
    : undefined,
    user: trip.user
      ? { id: trip.user.id, name: trip.user.name || trip.user.displayName }
      : undefined,
    pickupAddress: trip.origin,
    dropoffAddress: trip.destination,
    scheduledAt: trip.scheduledAt.toISOString(),
    acceptedAt: trip.acceptedAt?.toISOString() || null,
    arrivedAt: trip.arrivedAt?.toISOString() || null,
    startedAt: trip.startedAt?.toISOString() || null,
    completedAt: trip.completedAt?.toISOString() || null,
    cancelledAt: trip.cancelledAt?.toISOString() || null,
    cancellationSource: trip.cancellationSource || null,
    status: trip.status,
    executionPhase: trip.executionPhase,
    driverId: trip.driverId,
    vehicle:
      trip.vehicleId ||
      trip.vehiclePlate ||
      trip.vehicleHkPlate ||
      trip.vehicleMacauPlate ||
      trip.vehicleMainlandPlate
        ? {
            id: trip.vehicleId,
            vehicleCategory: trip.vehicleCategory,
            vehicleColor: trip.vehicleColor,
            vehicleOwnership: trip.vehicleOwnership,
            plateType: trip.vehiclePlateType,
            vehiclePlate: trip.vehiclePlate,
            hkPlate: trip.vehicleHkPlate,
            macauPlate: trip.vehicleMacauPlate,
            mainlandPlate: trip.vehicleMainlandPlate,
          }
        : null,
    price: trip.driverPayoutAmount,
    currency: trip.driverPayoutCurrency,
    settlement: trip.settlement
      ? {
          id: trip.settlement.id,
          driverId: trip.settlement.driverId,
          method: trip.settlement.method,
          settledAt: trip.settlement.settledAt.toISOString(),
        }
      : null,
  };
}
function invitationTripResponse(
  trip: Parameters<typeof driverTripResponse>[0],
  now = new Date(),
) {
  const phoneVisibleAt = new Date(trip.scheduledAt.getTime() - 60 * 60 * 1000);
  const phoneVisible = now >= phoneVisibleAt;
  const response = driverTripResponse(trip, phoneVisible);
  const phone = trip.passengerPhone || trip.user?.phoneNumber || null;
  return {
    ...response,
    passengerPhone: phoneVisible ? response.passengerPhone : phone ? phone.replace(/.(?=.{4})/g, "*") : null,
    passengerPhoneCountryCode: phoneVisible
      ? response.passengerPhoneCountryCode
      : trip.passengerPhoneRegion || trip.user?.countryCode || null,
    passengerPhoneVisible: phoneVisible,
    passengerPhoneVisibleAt: phoneVisibleAt.toISOString(),
    canCancel: !trip.startedAt && !trip.completedAt && trip.status !== "CANCELLED" && Boolean(trip.driverId),
  };
}
function parseDistancePricing(
  categoryId: string,
  body: Partial<DistancePricingSettings>,
): DistancePricingSettings {
  const minimumFare = Number(body.minimumFare);
  const currency = body.currency?.trim();
  const tiers = Array.isArray(body.tiers)
    ? body.tiers.map((tier, index) => ({
        id: String(tier.id || `tier-${index + 1}`).trim(),
        fromKm: Number(tier.fromKm),
        toKm: tier.toKm === null ? null : Number(tier.toKm),
        pricePerKm: Number(tier.pricePerKm),
        order: index + 1,
      }))
    : [];
  const validNumbers =
    Number.isFinite(minimumFare) &&
    minimumFare >= 0 &&
    tiers.every(
      (tier) =>
        tier.id &&
        Number.isFinite(tier.fromKm) &&
        tier.fromKm >= 0 &&
        (tier.toKm === null ||
          (Number.isFinite(tier.toKm) && tier.toKm > tier.fromKm)) &&
        Number.isFinite(tier.pricePerKm) &&
        tier.pricePerKm >= 0,
    );
  const contiguous =
    tiers.length > 0 &&
    tiers.every((tier, index) =>
      index === tiers.length - 1
        ? tier.toKm === null
        : tier.toKm === tiers[index + 1].fromKm,
    );
  if (!currency || !validNumbers || !contiguous)
    throw new HttpException(
      "Pricing tiers must be valid, contiguous, and end with an unlimited tier",
      HttpStatus.BAD_REQUEST,
    );
  return { categoryId, minimumFare, currency, tiers };
}
function normalizeRegionalAddress(region: string, value: string) {
  if (region === "香港")
    return value
      .replace(/香港(?:特別行政區|特别行政区)?/g, "")
      .replace(/^[\s·\-]+/, "");
  if (region === "澳門")
    return value
      .replace(/澳(?:門|门)(?:特別行政區|特别行政区)?/g, "")
      .replace(/^[\s·\-]+/, "");
  return value;
}
function formattedAddress(region: string, address: string) {
  let detail = normalizeRegionalAddress(region, address)
    .replace(/\s*[·\/-]\s*/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if ((region === "香港" || region === "澳門") && !detail.includes("-")) {
    const districtMatch = detail.match(
      /^(.+?(?:區|区|堂區|堂区|半島|半岛|路氹城))(.+)$/,
    );
    if (districtMatch) detail = `${districtMatch[1]}-${districtMatch[2]}`;
  }
  return [region === "大陸" ? "" : region, detail].filter(Boolean).join("-");
}
function recommendedAddressResponse(
  address: Omit<RecommendedAddress, "region"> & { region: string },
) {
  return {
    id: address.id,
    region: address.region,
    city: address.city,
    name: address.name,
    address: normalizeRegionalAddress(address.region, address.address),
    displayAddress: formattedAddress(address.region, address.address),
    latitude: address.latitude,
    longitude: address.longitude,
    enabled: address.enabled,
    order: address.order,
  };
}
function parseRecommendedAddress(
  body: {
    region?: unknown;
    city?: unknown;
    name?: unknown;
    address?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    enabled?: unknown;
    order?: unknown;
  },
  fallbackOrder: number,
): Omit<RecommendedAddress, "id"> {
  const region = body.region;
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address =
    typeof body.address === "string"
      ? normalizeRegionalAddress(
          typeof region === "string" ? region : "",
          body.address.trim(),
        )
      : "";
  const parseCoordinate = (value: unknown, field: string) => {
    if (value === undefined || value === null || value === "") return null;
    const coordinate = Number(value);
    if (!Number.isFinite(coordinate))
      throw new HttpException(
        `${field} must be a valid number`,
        HttpStatus.BAD_REQUEST,
      );
    return coordinate;
  };
  const latitude = parseCoordinate(body.latitude, "Latitude");
  const longitude = parseCoordinate(body.longitude, "Longitude");
  const incomingOrder = body.order;
  const order =
    incomingOrder === undefined ||
    incomingOrder === null ||
    incomingOrder === ""
      ? fallbackOrder
      : Number(incomingOrder);
  if (
    typeof region !== "string" ||
    !["大陸", "香港", "澳門"].includes(region) ||
    (region === "大陸" && city.length > 100) ||
    !name ||
    name.length > 200 ||
    !address ||
    address.length > 500
  ) {
    throw new HttpException(
      "Region, name and address are required",
      HttpStatus.BAD_REQUEST,
    );
  }
  if (
    (latitude === null) !== (longitude === null) ||
    (latitude !== null &&
      (Math.abs(latitude) > 90 || Math.abs(longitude!) > 180))
  ) {
    throw new HttpException(
      "Latitude and longitude must be supplied together and be in range",
      HttpStatus.BAD_REQUEST,
    );
  }
  if (!Number.isInteger(order) || order < 0)
    throw new HttpException(
      "Order must be a non-negative integer",
      HttpStatus.BAD_REQUEST,
    );
  if (body.enabled !== undefined && typeof body.enabled !== "boolean")
    throw new HttpException(
      "Enabled must be a boolean",
      HttpStatus.BAD_REQUEST,
    );
  return {
    region: region as AddressRegion,
    city: region === "大陸" ? city || null : null,
    name,
    address,
    latitude,
    longitude,
    enabled: body.enabled ?? true,
    order,
  };
}
function parseMainlandCity(
  body: { name?: unknown; enabled?: unknown; order?: unknown },
  fallbackOrder: number,
): Omit<MainlandCity, "id"> {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const order =
    body.order === undefined || body.order === null || body.order === ""
      ? fallbackOrder
      : Number(body.order);
  if (!name || name.length > 100)
    throw new HttpException("City name is required", HttpStatus.BAD_REQUEST);
  if (!/市$/.test(name))
    throw new HttpException(
      "City name must be a city-level unit ending with 市",
      HttpStatus.BAD_REQUEST,
    );
  if (!Number.isInteger(order) || order < 0)
    throw new HttpException(
      "Order must be a non-negative integer",
      HttpStatus.BAD_REQUEST,
    );
  if (body.enabled !== undefined && typeof body.enabled !== "boolean")
    throw new HttpException(
      "Enabled must be a boolean",
      HttpStatus.BAD_REQUEST,
    );
  return { name, enabled: body.enabled ?? true, order };
}
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const ADMIN_PASSWORD_MIN_LENGTH = 8;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_MAX_FAILURES = 10;
const ADMIN_LOGIN_DELAY_THRESHOLD = 5;
const ADMIN_LOGIN_MAX_DELAY_MS = 4000;
const commonAdminPasswords = new Set([
  "admin12345",
  "administrator",
  "password1234",
  "qwerty123456",
]);
type LoginAttemptState = {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number;
};
const adminLoginAttempts = new Map<string, LoginAttemptState>();
const fallbackAdminPasswordHash = hashPassword(randomBytes(32).toString("hex"));

function validateAdminPassword(password: string, username: string) {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH)
    throw new BadRequestException(
      `Password must contain at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`,
    );
  if (password.length > 128)
    throw new BadRequestException("Password must not exceed 128 characters");
  const normalized = password.toLowerCase();
  if (
    normalized === username.toLowerCase() ||
    commonAdminPasswords.has(normalized)
  )
    throw new BadRequestException("Password is too common or easy to guess");
}

function clearExpiredLoginAttempts(timestamp = Date.now()) {
  for (const [key, state] of adminLoginAttempts) {
    if (
      timestamp - state.windowStartedAt >= ADMIN_LOGIN_WINDOW_MS &&
      state.lockedUntil <= timestamp
    )
      adminLoginAttempts.delete(key);
  }
}

function loginAttemptState(key: string, timestamp = Date.now()) {
  const current = adminLoginAttempts.get(key);
  if (!current || timestamp - current.windowStartedAt >= ADMIN_LOGIN_WINDOW_MS) {
    const fresh = { failures: 0, windowStartedAt: timestamp, lockedUntil: 0 };
    adminLoginAttempts.set(key, fresh);
    return fresh;
  }
  return current;
}

function loginAttemptKeys(req: RequestLike, username: string) {
  return [`ip:${req.ip || "unknown"}`, `account:${username.toLowerCase()}`];
}

function isLoginBlocked(req: RequestLike, username: string, timestamp = Date.now()) {
  return loginAttemptKeys(req, username).some(
    (key) => loginAttemptState(key, timestamp).lockedUntil > timestamp,
  );
}

function recordLoginFailure(req: RequestLike, username: string, timestamp = Date.now()) {
  let highestFailureCount = 0;
  for (const key of loginAttemptKeys(req, username)) {
    const state = loginAttemptState(key, timestamp);
    state.failures += 1;
    highestFailureCount = Math.max(highestFailureCount, state.failures);
    if (state.failures >= ADMIN_LOGIN_MAX_FAILURES)
      state.lockedUntil = timestamp + ADMIN_LOGIN_WINDOW_MS;
  }
  return highestFailureCount;
}

function clearLoginFailures(req: RequestLike, username: string) {
  for (const key of loginAttemptKeys(req, username)) adminLoginAttempts.delete(key);
}

function loginFailureDelay(failures: number) {
  if (failures < ADMIN_LOGIN_DELAY_THRESHOLD) return 0;
  return Math.min(
    500 * 2 ** (failures - ADMIN_LOGIN_DELAY_THRESHOLD),
    ADMIN_LOGIN_MAX_DELAY_MS,
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assertProductionConfiguration() {
  if (process.env.NODE_ENV !== "production") return;
  const missing = [
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD",
    "ADMIN_SESSION_SECRET",
    "APP_CORS_ORIGINS",
  ].filter((name) => !process.env[name]?.trim());
  if (missing.length)
    throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  validateAdminPassword(process.env.ADMIN_PASSWORD!, process.env.ADMIN_USERNAME!);
  if (process.env.ADMIN_SESSION_SECRET!.length < 32)
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters");
}
const now = new Date().toISOString();
const administrators: Administrator[] = [
  {
    id: "admin-super",
    username: process.env.ADMIN_USERNAME || "admin",
    displayName: "Super Administrator",
    role: "SUPER_ADMIN",
    enabled: true,
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "admin12345"),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
  },
];
const activeAdminSessions = new Map<string, number>();
const revokedAdminSessions = new Map<string, number>();
const adminAuditLogs: AdminAuditLog[] = [];

async function hydrateAdminSecurityState() {
  const storedAdministrators = await prisma.administrator.findMany({
    orderBy: { createdAt: "asc" },
  });
  if (!storedAdministrators.length) {
    const initial = administrators[0];
    await prisma.administrator.create({
      data: {
        id: initial.id,
        username: initial.username,
        normalizedUsername: initial.username.toLowerCase(),
        displayName: initial.displayName,
        role: initial.role,
        enabled: initial.enabled,
        passwordHash: initial.passwordHash,
        failedLoginAttempts: 0,
        lastLoginAt: null,
      },
    });
  } else {
    administrators.splice(
      0,
      administrators.length,
      ...storedAdministrators.map((item) => ({
        id: item.id,
        username: item.username,
        displayName: item.displayName,
        role: item.role as AdminRole,
        enabled: item.enabled,
        passwordHash: item.passwordHash,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        lastLoginAt: item.lastLoginAt?.toISOString() || null,
        failedLoginAttempts: item.failedLoginAttempts,
        lockedUntil: item.lockedUntil?.toISOString() || null,
      })),
    );
  }
  const activeSessions = await prisma.adminSession.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    select: { jti: true, expiresAt: true },
  });
  const revokedSessions = await prisma.adminSession.findMany({
    where: { revokedAt: { not: null }, expiresAt: { gt: new Date() } },
    select: { jti: true, expiresAt: true },
  });
  activeAdminSessions.clear();
  revokedAdminSessions.clear();
  for (const session of activeSessions)
    activeAdminSessions.set(session.jti, session.expiresAt.getTime());
  for (const session of revokedSessions)
    revokedAdminSessions.set(session.jti, session.expiresAt.getTime());
  const persistedAuditLogs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  adminAuditLogs.splice(
    0,
    adminAuditLogs.length,
    ...persistedAuditLogs.map((item) => ({
      id: item.id,
      administratorId: item.administratorId,
      username: item.username,
      action: item.action,
      resource: item.resource,
      method: item.method,
      status: item.status as "SUCCESS" | "FAILED",
      ip: item.ip,
      createdAt: item.createdAt.toISOString(),
    })),
  );
}
function publicAdministrator(admin: Administrator) {
  const { passwordHash: _, ...safe } = admin;
  return safe;
}
const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_CSRF_COOKIE = "admin_csrf";
const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "development-admin-secret";
}
function cookieValue(req: RequestLike, name: string) {
  const encodedName = `${encodeURIComponent(name)}=`;
  const item = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));
  return item ? decodeURIComponent(item.slice(encodedName.length)) : "";
}
function cookieOptions(req: RequestLike, httpOnly: boolean, maxAge = ADMIN_SESSION_MAX_AGE_MS) {
  const secure =
    process.env.NODE_ENV === "production" ||
    req.protocol === "https" ||
    req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
async function tokenFor(admin: Administrator) {
  const session: AdminSession = {
    sub: admin.id,
    role: admin.role,
    exp: Date.now() + 8 * 60 * 60 * 1000,
    jti: randomBytes(16).toString("hex"),
  };
  await prisma.adminSession.create({
    data: {
      jti: session.jti,
      administratorId: admin.id,
      expiresAt: new Date(session.exp),
    },
  });
  activeAdminSessions.set(session.jti, session.exp);
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
function adminSessionFrom(req: RequestLike): AdminSession {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const value = bearer || cookieValue(req, ADMIN_SESSION_COOKIE);
  if (process.env.NODE_ENV !== "production" && value === "dev-bypass")
    return {
      sub: "admin-super",
      role: "SUPER_ADMIN",
      exp: Date.now() + 60000,
      jti: "dev-bypass",
    };
  const [payload, signature] = value?.split(".") || [];
  if (!payload || !signature || !secret())
    throw new UnauthorizedException("Valid admin session required");
  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw new Error("signature mismatch");
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as AdminSession;
    if (session.jti === "dev-bypass") return session;
    const revokedUntil = revokedAdminSessions.get(session.jti);
    if (revokedUntil && revokedUntil <= Date.now())
      revokedAdminSessions.delete(session.jti);
    const persistedUntil = activeAdminSessions.get(session.jti);
    if (persistedUntil && persistedUntil <= Date.now())
      activeAdminSessions.delete(session.jti);
    const admin = administrators.find((item) => item.id === session.sub);
    if (
      !admin ||
      !admin.enabled ||
      session.exp <= Date.now() ||
      Boolean(revokedUntil) ||
      !persistedUntil
    )
      throw new Error("invalid session");
    return { ...session, role: admin.role };
  } catch {
    throw new UnauthorizedException("Valid admin session required");
  }
}
function requireAuth(req: RequestLike) {
  return adminSessionFrom(req);
}
function requireRole(req: RequestLike, roles: AdminRole[]) {
  const session = requireAuth(req);
  if (!roles.includes(session.role))
    throw new ForbiddenException("Insufficient administrator permission");
  return session;
}
function persistAudit(log: AdminAuditLog) {
  adminAuditLogs.unshift(log);
  if (adminAuditLogs.length > 1000) adminAuditLogs.length = 1000;
  void prisma.adminAuditLog
    .create({
      data: {
        id: log.id,
        administratorId: log.administratorId,
        username: log.username,
        action: log.action,
        resource: log.resource,
        method: log.method,
        status: log.status,
        ip: log.ip,
        createdAt: new Date(log.createdAt),
      },
    })
    .catch((error) => console.error("Failed to persist admin audit log", error));
}

function addAudit(
  req: RequestLike,
  status: "SUCCESS" | "FAILED",
  authenticatedSession?: AdminSession,
) {
  let session: AdminSession | null = authenticatedSession || null;
  if (!session) {
    try {
      session = adminSessionFrom(req);
    } catch {}
  }
  const admin = session
    ? administrators.find((item) => item.id === session!.sub)
    : null;
  persistAudit({
    id: `audit-${Date.now()}-${randomBytes(3).toString("hex")}`,
    administratorId: admin?.id || null,
    username: admin?.username || "anonymous",
    action: `${req.method || "UNKNOWN"} ${req.url || ""}`,
    resource: req.url || "",
    method: req.method || "UNKNOWN",
    status,
    ip: req.ip || "",
    createdAt: new Date().toISOString(),
  });
}

@Injectable()
class AdminAccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestLike>();
    if (!req.url?.startsWith("/admin/") || req.url === "/admin/auth/login")
      return next.handle();
    const session = requireAuth(req);
    const developmentBypass =
      process.env.NODE_ENV !== "production" &&
      req.headers.authorization?.replace(/^Bearer\s+/i, "") === "dev-bypass";
    if (req.method !== "GET" && !developmentBypass) {
      const csrfCookie = cookieValue(req, ADMIN_CSRF_COOKIE);
      const csrfHeader = req.headers["x-csrf-token"] || "";
      if (
        csrfCookie.length < 32 ||
        csrfHeader.length !== csrfCookie.length ||
        !timingSafeEqual(Buffer.from(csrfHeader), Buffer.from(csrfCookie))
      ) {
        addAudit(req, "FAILED", session);
        throw new ForbiddenException("Valid CSRF token required");
      }
    }
    if (req.method !== "GET" && session.role === "VIEWER") {
      addAudit(req, "FAILED", session);
      throw new ForbiddenException("Viewer accounts are read-only");
    }
    return next.handle().pipe(
      tap({
        next: () => {
          if (req.method !== "GET") addAudit(req, "SUCCESS", session);
        },
        error: () => {
          if (req.method !== "GET") addAudit(req, "FAILED", session);
        },
      }),
    );
  }
}

function supportSecret() {
  return (
    process.env.SUPPORT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || ""
  );
}
function supportTokenFor(session: SupportSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${createHmac("sha256", supportSecret()).update(payload).digest("base64url")}`;
}
function supportSessionFrom(req: RequestLike): SupportSession {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const [payload, signature] = value?.split(".") || [];
  if (!payload || !signature || !supportSecret())
    throw new UnauthorizedException("Valid support session required");
  const expected = createHmac("sha256", supportSecret())
    .update(payload)
    .digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw new Error("signature mismatch");
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as SupportSession;
    if (
      !session.conversationId ||
      !session.riderId ||
      session.exp <= Date.now()
    )
      throw new Error("expired session");
    return session;
  } catch {
    throw new UnauthorizedException("Valid support session required");
  }
}
async function masterBoxRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const baseUrl = process.env.MASTERBOX_BASE_URL?.replace(/\/$/, "");
  const appId = process.env.MASTERBOX_APP_ID;
  const apiKey = process.env.MASTERBOX_API_KEY;
  if (!baseUrl || !appId || !apiKey)
    throw new HttpException(
      "Master Box is not configured",
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  const response = await fetch(`${baseUrl}/api/integrations${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-app-id": appId,
      "x-api-key": apiKey,
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new HttpException(
      (data as { error?: string }).error || "Master Box request failed",
      response.status,
    );
  return data as T;
}

@Controller("auth")
class ClientAuthController {
  @Post("phone/request")
  async requestPhoneCode(
    @Body() body: { countryCode?: string; phoneNumber?: string },
  ) {
    const identity = parsePhoneIdentity(body);
    const requestKey = `${identity.countryCode}:${identity.phoneNumber}`;
    const now = Date.now();
    const requestState = phoneChallengeRequests.get(requestKey);
    const shouldRateLimit = process.env.NODE_ENV === "production";
    if (
      shouldRateLimit &&
      requestState &&
      now - requestState.windowStartedAt < PHONE_CODE_REQUEST_WINDOW_MS &&
      requestState.count >= PHONE_CODE_MAX_REQUESTS
    ) {
      throw new HttpException(
        "Too many verification code requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (
      shouldRateLimit &&
      (!requestState ||
        now - requestState.windowStartedAt >= PHONE_CODE_REQUEST_WINDOW_MS)
    )
      phoneChallengeRequests.set(requestKey, {
        count: 1,
        windowStartedAt: now,
      });
    else if (shouldRateLimit && requestState) requestState.count += 1;
    const code = "00000";
    const challengeId = randomBytes(18).toString("hex");
    const exp = now + PHONE_CODE_TTL_MS;
    phoneChallenges.set(challengeId, { ...identity, code, exp, attempts: 0 });
    const requestedUser = await prisma.user.findUnique({
      where: { countryCode_phoneNumber: identity },
      select: { id: true },
    });
    await prisma.verificationCode.create({
      data: {
        id: challengeId,
        userId: requestedUser?.id,
        countryCode: identity.countryCode,
        phoneNumber: identity.phoneNumber,
        codeHash: createHash("sha256").update(code).digest("hex"),
        expiresAt: new Date(exp),
      },
    });
    for (const [id, challenge] of phoneChallenges) {
      if (challenge.exp <= Date.now()) phoneChallenges.delete(id);
    }
    return {
      challengeId,
      expiresAt: new Date(exp).toISOString(),
      ...(process.env.NODE_ENV !== "production"
        ? { developmentCode: code }
        : {}),
    };
  }

  @Post("phone/verify")
  async verifyPhoneCode(@Body() body: { challengeId?: string; code?: string; invitationCode?: string }) {
    const challengeId = body.challengeId?.trim() || "";
    const memoryChallenge = phoneChallenges.get(challengeId);
    const storedChallenge = await prisma.verificationCode.findUnique({
      where: { id: challengeId },
    });
    const now = Date.now();
    if (
      !storedChallenge ||
      storedChallenge.purpose !== "LOGIN" ||
      storedChallenge.consumedAt ||
      !["ISSUED", "FAILED"].includes(storedChallenge.status) ||
      storedChallenge.expiresAt.getTime() <= now
    ) {
      phoneChallenges.delete(challengeId);
      if (
        storedChallenge?.purpose === "LOGIN" &&
        ["ISSUED", "FAILED"].includes(storedChallenge.status) &&
        storedChallenge.expiresAt.getTime() <= now
      )
        await prisma.verificationCode.update({
          where: { id: challengeId },
          data: { status: "EXPIRED" },
        });
      throw new UnauthorizedException("Verification code expired");
    }
    const challenge = memoryChallenge || {
      countryCode: storedChallenge.countryCode,
      phoneNumber: storedChallenge.phoneNumber,
      code: "",
      exp: storedChallenge.expiresAt.getTime(),
      attempts: storedChallenge.attempts,
    };
    const submittedCode = body.code?.trim() || "";
    if (
      createHash("sha256").update(submittedCode).digest("hex") !==
      storedChallenge.codeHash
    ) {
      const attempts = storedChallenge.attempts + 1;
      await prisma.verificationCode.update({
        where: { id: challengeId },
        data: {
          attempts,
          status: attempts >= PHONE_CODE_MAX_ATTEMPTS ? "LOCKED" : "FAILED",
        },
      });
      if (attempts >= PHONE_CODE_MAX_ATTEMPTS)
        phoneChallenges.delete(challengeId);
      throw new UnauthorizedException("Invalid verification code");
    }
    phoneChallenges.delete(challengeId);
    const existing = await prisma.user.findUnique({
      where: {
        countryCode_phoneNumber: {
          countryCode: challenge.countryCode,
          phoneNumber: challenge.phoneNumber,
        },
      },
    });
    const invitationCode = normalizeInvitationCode(body.invitationCode);
    const invitationSettings = invitationCode
      ? await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
      : null;
    if (!existing && invitationCode && invitationSettings?.invitationEnabled === false)
      throw new HttpException("邀請活動暫停", HttpStatus.CONFLICT);
    const inviter = invitationCode
      ? await prisma.invitationCode.findUnique({ where: { code: invitationCode } })
      : null;
    if (!existing && invitationCode && !inviter)
      throw new HttpException("邀請碼無效", HttpStatus.BAD_REQUEST);
    const loggedInUser = await prisma.$transaction(async (tx) => {
      const user =
        existing ||
        (await tx.user.create({
          data: {
            id: await generateUserId(),
            countryCode: challenge.countryCode,
            phoneNumber: challenge.phoneNumber,
          },
        }));
      if (!existing && inviter) {
        if (inviter.userId === user.id)
          throw new HttpException("不可使用自己的邀請碼", HttpStatus.BAD_REQUEST);
        const qualificationDays = invitationSettings?.invitationQualificationDays ?? 30;
        await tx.invitation.create({
          data: {
            inviterId: inviter.userId,
            inviteeId: user.id,
            code: invitationCode,
            inviterMileageReward: invitationSettings?.invitationInviterMileage ?? 300,
            inviteeFareReward: invitationSettings?.invitationInviteeFare ?? 50,
            rewardCurrency: invitationSettings?.walletCurrency ?? appSettingsDefaults.walletCurrency,
            qualificationDays,
            mileageValidityMonths: invitationSettings?.invitationMileageValidityMonths ?? 12,
            expiresAt: new Date(Date.now() + qualificationDays * 24 * 60 * 60 * 1000),
          },
        });
      }
      await tx.verificationCode.update({
        where: { id: challengeId },
        data: { userId: user.id, status: "VERIFIED", consumedAt: new Date() },
      });
      return tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    });
    return clientAuthResponse(loggedInUser);
  }

  @Post("third-party")
  async thirdParty(
    @Body() body: { provider?: string; providerToken?: string },
  ) {
    const provider = body.provider?.trim().toLowerCase();
    const providerToken = body.providerToken?.trim();
    if (provider !== "wechat" && provider !== "apple")
      throw new HttpException(
        "Unsupported third-party provider",
        HttpStatus.BAD_REQUEST,
      );
    if (!providerToken)
      throw new HttpException(
        "Third-party provider token is required",
        HttpStatus.BAD_REQUEST,
      );
    if (process.env.NODE_ENV === "production")
      throw new HttpException(
        "Third-party provider verification is not configured",
        HttpStatus.SERVICE_UNAVAILABLE,
      );

    const identity = await prisma.authIdentity.findUnique({
      where: { provider_providerId: { provider, providerId: providerToken } },
      include: { user: true },
    });
    if (identity) {
      const loggedInUser = await prisma.user.update({
        where: { id: identity.user.id },
        data: { lastLoginAt: new Date() },
      });
      return clientAuthResponse(loggedInUser);
    }

    const phoneNumber = `${Date.now()}${randomBytes(2).toString("hex")}`
      .replace(/\D/g, "")
      .slice(-15);
    const user = await prisma.user.create({
      data: {
        id: await generateUserId(),
        countryCode: "+852",
        phoneNumber,
        name: provider === "wechat" ? "WeChat User" : "Apple User",
        lastLoginAt: new Date(),
        authIdentities: { create: { provider, providerId: providerToken } },
      },
    });
    return clientAuthResponse(user);
  }

  @Post("logout")
  async logout(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    await prisma.clientSession.updateMany({
      where: { jti: session.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: { lastLogoutAt: new Date() },
      select: { id: true },
    });
    return { ok: Boolean(user.id) };
  }
}

@Controller("driver/auth")
class DriverAuthController {
  @Post("register/phone/request")
  async requestRegistrationCode(
    @Body() body: { countryCode?: string; phoneNumber?: string },
  ) {
    const identity = parsePhoneIdentity(body);
    const existing = await prisma.driver.findFirst({
      where: {
        OR: [
          {
            phoneCountryCode: identity.countryCode,
            phone: identity.phoneNumber,
          },
          ...(identity.countryCode === "+86"
            ? [{ mainlandPhone: identity.phoneNumber }]
            : [
                {
                  hongKongMacauCountryCode: identity.countryCode,
                  hongKongMacauPhone: identity.phoneNumber,
                },
              ]),
        ],
      },
    });
    if (existing)
      throw new HttpException(
        "Driver phone number is already registered",
        HttpStatus.CONFLICT,
      );
    const code = "00000";
    const challengeId = randomBytes(18).toString("hex");
    const expiresAt = new Date(Date.now() + PHONE_CODE_TTL_MS);
    await prisma.driverOtpChallenge.create({
      data: {
        id: challengeId,
        driverId: null,
        countryCode: identity.countryCode,
        phone: identity.phoneNumber,
        codeHash: hashPassword(code),
        expiresAt,
      },
    });
    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
      ...(process.env.NODE_ENV !== "production"
        ? { developmentCode: code }
        : {}),
    };
  }

  @Post("register/phone/verify")
  async verifyRegistrationCode(
    @Body() body: { challengeId?: string; code?: string },
  ) {
    const challenge = await prisma.driverOtpChallenge.findUnique({
      where: { id: body.challengeId?.trim() || "" },
    });
    const code = body.code?.trim() || "";
    if (
      !challenge ||
      challenge.driverId ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= Date.now() ||
      code.length !== 5 ||
      !verifyPassword(code, challenge.codeHash)
    ) {
      throw new UnauthorizedException("Invalid registration verification code");
    }
    return {
      ok: true,
      challengeId: challenge.id,
      countryCode: challenge.countryCode,
      phone: challenge.phone,
    };
  }

  @Post("register")
  @UseInterceptors(
    FileInterceptor("vehiclePhoto", {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  async register(
    @Body()
    body: {
      name?: unknown;
      vehicleOwnership?: unknown;
      plateType?: unknown;
      hkPlate?: unknown;
      macauPlate?: unknown;
      mainlandPlate?: unknown;
      phoneCountryCode?: unknown;
      phone?: unknown;
      hongKongMacauCountryCode?: unknown;
      hongKongMacauPhone?: unknown;
      mainlandPhone?: unknown;
      vehicleCategory?: unknown;
      vehicleColor?: unknown;
      challengeId?: unknown;
      code?: unknown;
    },
    @UploadedFile() vehiclePhoto?: Express.Multer.File,
  ) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const { vehicleOwnership, plateType, hkPlate, macauPlate, mainlandPlate } =
      normalizeVehiclePlateData({
        ...body,
        vehicleOwnership: body.vehicleOwnership ?? "香港",
      });
    const vehicleCategory =
      typeof body.vehicleCategory === "string"
        ? body.vehicleCategory.trim()
        : "";
    const vehicleColor =
      typeof body.vehicleColor === "string" ? body.vehicleColor.trim() : "";
    if (
      !name ||
      !vehicleCategory ||
      !vehicleColor ||
      !validVehiclePlateData({
        vehicleOwnership,
        plateType,
        hkPlate,
        macauPlate,
        mainlandPlate,
      })
    ) {
      throw new HttpException(
        "Valid driver registration fields are required",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!vehiclePhoto)
      throw new HttpException(
        "Vehicle photo is required and must be JPEG, PNG, or WebP",
        HttpStatus.BAD_REQUEST,
      );
    const activeVehicleCategory = await prisma.vehicleCategory.findFirst({
      where: { name: vehicleCategory, enabled: true },
      select: { id: true },
    });
    if (!activeVehicleCategory) {
      throw new HttpException(
        "Vehicle category is not available",
        HttpStatus.BAD_REQUEST,
      );
    }
    const identity = parsePhoneIdentity({
      countryCode:
        typeof body.phoneCountryCode === "string"
          ? body.phoneCountryCode
          : undefined,
      phoneNumber: typeof body.phone === "string" ? body.phone : undefined,
    });
    const hongKongMacauIdentity = parsePhoneIdentity({
      countryCode:
        typeof body.hongKongMacauCountryCode === "string"
          ? body.hongKongMacauCountryCode
          : undefined,
      phoneNumber:
        typeof body.hongKongMacauPhone === "string"
          ? body.hongKongMacauPhone
          : undefined,
    });
    const mainlandIdentity = parsePhoneIdentity({
      countryCode: "+86",
      phoneNumber:
        typeof body.mainlandPhone === "string" ? body.mainlandPhone : undefined,
    });
    if (!["+852", "+853"].includes(hongKongMacauIdentity.countryCode)) {
      throw new HttpException(
        "Hong Kong/Macau phone country code must be +852 or +853",
        HttpStatus.BAD_REQUEST,
      );
    }
    const verifiedPhoneMatches =
      identity.countryCode === "+86"
        ? mainlandIdentity.phoneNumber === identity.phoneNumber
        : hongKongMacauIdentity.countryCode === identity.countryCode &&
          hongKongMacauIdentity.phoneNumber === identity.phoneNumber;
    if (!verifiedPhoneMatches) {
      throw new HttpException(
        "Verified phone number must match the corresponding registration phone",
        HttpStatus.BAD_REQUEST,
      );
    }
    const challengeId =
      typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const challenge = await prisma.driverOtpChallenge.findUnique({
      where: { id: challengeId },
    });
    if (
      !challenge ||
      challenge.driverId ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.countryCode !== identity.countryCode ||
      challenge.phone !== identity.phoneNumber ||
      code.length !== 5 ||
      !verifyPassword(code, challenge.codeHash)
    ) {
      throw new UnauthorizedException("Invalid registration verification code");
    }
    const existing = await prisma.driver.findFirst({
      where: {
        OR: [
          {
            phoneCountryCode: identity.countryCode,
            phone: identity.phoneNumber,
          },
          {
            hongKongMacauCountryCode: hongKongMacauIdentity.countryCode,
            hongKongMacauPhone: hongKongMacauIdentity.phoneNumber,
          },
          { mainlandPhone: mainlandIdentity.phoneNumber },
        ],
      },
    });
    if (existing)
      throw new HttpException(
        "Driver phone number is already registered",
        HttpStatus.CONFLICT,
      );
    const driver = await prisma.$transaction(async (tx) => {
      const created = await tx.driver.create({
        data: {
          id: `driver-${Date.now()}-${randomBytes(4).toString("hex")}`,
          name,
          affiliation: vehicleOwnership,
          phoneCountryCode: identity.countryCode,
          phone: identity.phoneNumber,
          hongKongMacauCountryCode: hongKongMacauIdentity.countryCode,
          hongKongMacauPhone: hongKongMacauIdentity.phoneNumber,
          mainlandPhone: mainlandIdentity.phoneNumber,
          reviewStatus: "PENDING",
          reviewSubmittedAt: new Date(),
        },
      });
      await tx.driverVehicle.create({
        data: {
          id: `vehicle-${Date.now()}-${randomBytes(4).toString("hex")}`,
          vehicleOwnership,
          plateType,
          hkPlate: hkPlate || null,
          macauPlate: macauPlate || null,
          mainlandPlate: mainlandPlate || null,
          vehicleCategory,
          vehicleColor,
          vehiclePhotos: [],
          vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer),
          vehiclePhotoMime: vehiclePhoto.mimetype,
          assignments: { create: { driverId: created.id, isPrimary: true } },
        },
      });
      await tx.driverOtpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date(), driverId: created.id },
      });
      return created;
    });
    return driverAuthResponse(driver);
  }

  @Post("phone/request")
  async requestPhoneCode(
    @Body() body: { countryCode?: string; phoneNumber?: string },
  ) {
    const identity = parsePhoneIdentity(body);
    const matchingDrivers = await prisma.driver.findMany({
      where: {
        OR: [
          {
            phoneCountryCode: identity.countryCode,
            phone: identity.phoneNumber,
          },
          ...(identity.countryCode === "+86"
            ? [{ mainlandPhone: identity.phoneNumber }]
            : [
                {
                  hongKongMacauCountryCode: identity.countryCode,
                  hongKongMacauPhone: identity.phoneNumber,
                },
              ]),
        ],
      },
    });
    if (matchingDrivers.length > 1)
      throw new HttpException(
        "Driver phone number is linked to multiple accounts",
        HttpStatus.CONFLICT,
      );
    const driver = matchingDrivers[0];
    if (!driver)
      throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    const code = "00000";
    const challengeId = randomBytes(18).toString("hex");
    const expiresAt = new Date(Date.now() + PHONE_CODE_TTL_MS);
    await prisma.driverOtpChallenge.create({
      data: {
        id: challengeId,
        driverId: driver.id,
        countryCode: identity.countryCode,
        phone: identity.phoneNumber,
        codeHash: hashPassword(code),
        expiresAt,
      },
    });
    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
      ...(process.env.NODE_ENV !== "production"
        ? { developmentCode: code }
        : {}),
    };
  }

  @Post("phone/verify")
  async verifyPhoneCode(
    @Body()
    body: {
      challengeId?: string;
      code?: string;
      developmentCode?: string;
    },
  ) {
    const challenge = await prisma.driverOtpChallenge.findUnique({
      where: { id: body.challengeId?.trim() || "" },
      include: { driver: true },
    });
    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= Date.now() ||
      !challenge.driver
    )
      throw new UnauthorizedException("Verification code expired");
    const code = body.code?.trim() || "";
    if (code.length !== 5)
      throw new UnauthorizedException("Invalid verification code");
    if (!verifyPassword(code, challenge.codeHash))
      throw new UnauthorizedException("Invalid verification code");
    await prisma.driverOtpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return driverAuthResponse(challenge.driver);
  }

  @Post("third-party")
  async thirdParty(
    @Body() body: { provider?: string; providerToken?: string },
  ) {
    const provider = body.provider?.trim().toLowerCase();
    if (provider !== "wechat" && provider !== "apple")
      throw new HttpException(
        "Unsupported third-party provider",
        HttpStatus.BAD_REQUEST,
      );
    if (!body.providerToken?.trim())
      throw new HttpException(
        "Third-party provider token is required",
        HttpStatus.BAD_REQUEST,
      );
    throw new HttpException(
      "Third-party provider verification is not configured",
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  @Get("me/wechat-qr-code")
  async wechatQrCode(@Req() req: RequestLike, @Res() response: Response) {
    const session = await driverSessionFrom(req);
    const driver = await prisma.driver.findUnique({
      where: { id: session.sub },
      select: { wechatQrCodeData: true, wechatQrCodeMime: true },
    });
    if (!driver?.wechatQrCodeData || !driver.wechatQrCodeMime)
      throw new HttpException(
        "WeChat payment QR code not found",
        HttpStatus.NOT_FOUND,
      );
    response
      .type(driver.wechatQrCodeMime)
      .send(Buffer.from(driver.wechatQrCodeData));
  }

  @Post("me/wechat-payment")
  @UseInterceptors(
    FileInterceptor("wechatQrCode", {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  async updateWechatPayment(
    @Req() req: RequestLike,
    @Body() body: { wechatId?: unknown },
    @UploadedFile() wechatQrCode?: Express.Multer.File,
  ) {
    const session = await driverSessionFrom(req);
    const wechatId =
      typeof body.wechatId === "string" ? body.wechatId.trim() : "";
    if (!wechatId)
      throw new HttpException("微信 ID 為必填項目", HttpStatus.BAD_REQUEST);
    if (wechatId.length > 128)
      throw new HttpException(
        "微信 ID 長度不能超過 128 個字元",
        HttpStatus.BAD_REQUEST,
      );
    const current = await prisma.driver.findUnique({
      where: { id: session.sub },
      select: { wechatQrCodeData: true, wechatQrCodeMime: true },
    });
    if (!current) throw new UnauthorizedException("Driver not found");
    if (
      !wechatQrCode &&
      (!current.wechatQrCodeData || !current.wechatQrCodeMime)
    )
      throw new HttpException("請上傳收款碼", HttpStatus.BAD_REQUEST);
    const driver = await prisma.driver.update({
      where: { id: session.sub },
      data: {
        wechatId,
        ...(wechatQrCode
          ? {
              wechatQrCodeData: new Uint8Array(wechatQrCode.buffer),
              wechatQrCodeMime: wechatQrCode.mimetype,
            }
          : {}),
      },
    });
    return driverResponse(driver);
  }

  @Get("me/vehicle-photo")
  async vehiclePhoto(@Req() req: RequestLike, @Res() response: Response) {
    const session = await driverSessionFrom(req);
    const vehicle = await primaryDriverVehicle(prisma, session.sub, true);
    if (!vehicle?.vehiclePhotoData || !vehicle.vehiclePhotoMime)
      throw new HttpException("Vehicle photo not found", HttpStatus.NOT_FOUND);
    response
      .type(vehicle.vehiclePhotoMime)
      .send(Buffer.from(vehicle.vehiclePhotoData));
  }

  @Get("me")
  async me(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    const driver = await prisma.driver.findUnique({
      where: { id: session.sub },
    });
    if (!driver) throw new UnauthorizedException("Driver not found");
    return driverResponse(driver);
  }

  @Post("logout")
  async logout(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    await prisma.driverSession.updateMany({
      where: { jti: session.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  @Post("resubmit")
  @UseInterceptors(
    FileInterceptor("vehiclePhoto", {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  async resubmit(
    @Req() req: RequestLike,
    @Body()
    body: {
      name?: unknown;
      vehicleOwnership?: unknown;
      plateType?: unknown;
      hkPlate?: unknown;
      macauPlate?: unknown;
      mainlandPlate?: unknown;
      vehicleCategory?: unknown;
      vehicleColor?: unknown;
    },
    @UploadedFile() vehiclePhoto?: Express.Multer.File,
  ) {
    const session = await driverSessionFrom(req);
    const current = await prisma.driver.findUnique({
      where: { id: session.sub },
    });
    if (!current) throw new UnauthorizedException("Driver not found");
    const currentVehicle = await primaryDriverVehicle(prisma, current.id);
    if (!currentVehicle) throw new HttpException("Assigned vehicle not found", HttpStatus.NOT_FOUND);
    if (current.reviewStatus === "REJECTED")
      throw new ForbiddenException(
        "Rejected registration cannot be resubmitted",
      );
    if (current.reviewStatus !== "REVISION_REQUIRED")
      throw new HttpException(
        "Only returned registrations can be resubmitted",
        HttpStatus.CONFLICT,
      );
    const value = (input: unknown, fallback: string) =>
      typeof input === "string" ? input.trim() : fallback;
    const name = value(body.name, current.name);
    const { vehicleOwnership, plateType, hkPlate, macauPlate, mainlandPlate } =
      normalizeVehiclePlateData({
        vehicleOwnership: body.vehicleOwnership ?? currentVehicle.vehicleOwnership,
        plateType: body.plateType ?? currentVehicle.plateType,
        hkPlate: body.hkPlate ?? currentVehicle.hkPlate,
        macauPlate: body.macauPlate ?? currentVehicle.macauPlate,
        mainlandPlate: body.mainlandPlate ?? currentVehicle.mainlandPlate,
      });
    const vehicleCategory = value(
      body.vehicleCategory,
      currentVehicle.vehicleCategory || "",
    )!;
    const vehicleColor = value(body.vehicleColor, currentVehicle.vehicleColor || "")!;
    if (
      !name ||
      !vehicleCategory ||
      !vehicleColor ||
      !validVehiclePlateData({
        vehicleOwnership,
        plateType,
        hkPlate,
        macauPlate,
        mainlandPlate,
      })
    )
      throw new HttpException(
        "Valid driver registration fields are required",
        HttpStatus.BAD_REQUEST,
      );
    const activeVehicleCategory = await prisma.vehicleCategory.findFirst({
      where: { name: vehicleCategory, enabled: true },
      select: { id: true },
    });
    if (!activeVehicleCategory)
      throw new HttpException(
        "Vehicle category is not available",
        HttpStatus.BAD_REQUEST,
      );
    const driver = await prisma.$transaction(async (tx) => {
      const vehicle = await primaryDriverVehicle(tx, current.id);
      if (!vehicle) throw new HttpException("Assigned vehicle not found", HttpStatus.NOT_FOUND);
      await tx.driverVehicle.update({
        where: { id: vehicle.id },
        data: {
          vehicleOwnership,
          plateType,
          hkPlate: hkPlate || null,
          macauPlate: macauPlate || null,
          mainlandPlate: mainlandPlate || null,
          vehicleCategory,
          vehicleColor,
          ...(vehiclePhoto
            ? {
                vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer),
                vehiclePhotoMime: vehiclePhoto.mimetype,
              }
            : {}),
        },
      });
      return tx.driver.update({
        where: { id: current.id },
        data: {
          name,
          affiliation: vehicleOwnership,
          reviewStatus: "PENDING",
          reviewReason: null,
          reviewSubmittedAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          isOnline: false,
        },
      });
    });
    return driverResponse(driver);
  }

  @Patch("me")
  async updateMe(
    @Req() req: RequestLike,
    @Body()
    body: {
      name?: unknown;
      phoneCountryCode?: unknown;
      phone?: unknown;
      hongKongMacauCountryCode?: unknown;
      hongKongMacauPhone?: unknown;
      mainlandPhone?: unknown;
      vehicleCategory?: unknown;
      vehicleColor?: unknown;
      vehicleOwnership?: unknown;
      hkPlate?: unknown;
      macauPlate?: unknown;
      mainlandPlate?: unknown;
      plateType?: unknown;
      vehiclePhotos?: unknown;
      settlementMethod?: unknown;
      settlementAccount?: unknown;
    },
  ) {
    const session = await driverSessionFrom(req);
    const data: Prisma.DriverUpdateInput = {};
    const vehicleData: Record<string, unknown> = {};
    const vehicleFields = new Set([
      "vehicleCategory",
      "vehicleColor",
      "vehicleOwnership",
      "hkPlate",
      "macauPlate",
      "mainlandPlate",
      "plateType",
    ]);
    const textFields = [
      "name",
      "phoneCountryCode",
      "phone",
      "hongKongMacauCountryCode",
      "hongKongMacauPhone",
      "mainlandPhone",
      "vehicleCategory",
      "vehicleColor",
      "vehicleOwnership",
      "hkPlate",
      "macauPlate",
      "mainlandPlate",
      "plateType",
      "settlementMethod",
      "settlementAccount",
    ] as const;
    for (const field of textFields) {
      if (body[field] !== undefined) {
        if (body[field] !== null && typeof body[field] !== "string")
          throw new HttpException(
            `${field} must be a string`,
            HttpStatus.BAD_REQUEST,
          );
        if (
          body[field] === null &&
          field !== "hkPlate" &&
          field !== "macauPlate" &&
          field !== "mainlandPlate" &&
          field !== "settlementMethod" &&
          field !== "settlementAccount"
        )
          throw new HttpException(
            `${field} cannot be null`,
            HttpStatus.BAD_REQUEST,
          );
        const target = vehicleFields.has(field) ? vehicleData : data;
        (target as Record<string, unknown>)[field] =
          body[field] === null
            ? null
            : field === "hkPlate"
              ? normalizeHongKongPlate(body[field])
              : field === "macauPlate"
                ? normalizeMacauPlate(body[field])
                : field === "mainlandPlate"
                  ? normalizeMainlandPlate(body[field])
                  : body[field].trim();
      }
    }
    if (body.vehiclePhotos !== undefined) {
      if (
        !Array.isArray(body.vehiclePhotos) ||
        body.vehiclePhotos.some((item) => typeof item !== "string")
      )
        throw new HttpException(
          "vehiclePhotos must be an array of strings",
          HttpStatus.BAD_REQUEST,
        );
      vehicleData.vehiclePhotos = body.vehiclePhotos;
    }
    if (
      [
        "vehicleOwnership",
        "plateType",
        "hkPlate",
        "macauPlate",
        "mainlandPlate",
      ].some((field) => field in body)
    ) {
      const current = await prisma.driver.findUnique({
        where: { id: session.sub },
      });
      const currentVehicle = await primaryDriverVehicle(prisma, session.sub);
      if (!current) throw new UnauthorizedException("Driver not found");
      if (!currentVehicle) throw new HttpException("Assigned vehicle not found", HttpStatus.NOT_FOUND);
      const normalized = normalizeVehiclePlateData({
        vehicleOwnership: body.vehicleOwnership ?? currentVehicle.vehicleOwnership,
        plateType: body.plateType ?? currentVehicle.plateType,
        hkPlate: body.hkPlate === undefined ? currentVehicle.hkPlate : body.hkPlate,
        macauPlate:
          body.macauPlate === undefined ? currentVehicle.macauPlate : body.macauPlate,
        mainlandPlate:
          body.mainlandPlate === undefined
            ? currentVehicle.mainlandPlate
            : body.mainlandPlate,
      });
      if (!validVehiclePlateData(normalized))
        throw new HttpException(
          "Valid vehicle plate fields are required",
          HttpStatus.BAD_REQUEST,
        );
      vehicleData.vehicleOwnership = normalized.vehicleOwnership;
      vehicleData.plateType = normalized.plateType;
      vehicleData.hkPlate = normalized.hkPlate || null;
      vehicleData.macauPlate = normalized.macauPlate || null;
      vehicleData.mainlandPlate = normalized.mainlandPlate || null;
    }
    if (body.vehiclePhotos !== undefined) {
      if (
        !Array.isArray(body.vehiclePhotos) ||
        body.vehiclePhotos.some((item) => typeof item !== "string")
      )
        throw new HttpException(
          "vehiclePhotos must be an array of strings",
          HttpStatus.BAD_REQUEST,
        );
      vehicleData.vehiclePhotos = body.vehiclePhotos;
    }
    if (Object.keys(data).length === 0 && Object.keys(vehicleData).length === 0)
      throw new HttpException(
        "No profile fields supplied",
        HttpStatus.BAD_REQUEST,
      );
    const driver = await prisma.$transaction(async (tx) => {
      if (Object.keys(vehicleData).length) {
        const vehicle = await primaryDriverVehicle(tx, session.sub);
        if (!vehicle) throw new HttpException("Assigned vehicle not found", HttpStatus.NOT_FOUND);
        await tx.driverVehicle.update({ where: { id: vehicle.id }, data: vehicleData });
      }
      return tx.driver.update({ where: { id: session.sub }, data });
    });
    return driverResponse(driver);
  }

  @Get("vehicles")
  async listMyVehicles(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    const assignments = await prisma.driverVehicleAssignment.findMany({
      where: {
        driverId: session.sub,
        enabled: true,
        vehicle: { enabled: true },
      },
      include: { vehicle: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return {
      data: assignments.map(({ vehicle, isPrimary }) => ({
        ...driverVehicleResponse(vehicle),
        isPrimary,
      })),
      total: assignments.length,
    };
  }

  @Post("vehicles")
  @UseInterceptors(
    FileInterceptor("vehiclePhoto", {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  async createMyVehicle(
    @Req() req: RequestLike,
    @Body()
    body: {
      vehicleOwnership?: unknown;
      plateType?: unknown;
      hkPlate?: unknown;
      macauPlate?: unknown;
      mainlandPlate?: unknown;
      vehicleCategory?: unknown;
      vehicleColor?: unknown;
    },
    @UploadedFile() vehiclePhoto?: Express.Multer.File,
  ) {
    const { session } = await reviewedDriverFrom(req);
    const vehicle = await this.validateVehicleInput(body);
    const created = await prisma.$transaction(async (tx) => {
      const primary = await tx.driverVehicleAssignment.findFirst({
        where: {
          driverId: session.sub,
          enabled: true,
          isPrimary: true,
          vehicle: { enabled: true },
        },
        select: { id: true },
      });
      const item = await tx.driverVehicle.create({
        data: {
          id: `vehicle-${Date.now()}-${randomBytes(4).toString("hex")}`,
          ...vehicle,
          vehiclePhotos: [],
          ...(vehiclePhoto
            ? {
                vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer),
                vehiclePhotoMime: vehiclePhoto.mimetype,
              }
            : {}),
        },
      });
      await tx.driverVehicleAssignment.create({
        data: {
          driverId: session.sub,
          vehicleId: item.id,
          isPrimary: !primary,
        },
      });
      return item;
    });
    return driverVehicleResponse(created);
  }

  @Post("vehicles/:id/primary")
  async setPrimaryVehicle(@Req() req: RequestLike, @Param("id") id: string) {
    const { session } = await reviewedDriverFrom(req);
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.driverVehicleAssignment.findFirst({
        where: {
          driverId: session.sub,
          vehicleId: id,
          enabled: true,
          vehicle: { enabled: true },
        },
        select: { id: true },
      });
      if (!assignment)
        throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
      const activeTrip = await tx.trip.findFirst({
        where: {
          driverId: session.sub,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          OR: [
            {
              executionPhase: {
                in: ["DRIVER_PENDING_ACCEPTANCE", "DRIVER_ASSIGNED", "IN_PROGRESS"],
              },
            },
            { acceptedAt: { not: null }, completedAt: null },
          ],
        },
        select: { id: true },
      });
      if (activeTrip)
        throw new HttpException(
          "Primary vehicle cannot be changed during an active trip",
          HttpStatus.CONFLICT,
        );
      await tx.driverVehicleAssignment.updateMany({
        where: { driverId: session.sub },
        data: { isPrimary: false },
      });
      await tx.driverVehicleAssignment.update({
        where: { id: assignment.id },
        data: { isPrimary: true },
      });
    });
    return { ok: true };
  }

  @Delete("vehicles/:id")
  async deleteMyVehicle(@Req() req: RequestLike, @Param("id") id: string) {
    const { session, driver } = await reviewedDriverFrom(req);
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.driverVehicleAssignment.findFirst({
        where: {
          driverId: session.sub,
          vehicleId: id,
          enabled: true,
          vehicle: { enabled: true },
        },
        select: { id: true, isPrimary: true },
      });
      if (!assignment)
        throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
      const activeTrip = await tx.trip.findFirst({
        where: {
          driverId: session.sub,
          vehicleId: id,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          OR: [
            {
              executionPhase: {
                in: ["DRIVER_PENDING_ACCEPTANCE", "DRIVER_ASSIGNED", "IN_PROGRESS"],
              },
            },
            { acceptedAt: { not: null }, completedAt: null },
          ],
        },
        select: { id: true },
      });
      if (activeTrip)
        throw new HttpException(
          "Vehicle is assigned to an active trip",
          HttpStatus.CONFLICT,
        );
      const remaining = await tx.driverVehicleAssignment.count({
        where: {
          driverId: session.sub,
          enabled: true,
          vehicleId: { not: id },
          vehicle: { enabled: true },
        },
      });
      if (assignment.isPrimary && remaining > 0)
        throw new HttpException(
          "Select another primary vehicle before deleting this vehicle",
          HttpStatus.CONFLICT,
        );
      if (remaining === 0 && driver.isOnline)
        throw new HttpException(
          "Go offline before deleting the last active vehicle",
          HttpStatus.CONFLICT,
        );
      await tx.driverVehicleAssignment.update({
        where: { id: assignment.id },
        data: { enabled: false, isPrimary: false },
      });
    });
    return { ok: true };
  }

  @Patch("vehicles/:id")
  @UseInterceptors(
    FileInterceptor("vehiclePhoto", {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  async updateMyVehicle(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body()
    body: {
      vehicleOwnership?: unknown;
      plateType?: unknown;
      hkPlate?: unknown;
      macauPlate?: unknown;
      mainlandPlate?: unknown;
      vehicleCategory?: unknown;
      vehicleColor?: unknown;
    },
    @UploadedFile() vehiclePhoto?: Express.Multer.File,
  ) {
    const { session } = await reviewedDriverFrom(req);
    const vehicle = await this.validateVehicleInput(body);
    const updated = await prisma.driverVehicle.updateMany({
      where: {
        id,
        assignments: { some: { driverId: session.sub, enabled: true } },
      },
      data: {
        ...vehicle,
        ...(vehiclePhoto
          ? {
              vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer),
              vehiclePhotoMime: vehiclePhoto.mimetype,
            }
          : {}),
      },
    });
    if (!updated.count)
      throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
    return driverVehicleResponse(
      await prisma.driverVehicle.findUniqueOrThrow({ where: { id } }),
    );
  }

  private async validateVehicleInput(body: {
    vehicleOwnership?: unknown;
    plateType?: unknown;
    hkPlate?: unknown;
    macauPlate?: unknown;
    mainlandPlate?: unknown;
    vehicleCategory?: unknown;
    vehicleColor?: unknown;
  }) {
    const normalized = normalizeVehiclePlateData(body);
    const vehicleCategory =
      typeof body.vehicleCategory === "string" ? body.vehicleCategory.trim() : "";
    const vehicleColor =
      typeof body.vehicleColor === "string" ? body.vehicleColor.trim() : "";
    if (!vehicleCategory || !vehicleColor || !validVehiclePlateData(normalized))
      throw new HttpException(
        "Valid vehicle fields are required",
        HttpStatus.BAD_REQUEST,
      );
    const category = await prisma.vehicleCategory.findFirst({
      where: { name: vehicleCategory, enabled: true },
      select: { id: true },
    });
    if (!category)
      throw new HttpException(
        "Vehicle category is not available",
        HttpStatus.BAD_REQUEST,
      );
    return {
      vehicleOwnership: normalized.vehicleOwnership,
      plateType: normalized.plateType,
      hkPlate: normalized.hkPlate || null,
      macauPlate: normalized.macauPlate || null,
      mainlandPlate: normalized.mainlandPlate || null,
      vehicleCategory,
      vehicleColor,
    };
  }

  @Post("status")
  async updateStatus(
    @Req() req: RequestLike,
    @Body() body: { isOnline?: unknown },
  ) {
    const { session } = await reviewedDriverFrom(req);
    if (typeof body.isOnline !== "boolean")
      throw new HttpException(
        "isOnline must be a boolean",
        HttpStatus.BAD_REQUEST,
      );
    if (body.isOnline) await requireActiveDriverVehicle(prisma, session.sub);
    const now = new Date();
    const current = await prisma.driver.findUnique({
      where: { id: session.sub },
      select: { isOnline: true },
    });
    if (!current) throw new UnauthorizedException("Driver not found");
    if (current.isOnline !== body.isOnline) {
      if (body.isOnline) {
        await prisma.driverOnlineSession.create({
          data: { driverId: session.sub, startedAt: now },
        });
      } else {
        await prisma.driverOnlineSession.updateMany({
          where: { driverId: session.sub, endedAt: null },
          data: { endedAt: now },
        });
      }
    }
    const driver = await prisma.driver.update({
      where: { id: session.sub },
      data: { isOnline: body.isOnline },
    });
    return driverResponse(driver);
  }

  @Get("statistics")
  async statistics(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const trips = await prisma.trip.findMany({
      where: {
        driverId: session.sub,
        status: "COMPLETED",
        completedAt: { not: null },
      },
      include: { settlement: true, user: true },
      orderBy: { completedAt: "desc" },
    });
    const onlineSessions = await prisma.driverOnlineSession.findMany({
      where: { driverId: session.sub, startedAt: { lt: now } },
    });
    const durationMs = onlineSessions.reduce((total, item) => {
      const start = item.startedAt > todayStart ? item.startedAt : todayStart;
      const end = item.endedAt && item.endedAt < now ? item.endedAt : now;
      return total + Math.max(0, end.getTime() - start.getTime());
    }, 0);
    const todayTrips = trips.filter((item) => item.completedAt! >= todayStart);
    const monthTrips = trips.filter((item) => item.completedAt! >= monthStart);
    const settledTrips = trips.filter((item) => item.settlement != null);
    const unsettledTrips = trips.filter((item) => item.settlement == null);
    const sum = (items: typeof trips) =>
      roundMoney(
        items.reduce(
          (total, item) => total + (item.driverPayoutAmount ?? 0),
          0,
        ),
      );
    const ratings = await prisma.driverRating.findMany({
      where: { driverId: session.sub },
      select: { score: true },
    });
    const ratingTotal = ratings.reduce((total, item) => total + item.score, 0);
    const recentOrders = trips.slice(0, 3).map((item) => ({
      id: item.id,
      completedAt: item.completedAt!.toISOString(),
      price: item.driverPayoutAmount,
      currency: item.driverPayoutCurrency,
      origin: item.origin,
      destination: item.destination,
      passenger: item.passengerName,
      passengerGender: item.passengerGender || item.user.gender || null,
      settlementStatus: item.settlement ? "SETTLED" : "UNSETTLED",
      settlementMethod: item.settlement?.method ?? null,
      settledAt: item.settlement?.settledAt.toISOString() ?? null,
    }));
    return {
      today: {
        earnings: sum(todayTrips),
        currency:
          trips.find((item) => item.driverPayoutCurrency)
            ?.driverPayoutCurrency ?? null,
        completedTrips: todayTrips.length,
        onlineHours: durationMs / 3600000,
      },
      month: {
        earnings: sum(monthTrips),
        currency:
          trips.find((item) => item.driverPayoutCurrency)
            ?.driverPayoutCurrency ?? null,
      },
      settlement: {
        settledEarnings: sum(settledTrips),
        unsettledEarnings: sum(unsettledTrips),
        currency:
          trips.find((item) => item.driverPayoutCurrency)
            ?.driverPayoutCurrency ?? "HKD",
      },
      rating: {
        average: ratings.length ? ratingTotal / ratings.length : null,
        count: ratings.length,
      },
      recentOrders,
    };
  }

  @Get("trips/active")
  async activeTrips(@Req() req: RequestLike) {
    const { session } = await reviewedDriverFrom(req);
    const trips = await prisma.trip.findMany({
      where: {
        driverId: session.sub,
        completedAt: null,
        status: { not: "CANCELLED" },
      },
      include: { user: true, settlement: true },
      orderBy: { scheduledAt: "asc" },
    });
    return trips.map((trip) => driverTripResponse(trip, true));
  }

  @Get("trips")
  async history(@Req() req: RequestLike) {
    const { session } = await reviewedDriverFrom(req);
    const [trips, driverCancellations] = await Promise.all([
      prisma.trip.findMany({
        where: {
          driverId: session.sub,
          OR: [{ completedAt: { not: null } }, { status: "CANCELLED" }],
        },
        include: { user: true, settlement: true },
      }),
      prisma.driverTripCancellation.findMany({
        where: { driverId: session.sub },
        include: {
          trip: { include: { user: true, settlement: true } },
        },
      }),
    ]);
    return [
      ...trips.map((trip) => driverTripResponse(trip, true)),
      ...driverCancellations.map((item) => ({
        ...driverTripResponse(item.trip, true),
        cancelledAt: item.cancelledAt.toISOString(),
        cancellationSource: "DRIVER",
        settlement: null,
      })),
    ].sort((left, right) => {
      const leftAt = left.completedAt || left.cancelledAt || left.scheduledAt;
      const rightAt = right.completedAt || right.cancelledAt || right.scheduledAt;
      return rightAt.localeCompare(leftAt);
    });
  }

  @Post("trips/:id/arrive")
  async arrive(@Req() req: RequestLike, @Param("id") id: string) {
    const { session } = await reviewedDriverFrom(req);
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!trip || trip.driverId !== session.sub)
      throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    if (
      !trip.acceptedAt ||
      trip.startedAt ||
      trip.completedAt ||
      trip.status === "CANCELLED"
    )
      throw new HttpException(
        "Trip cannot be marked arrived",
        HttpStatus.CONFLICT,
      );
    const updated = await prisma.trip.update({
      where: { id },
      data: { arrivedAt: new Date() },
      include: { user: true },
    });
    return tripResponse(updated);
  }

  @Post("trips/:id/cancel")
  async cancel(@Req() req: RequestLike, @Param("id") id: string) {
    const { session } = await reviewedDriverFrom(req);
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!trip || trip.driverId !== session.sub)
      throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    if (trip.startedAt || trip.completedAt || trip.status === "CANCELLED")
      throw new HttpException(
        "Trip cannot be cancelled by driver",
        HttpStatus.CONFLICT,
      );
    const cancelledAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const cancellation = await tx.driverTripCancellation.create({
        data: { tripId: id, driverId: session.sub, cancelledAt },
      });
      const update = await tx.trip.updateMany({
        where: {
          id,
          driverId: session.sub,
          startedAt: null,
          completedAt: null,
          status: { not: "CANCELLED" },
        },
        data: {
          driverId: null,
          driverName: null,
          driverPhone: null,
          vehicleId: null,
          vehicleCategory: null,
          vehicleColor: null,
          vehiclePlateType: null,
          vehiclePlate: null,
          vehicleHkPlate: null,
          vehicleMacauPlate: null,
          vehicleMainlandPlate: null,
          assignedAt: null,
          acceptedAt: null,
          arrivedAt: null,
          executionPhase: "WAITING_DRIVER",
        },
      });
      if (update.count !== 1) {
        await tx.driverTripCancellation.delete({ where: { id: cancellation.id } });
      } else {
        await tx.tripOrderUrl.updateMany({
          where: { tripId: id, revokedAt: null },
          data: { revokedAt: cancelledAt },
        });
      }
      return update;
    });
    if (result.count !== 1)
      throw new HttpException(
        "Trip cannot be cancelled by driver",
        HttpStatus.CONFLICT,
      );
    await publishDriverOrderEvent({ reason: "available", tripId: id });
    const updated = await prisma.trip.findUniqueOrThrow({
      where: { id },
      include: { user: true },
    });
    return driverTripResponse(updated);
  }

  @Post("trips/:id/reject")
  async reject(@Req() req: RequestLike, @Param("id") id: string) {
    const { session } = await reviewedDriverFrom(req);
    const result = await prisma.trip.updateMany({
      where: {
        id,
        driverId: session.sub,
        executionPhase: "DRIVER_PENDING_ACCEPTANCE",
        acceptedAt: null,
        startedAt: null,
        completedAt: null,
        status: "CONFIRMED",
      },
      data: {
        driverId: null,
        driverName: null,
        driverPhone: null,
        vehicleId: null,
        vehicleCategory: null,
        vehicleColor: null,
        vehiclePlateType: null,
        vehiclePlate: null,
        vehicleHkPlate: null,
        vehicleMacauPlate: null,
        vehicleMainlandPlate: null,
        assignedAt: null,
        executionPhase: "WAITING_DRIVER",
      },
    });
    if (result.count !== 1)
      throw new HttpException("Trip cannot be rejected", HttpStatus.CONFLICT);
    await publishDriverOrderEvent({ reason: "available", tripId: id });
    const updated = await prisma.trip.findUniqueOrThrow({
      where: { id },
      include: { user: true },
    });
    return driverTripResponse(updated);
  }

  @Post("trips/:id/start")
  async start(@Req() req: RequestLike, @Param("id") id: string) {
    const { session } = await reviewedDriverFrom(req);
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!trip || trip.driverId !== session.sub)
      throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    if (
      !trip.acceptedAt ||
      !trip.arrivedAt ||
      trip.startedAt ||
      trip.completedAt ||
      trip.status === "CANCELLED"
    )
      throw new HttpException("Trip cannot be started", HttpStatus.CONFLICT);
    const result = await prisma.trip.updateMany({
      where: {
        id,
        driverId: session.sub,
        acceptedAt: { not: null },
        arrivedAt: { not: null },
        startedAt: null,
        completedAt: null,
        status: { not: "CANCELLED" },
      },
      data: { startedAt: new Date(), executionPhase: "IN_PROGRESS" },
    });
    if (result.count !== 1)
      throw new HttpException("Trip cannot be started", HttpStatus.CONFLICT);
    const updated = await prisma.trip.findUniqueOrThrow({
      where: { id },
      include: { user: true },
    });
    return tripResponse(updated);
  }

  @Post("trips/:id/complete")
  async complete(@Req() req: RequestLike, @Param("id") id: string) {
    const { session } = await reviewedDriverFrom(req);
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!trip || trip.driverId !== session.sub)
      throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    if (!trip.startedAt || trip.completedAt || trip.status === "CANCELLED")
      throw new HttpException("Trip cannot be completed", HttpStatus.CONFLICT);
    const updated = await prisma.$transaction(async (tx) => {
      const completed = await tx.trip.update({
        where: { id },
        data: {
          completedAt: new Date(),
          status: "COMPLETED",
          executionPhase: null,
        },
        include: { user: true, payment: true },
      });
      const mileageSettings = await tx.appSetting.findUniqueOrThrow({
        where: { id: appSettingsDefaults.id },
      });
      const spendPerKm = Math.max(0.01, mileageSettings.mileageSpendPerKm);
      const earned = completed.payment
        ? Math.max(0, Math.floor(Number(completed.payment.total) / spendPerKm))
        : 0;
      if (earned > 0) {
        const account = await tx.mileageAccount.upsert({
          where: { userId: completed.userId },
          create: {
            userId: completed.userId,
            balance: earned,
            lifetimeEarned: earned,
          },
          update: {
            balance: { increment: earned },
            lifetimeEarned: { increment: earned },
          },
        });
        await tx.mileageLedger.create({
          data: {
            userId: completed.userId,
            amount: earned,
            balanceAfter: account.balance,
            type: "EARN",
            reason: "完成跨境行程",
            tripId: completed.id,
            expiresAt: new Date(
              new Date().setMonth(
                new Date().getMonth() + mileageSettings.mileageValidityMonths,
              ),
            ),
          },
        });
      }
      await tx.tripOrderUrl.updateMany({
        where: { tripId: completed.id, driverId: session.sub, usedAt: { not: null } },
        data: { completedAt: completed.completedAt },
      });
      await rewardInvitation(tx, completed.userId, completed.id);
      return completed;
    });
    return tripResponse(updated);
  }

  @Get("notification-preferences")
  async notificationPreferences(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    const preference = await prisma.driverNotificationPreference.findUnique({
      where: { driverId: session.sub },
    });
    return (
      preference || {
        driverId: session.sub,
        notificationsOn: true,
        orderOn: true,
        settlementOn: true,
        systemOn: true,
        soundOn: true,
      }
    );
  }

  @Patch("notification-preferences")
  async updateNotificationPreferences(
    @Req() req: RequestLike,
    @Body()
    body: {
      notificationsOn?: boolean;
      orderOn?: boolean;
      settlementOn?: boolean;
      systemOn?: boolean;
      soundOn?: boolean;
    },
  ) {
    const session = await driverSessionFrom(req);
    const fields = [
      "notificationsOn",
      "orderOn",
      "settlementOn",
      "systemOn",
      "soundOn",
    ] as const;
    const data: Partial<Record<(typeof fields)[number], boolean>> = {};
    for (const field of fields) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "boolean")
          throw new HttpException(
            `${field} must be a boolean`,
            HttpStatus.BAD_REQUEST,
          );
        data[field] = body[field];
      }
    }
    return prisma.driverNotificationPreference.upsert({
      where: { driverId: session.sub },
      create: { driverId: session.sub, ...data },
      update: data,
    });
  }

  @Get("notifications/cancellations/pending")
  async pendingCancellationNotifications(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    const items = await prisma.notification.findMany({
      where: {
        driverId: session.sub,
        templateType: "trip_cancelled",
        readAt: null,
      },
      include: {
        trip: {
          select: {
            id: true,
            origin: true,
            destination: true,
            scheduledAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      readAt: null,
      trip: item.trip
        ? {
            ...item.trip,
            scheduledAt: item.trip.scheduledAt.toISOString(),
          }
        : null,
    }));
  }

  @Post("notifications/events/ticket")
  async notificationEventTicket(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    pruneNotificationEventTickets();
    const ticket = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + 60_000;
    notificationEventTickets.set(ticket, {
      recipientType: "driver",
      recipientId: session.sub,
      expiresAt,
    });
    return { ticket, expiresAt: new Date(expiresAt).toISOString() };
  }

  @Get("notifications/events")
  async notificationEvents(@Req() req: RequestLike, @Res() res: Response) {
    pruneNotificationEventTickets();
    const ticket = req.query?.ticket;
    const entry = ticket ? notificationEventTickets.get(ticket) : undefined;
    if (!ticket || !entry || entry.recipientType !== "driver" || entry.expiresAt <= Date.now())
      throw new UnauthorizedException("Valid notification event ticket required");
    notificationEventTickets.delete(ticket);
    res.status(HttpStatus.OK);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const subscription = notificationEvents.subscribe((event) => {
      if (event.recipientType !== "driver" || !event.recipientIds.includes(entry.recipientId)) return;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
    }, 25_000);
    const cleanup = () => {
      clearInterval(heartbeat);
      subscription.unsubscribe();
    };
    req.on?.("close", cleanup);
  }

  @Get("notifications")
  async notifications(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    const items = await prisma.notification.findMany({
      where: { driverId: session.sub },
      orderBy: { createdAt: "desc" },
    });
    return items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt?.toISOString() || null,
    }));
  }

  @Post("notifications/:id/read")
  async readNotification(@Req() req: RequestLike, @Param("id") id: string) {
    const session = await driverSessionFrom(req);
    const result = await prisma.notification.updateMany({
      where: { id, driverId: session.sub },
      data: { readAt: new Date() },
    });
    if (result.count !== 1)
      throw new HttpException("Notification not found", HttpStatus.NOT_FOUND);
    const item = await prisma.notification.findUniqueOrThrow({ where: { id } });
    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt?.toISOString() || null,
    };
  }
  @Post("trips/events/ticket")
  async orderEventTicket(@Req() req: RequestLike) {
    const { session } = await reviewedDriverFrom(req);
    pruneDriverEventTickets();
    const ticket = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + 60_000;
    driverEventTickets.set(ticket, { driverId: session.sub, expiresAt });
    return { ticket, expiresAt: new Date(expiresAt).toISOString() };
  }

  @Get("trips/events")
  async orderEvents(@Req() req: RequestLike, @Res() res: Response) {
    pruneDriverEventTickets();
    const ticket = req.query?.ticket;
    const entry = ticket ? driverEventTickets.get(ticket) : undefined;
    if (!ticket || !entry || entry.expiresAt <= Date.now())
      throw new UnauthorizedException("Valid driver event ticket required");
    driverEventTickets.delete(ticket);
    const driver = await prisma.driver.findUnique({ where: { id: entry.driverId } });
    if (!driver) throw new UnauthorizedException("Driver not found");
    requireReviewedDriver(driver);
    res.status(HttpStatus.OK);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const subscription = driverOrderEvents.subscribe((event) => {
      if (event.driverId != null && event.driverId !== entry.driverId) return;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
    }, 25_000);
    const cleanup = () => {
      clearInterval(heartbeat);
      subscription.unsubscribe();
    };
    req.on?.("close", cleanup);
  }

  @Get("trips/available")
  async available(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req);
    const driver = await prisma.driver.findUnique({
      where: { id: session.sub },
    });
    if (!driver) throw new UnauthorizedException("Driver not found");
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    if (!settings.driverRaceEnabled)
      throw new ForbiddenException("Driver race acceptance is disabled");
    requireReviewedDriver(driver);
    await requireActiveDriverVehicle(prisma, driver.id);
    if (!driver.isOnline)
      throw new ForbiddenException("Driver must be online to accept trips");
    if (!settings.dispatchSchedulingEnabled) {
      await prisma.$transaction((tx) =>
        openEligibleTripsForDispatch(
          tx,
          settings.driverPayoutPercentage,
        ),
      );
    }
    const trips = await prisma.trip.findMany({
      where: {
        driverId: null,
        status: "CONFIRMED",
        ...(settings.dispatchSchedulingEnabled
          ? { executionPhase: "WAITING_DRIVER" as const }
          : {
              OR: [
                { executionPhase: "WAITING_DRIVER" as const },
                { executionPhase: null },
              ],
            }),
        scheduledAt: { gt: tripOfferCutoff() },
        payment: { is: { status: "PAID" } },
        ...publicDriverOrderChannelFilter,
      },
      include: { user: true },
      orderBy: { scheduledAt: "asc" },
    });
    return trips.map((trip) => driverTripResponse(trip));
  }

  @Get("trips/:id")
  async tripDetails(@Req() req: RequestLike, @Param("id") id: string) {
    const { session, driver } = await reviewedDriverFrom(req);
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { user: true, payment: true, settlement: true },
    });
    if (!trip) throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    const assignedToDriver = trip.driverId === session.sub;
    if (!assignedToDriver) await requireActiveDriverVehicle(prisma, driver.id);
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    let visibleTrip = trip;
    if (
      !assignedToDriver &&
      settings.driverRaceEnabled &&
      !settings.dispatchSchedulingEnabled &&
      trip.executionPhase === null
    ) {
      await prisma.$transaction((tx) =>
        openEligibleTripsForDispatch(tx, settings.driverPayoutPercentage, id),
      );
      const refreshedTrip = await prisma.trip.findUnique({
        where: { id },
        include: { user: true, payment: true, settlement: true },
      });
      if (!refreshedTrip)
        throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
      visibleTrip = refreshedTrip;
    }
    const availableToDriver =
      visibleTrip.driverId === null &&
      visibleTrip.status === "CONFIRMED" &&
      visibleTrip.executionPhase === "WAITING_DRIVER" &&
      visibleTrip.payment?.status === "PAID" &&
      (await prisma.tripOrderUrl.count({
        where: { tripId: visibleTrip.id, revokedAt: null },
      })) === 0 &&
      settings.driverRaceEnabled &&
      driver.isOnline &&
      !tripOfferIsExpired(visibleTrip.scheduledAt);
    if (!assignedToDriver && !availableToDriver)
      throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    return driverTripResponse(visibleTrip, assignedToDriver);
  }

  @Post("trips/:id/accept")
  async accept(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { vehicleId?: unknown },
  ) {
    const session = await driverSessionFrom(req);
    const driver = await prisma.driver.findUnique({
      where: { id: session.sub },
    });
    if (!driver) throw new UnauthorizedException("Driver not found");
    requireReviewedDriver(driver);
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!trip) throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    const now = new Date();
    const assignedToDriver =
      trip.driverId === driver.id &&
      trip.executionPhase === "DRIVER_PENDING_ACCEPTANCE" &&
      trip.acceptedAt === null;
    if (!assignedToDriver && tripOfferIsExpired(trip.scheduledAt, now))
      throw new HttpException("Trip offer has expired", HttpStatus.GONE);
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    if (!assignedToDriver && !settings.driverRaceEnabled)
      throw new ForbiddenException("Driver race acceptance is disabled");
    if (!assignedToDriver) {
      if (!driver.isOnline)
        throw new ForbiddenException("Driver must be online to accept trips");
      if (trip.executionPhase === null && !settings.dispatchSchedulingEnabled) {
        await prisma.$transaction((tx) =>
          openEligibleTripsForDispatch(tx, settings.driverPayoutPercentage, id),
        );
      }
    }
    const requestedVehicleId =
      typeof body.vehicleId === "string" && body.vehicleId.trim()
        ? body.vehicleId.trim()
        : undefined;
    if (body.vehicleId !== undefined && !requestedVehicleId)
      throw new HttpException("Valid vehicleId is required", HttpStatus.BAD_REQUEST);
    if (assignedToDriver && requestedVehicleId && requestedVehicleId !== trip.vehicleId)
      throw new HttpException(
        "Assigned trips must use the dispatched vehicle",
        HttpStatus.CONFLICT,
      );
    if (assignedToDriver && !trip.vehicleId)
      throw new HttpException(
        "Assigned trip does not have a vehicle snapshot",
        HttpStatus.CONFLICT,
      );
    const assignedVehicle = assignedToDriver
      ? null
      : await requireActiveDriverVehicle(prisma, driver.id, requestedVehicleId);
    const result = await prisma.trip.updateMany({
      where: assignedToDriver
        ? {
            id,
            driverId: driver.id,
            status: "CONFIRMED",
            executionPhase: "DRIVER_PENDING_ACCEPTANCE",
            acceptedAt: null,
            payment: { is: { status: "PAID" } },
          }
        : {
            id,
            driverId: null,
            status: "CONFIRMED",
            ...(settings.dispatchSchedulingEnabled
              ? { executionPhase: "WAITING_DRIVER" as const }
              : {
                  OR: [
                    { executionPhase: "WAITING_DRIVER" as const },
                    { executionPhase: null },
                  ],
                }),
            scheduledAt: { gt: tripOfferCutoff(now) },
            payment: { is: { status: "PAID" } },
            ...publicDriverOrderChannelFilter,
          },
      data: {
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: `${driver.phoneCountryCode} ${driver.phone}`,
        ...(assignedVehicle ? tripVehicleSnapshot(assignedVehicle) : {}),
        status: "CONFIRMED",
        executionPhase: "DRIVER_ASSIGNED",
        assignedAt: trip.assignedAt || now,
        acceptedAt: now,
      },
    });
    if (result.count !== 1)
      throw new HttpException(
        "Trip is no longer available",
        HttpStatus.CONFLICT,
      );
    await publishDriverOrderEvent({ reason: "taken", tripId: id });
    const updated = await prisma.trip.findUnique({
      where: { id },
      include: { user: true },
    });
    return updated ? driverTripResponse(updated, true) : null;
  }
}

@Controller("order-invite")
class DriverOrderInviteShareController {
  private readonly invites = new DriverOrderInviteController();

  @Get()
  async page(@Req() request: RequestLike, @Res() response: Response) {
    const token = typeof request.query?.token === "string" ? request.query.token : "";
    if (!token) throw new HttpException("Order invitation not found", HttpStatus.NOT_FOUND);
    const details = await this.invites.details(token);
    const base = new URL(process.env.DRIVER_ORDER_URL_BASE || "http://localhost:8081/order-invite");
    const appPage = new URL("/order-invite-app", base);
    appPage.searchParams.set("token", token);
    const userAgent = String(request.headers?.["user-agent"] ?? "");
    const isCrawler = /(facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|Discordbot|TelegramBot|Googlebot)/i.test(userAgent);
    if (!isCrawler) {
      response.redirect(302, appPage.href);
      return;
    }
    response.setHeader("Cache-Control", "no-store");
    response.type("html").send(inviteShareHtml(base, token, {
      ...details.trip,
      payoutAmount: details.trip.payoutAmount?.toString() ?? "",
    }));
  }

  @Get("share-image")
  async image(@Req() request: RequestLike, @Res() response: Response) {
    const token = typeof request.query?.token === "string" ? request.query.token : "";
    if (!token) throw new HttpException("Order invitation not found", HttpStatus.NOT_FOUND);
    await this.invites.details(token);
    const rendererOrigin = process.env.SHARE_RENDERER_ORIGIN?.trim();
    if (!rendererOrigin) throw new HttpException("Preview unavailable", HttpStatus.SERVICE_UNAVAILABLE);
    const rendererUrl = new URL("/order-invite/share-image", rendererOrigin);
    rendererUrl.searchParams.set("token", token);
    try {
      const rendered = await fetch(rendererUrl, { signal: AbortSignal.timeout(30000) });
      if (!rendered.ok) throw new Error(`Renderer returned ${rendered.status}`);
      response.setHeader("Cache-Control", "private, max-age=60");
      response.type("png").send(Buffer.from(await rendered.arrayBuffer()));
    } catch (error) {
      console.error("Failed to render order invitation preview", error);
      throw new HttpException("Preview unavailable", HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}

@Controller("driver/order-invites")
class DriverOrderInviteController {
  @Get(":token")
  async details(@Param("token") token: string) {
    const item = await prisma.tripOrderUrl.findUnique({
      where: { tokenHash: orderUrlTokenHash(token) },
      include: { trip: { include: { payment: true } } },
    });
    if (!item)
      throw new HttpException("Order invitation not found", HttpStatus.NOT_FOUND);
    const now = new Date();
    if (item.revokedAt || item.usedAt || now < item.validFrom || now > item.validUntil)
      throw new HttpException("Order invitation has expired", HttpStatus.GONE);
    if (
      item.trip.status !== "CONFIRMED" ||
      item.trip.executionPhase !== "WAITING_DRIVER" ||
      item.trip.driverId ||
      item.trip.acceptedAt ||
      item.trip.payment?.status !== "PAID" ||
      tripOfferIsExpired(item.trip.scheduledAt, now)
    )
      throw new HttpException("Trip is no longer available", HttpStatus.CONFLICT);
    return {
      invitation: {
        id: item.id,
        status: item.reservedAt ? "RESERVED" : "ACTIVE",
        validFrom: item.validFrom.toISOString(),
        validUntil: item.validUntil.toISOString(),
      },
      trip: {
        id: item.trip.id,
        origin: item.trip.origin,
        destination: item.trip.destination,
        region: item.trip.region,
        scheduledAt: item.trip.scheduledAt.toISOString(),
        vehicleCategory: item.trip.vehicleCategory,
        payoutAmount: item.trip.driverPayoutAmount,
        payoutCurrency: item.trip.driverPayoutCurrency,
      },
    };
  }

  @Post(":token/phone/request")
  async requestCode(
    @Param("token") token: string,
    @Body() body: { countryCode?: string; phoneNumber?: string },
  ) {
    const invitation = await this.details(token);
    const identity = parsePhoneIdentity(body);
    const existing = await prisma.driver.findFirst({
      where: {
        OR: [
          { phoneCountryCode: identity.countryCode, phone: identity.phoneNumber },
          ...(identity.countryCode === "+86"
            ? [{ mainlandPhone: identity.phoneNumber }]
            : [{ hongKongMacauCountryCode: identity.countryCode, hongKongMacauPhone: identity.phoneNumber }]),
        ],
      },
      select: { id: true },
    });
    if (existing)
      throw new HttpException("REGISTERED_DRIVER", HttpStatus.CONFLICT);
    const code = "00000";
    const challengeId = randomBytes(18).toString("hex");
    const expiresAt = new Date(Date.now() + PHONE_CODE_TTL_MS);
    await prisma.driverOtpChallenge.create({
      data: {
        id: challengeId,
        invitationOrderUrlId: invitation.invitation.id,
        countryCode: identity.countryCode,
        phone: identity.phoneNumber,
        codeHash: hashPassword(code),
        expiresAt,
      },
    });
    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
      ...(process.env.NODE_ENV !== "production" ? { developmentCode: code } : {}),
    };
  }

  @Post(":token/phone/verify")
  async verifyCode(
    @Param("token") token: string,
    @Body() body: { challengeId?: string; code?: string },
  ) {
    const invitation = await this.details(token);
    const challenge = await prisma.driverOtpChallenge.findUnique({
      where: { id: body.challengeId?.trim() || "" },
    });
    const code = body.code?.trim() || "";
    if (
      !challenge || challenge.driverId || challenge.consumedAt ||
      challenge.invitationOrderUrlId !== invitation.invitation.id ||
      challenge.expiresAt.getTime() <= Date.now() || code.length !== 5 ||
      !verifyPassword(code, challenge.codeHash)
    )
      throw new UnauthorizedException("Invalid invitation verification code");
    return { ok: true, challengeId: challenge.id, countryCode: challenge.countryCode, phone: challenge.phone };
  }

  @Post(":token/register-and-accept")
  @UseInterceptors(FileInterceptor("vehiclePhoto", {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
  }))
  async registerAndAccept(
    @Param("token") token: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() vehiclePhoto?: Express.Multer.File,
  ) {
    const preview = await this.details(token);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const { vehicleOwnership, plateType, hkPlate, macauPlate, mainlandPlate } = normalizeVehiclePlateData({
      ...body,
      vehicleOwnership: body.vehicleOwnership ?? "香港",
    });
    const vehicleCategory = typeof body.vehicleCategory === "string" ? body.vehicleCategory.trim() : "";
    const vehicleColor = typeof body.vehicleColor === "string" ? body.vehicleColor.trim() : "";
    if (!name || !vehicleCategory || !vehicleColor || !vehiclePhoto ||
        !validVehiclePlateData({ vehicleOwnership, plateType, hkPlate, macauPlate, mainlandPlate }))
      throw new HttpException("Valid driver registration fields and vehicle photo are required", HttpStatus.BAD_REQUEST);
    const identity = parsePhoneIdentity({
      countryCode: typeof body.phoneCountryCode === "string" ? body.phoneCountryCode : undefined,
      phoneNumber: typeof body.phone === "string" ? body.phone : undefined,
    });
    const hongKongMacauIdentity = parsePhoneIdentity({
      countryCode: typeof body.hongKongMacauCountryCode === "string" ? body.hongKongMacauCountryCode : undefined,
      phoneNumber: typeof body.hongKongMacauPhone === "string" ? body.hongKongMacauPhone : undefined,
    });
    const mainlandIdentity = parsePhoneIdentity({
      countryCode: "+86",
      phoneNumber: typeof body.mainlandPhone === "string" ? body.mainlandPhone : undefined,
    });
    if (!["+852", "+853"].includes(hongKongMacauIdentity.countryCode))
      throw new HttpException("Hong Kong/Macau phone country code must be +852 or +853", HttpStatus.BAD_REQUEST);
    const verifiedPhoneMatches = identity.countryCode === "+86"
      ? mainlandIdentity.phoneNumber === identity.phoneNumber
      : hongKongMacauIdentity.countryCode === identity.countryCode && hongKongMacauIdentity.phoneNumber === identity.phoneNumber;
    if (!verifiedPhoneMatches)
      throw new HttpException("Verified phone number must match the corresponding registration phone", HttpStatus.BAD_REQUEST);
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const challenge = await prisma.driverOtpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.driverId || challenge.consumedAt ||
        challenge.invitationOrderUrlId !== preview.invitation.id ||
        challenge.expiresAt.getTime() <= Date.now() ||
        challenge.countryCode !== identity.countryCode || challenge.phone !== identity.phoneNumber ||
        code.length !== 5 || !verifyPassword(code, challenge.codeHash))
      throw new UnauthorizedException("Invalid invitation verification code");
    const activeCategory = await prisma.vehicleCategory.findFirst({ where: { name: vehicleCategory, enabled: true }, select: { id: true } });
    if (!activeCategory)
      throw new HttpException("Vehicle category is not available", HttpStatus.BAD_REQUEST);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.tripOrderUrl.findUnique({ where: { id: preview.invitation.id } });
      const trip = await tx.trip.findUnique({ where: { id: preview.trip.id } });
      if (!item || !trip || item.usedAt || item.revokedAt || now < item.validFrom || now > item.validUntil ||
          trip.status !== "CONFIRMED" || trip.executionPhase !== "WAITING_DRIVER" || trip.driverId || trip.acceptedAt)
        throw new HttpException("Order invitation is no longer available", HttpStatus.CONFLICT);
      const existing = await tx.driver.findFirst({
        where: { OR: [
          { phoneCountryCode: identity.countryCode, phone: identity.phoneNumber },
          { hongKongMacauCountryCode: hongKongMacauIdentity.countryCode, hongKongMacauPhone: hongKongMacauIdentity.phoneNumber },
          { mainlandPhone: mainlandIdentity.phoneNumber },
        ] },
      });
      if (existing) throw new HttpException("REGISTERED_DRIVER", HttpStatus.CONFLICT);
      const driver = await tx.driver.create({ data: {
        id: `driver-${Date.now()}-${randomBytes(4).toString("hex")}`,
        driverType: "臨時司機",
        name,
        affiliation: vehicleOwnership,
        phoneCountryCode: identity.countryCode,
        phone: identity.phoneNumber,
        hongKongMacauCountryCode: hongKongMacauIdentity.countryCode,
        hongKongMacauPhone: hongKongMacauIdentity.phoneNumber,
        mainlandPhone: mainlandIdentity.phoneNumber,
        reviewStatus: "PROVISIONAL",
        reviewSubmittedAt: now,
      } });
      const vehicle = await tx.driverVehicle.create({ data: {
        id: `vehicle-${Date.now()}-${randomBytes(4).toString("hex")}`,
        vehicleOwnership, plateType, hkPlate: hkPlate || null, macauPlate: macauPlate || null,
        mainlandPlate: mainlandPlate || null, vehicleCategory, vehicleColor, vehiclePhotos: [],
        vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer), vehiclePhotoMime: vehiclePhoto.mimetype,
        assignments: { create: { driverId: driver.id, isPrimary: true } },
      } });
      const claimed = await tx.tripOrderUrl.updateMany({
        where: { id: item.id, usedAt: null, revokedAt: null },
        data: { usedAt: now, acceptedAt: now, reservedAt: item.reservedAt || now, driverId: driver.id, provisionalDriverId: driver.id },
      });
      if (claimed.count !== 1) throw new HttpException("Order invitation is no longer available", HttpStatus.CONFLICT);
      const accepted = await tx.trip.updateMany({
        where: { id: trip.id, driverId: null, status: "CONFIRMED", executionPhase: "WAITING_DRIVER", acceptedAt: null, completedAt: null },
        data: { driverId: driver.id, driverName: driver.name, driverPhone: `${driver.phoneCountryCode} ${driver.phone}`,
          ...tripVehicleSnapshot(vehicle), executionPhase: "DRIVER_ASSIGNED", assignedAt: now, acceptedAt: now },
      });
      if (accepted.count !== 1) throw new HttpException("Trip is no longer available", HttpStatus.CONFLICT);
      await tx.driverOtpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now, driverId: driver.id } });
      const exp = Math.min(item.validUntil.getTime(), now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const session: ProvisionalDriverSessionToken = {
        sub: driver.id, exp, jti: randomBytes(16).toString("hex"), orderUrlId: item.id, tripId: trip.id, scope: "ORDER_INVITE",
      };
      await tx.provisionalDriverSession.create({ data: {
        jti: session.jti, orderUrlId: item.id, tripId: trip.id, driverId: driver.id, expiresAt: new Date(exp),
      } });
      return { driver, session };
    });
    await publishDriverOrderEvent({ reason: "taken", tripId: preview.trip.id });
    return {
      token: provisionalDriverTokenFor(result.session),
      expiresAt: new Date(result.session.exp).toISOString(),
      driver: driverResponse(result.driver),
      tripId: preview.trip.id,
      scope: result.session.scope,
    };
  }

  private async scopedSession(req: RequestLike, token: string) {
    const session = await provisionalDriverSessionFrom(req);
    const item = await prisma.tripOrderUrl.findUnique({
      where: { tokenHash: orderUrlTokenHash(token) },
    });
    if (!item || item.id !== session.orderUrlId || item.tripId !== session.tripId)
      throw new ForbiddenException("Session is not valid for this invitation");
    const trip = await prisma.trip.findUnique({
      where: { id: session.tripId },
      include: { user: true, settlement: true },
    });
    if (!trip || trip.driverId !== session.sub)
      throw new ForbiddenException("Session is not valid for this trip");
    return { session, item, trip };
  }

  @Get(":token/session")
  async session(@Req() req: RequestLike, @Param("token") token: string) {
    const { trip } = await this.scopedSession(req, token);
    return invitationTripResponse(trip);
  }

  @Post(":token/trip/cancel")
  async cancel(@Req() req: RequestLike, @Param("token") token: string) {
    const { session, item, trip } = await this.scopedSession(req, token);
    if (trip.startedAt || trip.completedAt || trip.status === "CANCELLED")
      throw new HttpException("Trip cannot be cancelled after it starts", HttpStatus.CONFLICT);
    const cancelledAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const update = await tx.trip.updateMany({
        where: {
          id: trip.id,
          driverId: session.sub,
          startedAt: null,
          completedAt: null,
          status: { not: "CANCELLED" },
        },
        data: {
          status: "CANCELLED",
          executionPhase: null,
          cancelledAt,
          cancellationSource: "DRIVER",
        },
      });
      if (update.count !== 1)
        throw new HttpException("Trip cannot be cancelled after it starts", HttpStatus.CONFLICT);
      await tx.driverTripCancellation.create({
        data: { tripId: trip.id, driverId: session.sub, cancelledAt },
      });
      await tx.tripOrderUrl.update({
        where: { id: item.id },
        data: { revokedAt: cancelledAt },
      });
      return tx.trip.findUniqueOrThrow({
        where: { id: trip.id },
        include: { user: true, settlement: true },
      });
    });
    await publishDriverOrderEvent({ reason: "cancelled", tripId: trip.id });
    return invitationTripResponse(updated);
  }

  @Post(":token/trip/arrive")
  async arrive(@Req() req: RequestLike, @Param("token") token: string) {
    const { session, trip } = await this.scopedSession(req, token);
    if (!trip.acceptedAt || trip.startedAt || trip.completedAt || trip.status === "CANCELLED")
      throw new HttpException("Trip cannot be marked arrived", HttpStatus.CONFLICT);
    const update = await prisma.trip.updateMany({
      where: {
        id: trip.id,
        driverId: session.sub,
        acceptedAt: { not: null },
        startedAt: null,
        completedAt: null,
        status: { not: "CANCELLED" },
      },
      data: { arrivedAt: new Date() },
    });
    if (update.count !== 1)
      throw new HttpException("Trip cannot be marked arrived", HttpStatus.CONFLICT);
    const updated = await prisma.trip.findUniqueOrThrow({
      where: { id: trip.id },
      include: { user: true },
    });
    return invitationTripResponse(updated);
  }

  @Post(":token/trip/start")
  async start(@Req() req: RequestLike, @Param("token") token: string) {
    const { session, trip } = await this.scopedSession(req, token);
    if (!trip.acceptedAt || !trip.arrivedAt || trip.startedAt || trip.completedAt || trip.status === "CANCELLED")
      throw new HttpException("Trip cannot be started", HttpStatus.CONFLICT);
    const update = await prisma.trip.updateMany({
      where: {
        id: trip.id,
        driverId: session.sub,
        acceptedAt: { not: null },
        arrivedAt: { not: null },
        startedAt: null,
        completedAt: null,
        status: { not: "CANCELLED" },
      },
      data: { startedAt: new Date(), executionPhase: "IN_PROGRESS" },
    });
    if (update.count !== 1)
      throw new HttpException("Trip cannot be started", HttpStatus.CONFLICT);
    const updated = await prisma.trip.findUniqueOrThrow({
      where: { id: trip.id },
      include: { user: true },
    });
    return invitationTripResponse(updated);
  }

  @Post(":token/trip/complete")
  async complete(
    @Req() req: RequestLike,
    @Param("token") token: string,
  ) {
    const { session, item, trip } = await this.scopedSession(req, token);
    if (!trip.startedAt || trip.completedAt || trip.status === "CANCELLED")
      throw new HttpException("Trip cannot be completed", HttpStatus.CONFLICT);
    const updated = await prisma.$transaction(async (tx) => {
      const completedAt = new Date();
      const update = await tx.trip.updateMany({
        where: {
          id: trip.id,
          driverId: session.sub,
          startedAt: { not: null },
          completedAt: null,
          status: { not: "CANCELLED" },
        },
        data: { completedAt, status: "COMPLETED", executionPhase: null },
      });
      if (update.count !== 1)
        throw new HttpException("Trip cannot be completed", HttpStatus.CONFLICT);
      await tx.tripOrderUrl.update({
        where: { id: item.id },
        data: { completedAt },
      });
      const completed = await tx.trip.findUniqueOrThrow({
        where: { id: trip.id },
        include: { user: true, payment: true, settlement: true },
      });
      const mileageSettings = await tx.appSetting.findUniqueOrThrow({
        where: { id: appSettingsDefaults.id },
      });
      const spendPerKm = Math.max(0.01, mileageSettings.mileageSpendPerKm);
      const earned = completed.payment
        ? Math.max(0, Math.floor(Number(completed.payment.total) / spendPerKm))
        : 0;
      if (earned > 0) {
        const account = await tx.mileageAccount.upsert({
          where: { userId: completed.userId },
          create: { userId: completed.userId, balance: earned, lifetimeEarned: earned },
          update: { balance: { increment: earned }, lifetimeEarned: { increment: earned } },
        });
        await tx.mileageLedger.create({
          data: {
            userId: completed.userId,
            amount: earned,
            balanceAfter: account.balance,
            type: "EARN",
            reason: "完成跨境行程",
            tripId: completed.id,
            expiresAt: new Date(new Date().setMonth(new Date().getMonth() + mileageSettings.mileageValidityMonths)),
          },
        });
      }
      await rewardInvitation(tx, completed.userId, completed.id);
      return completed;
    });
    return invitationTripResponse(updated);
  }

  @Post(":token/trip/settlement")
  async submitSettlement(
    @Req() req: RequestLike,
    @Param("token") token: string,
    @Body() body: { settlementMethod?: unknown; settlementAccount?: unknown },
  ) {
    const settlementMethod = typeof body.settlementMethod === "string" ? body.settlementMethod.trim() : "";
    const settlementAccount = typeof body.settlementAccount === "string" ? body.settlementAccount.trim() : "";
    if (!settlementMethod)
      throw new HttpException("Settlement method is required", HttpStatus.BAD_REQUEST);
    if (!settlementAccount)
      throw new HttpException("Settlement account is required", HttpStatus.BAD_REQUEST);
    if (settlementMethod.length > 64 || settlementAccount.length > 128)
      throw new HttpException("Settlement details are too long", HttpStatus.BAD_REQUEST);
    const { session, trip } = await this.scopedSession(req, token);
    if (!trip.completedAt || trip.status !== "COMPLETED")
      throw new HttpException("Settlement is available after trip completion", HttpStatus.CONFLICT);
    if (trip.settlement)
      throw new HttpException("Settlement has already been submitted", HttpStatus.CONFLICT);
    await prisma.driverSettlement.create({
      data: {
        id: `settlement-${Date.now()}-${randomBytes(4).toString("hex")}`,
        tripId: trip.id,
        driverId: session.sub,
        method: `${settlementMethod}：${settlementAccount}`,
        settledAt: new Date(),
      },
    });
    const updated = await prisma.trip.findUniqueOrThrow({
      where: { id: trip.id },
      include: { user: true, settlement: true },
    });
    return invitationTripResponse(updated);
  }

  @Post(":token/formal-review")
  async submitFormalReview(@Req() req: RequestLike, @Param("token") token: string) {
    const { session, trip } = await this.scopedSession(req, token);
    if (!trip.completedAt || trip.status !== "COMPLETED")
      throw new HttpException("Formal review is available after trip completion", HttpStatus.CONFLICT);
    const driver = await prisma.driver.findUnique({ where: { id: session.sub } });
    if (!driver || driver.reviewStatus !== "PROVISIONAL")
      throw new HttpException("Driver is not eligible for formal review", HttpStatus.CONFLICT);
    const updated = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        driverType: "正式司機",
        reviewStatus: "PENDING",
        reviewReason: null,
        reviewSubmittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        isOnline: false,
      },
    });
    return driverResponse(updated);
  }
}

@Controller("driver/order-urls")
class DriverOrderUrlController {
  @Get(":token")
  async details(@Req() req: RequestLike, @Param("token") token: string) {
    const { session } = await reviewedDriverFrom(req);
    await requireActiveDriverVehicle(prisma, session.sub);
    const item = await prisma.tripOrderUrl.findUnique({
      where: { tokenHash: orderUrlTokenHash(token) },
      include: {
        trip: { include: { user: true, driver: true } },
        driver: true,
      },
    });
    if (!item)
      throw new HttpException("Order URL not found", HttpStatus.NOT_FOUND);
    const now = new Date();
    if (
      item.revokedAt ||
      item.usedAt ||
      now < item.validFrom ||
      now > item.validUntil
    )
      throw new HttpException("Order URL has expired", HttpStatus.GONE);
    if (item.driverId && item.driverId !== session.sub)
      throw new ForbiddenException("Order URL is assigned to another driver");
    if (item.trip.driverId && item.trip.driverId !== session.sub)
      throw new HttpException(
        "Trip has been accepted by another driver",
        HttpStatus.CONFLICT,
      );
    if (tripOfferIsExpired(item.trip.scheduledAt, now))
      throw new HttpException("Trip offer has expired", HttpStatus.GONE);
    return {
      token,
      validFrom: item.validFrom.toISOString(),
      validUntil: item.validUntil.toISOString(),
      driverId: item.driverId,
      trip: tripResponse(item.trip),
    };
  }

  @Post(":token/accept")
  async accept(
    @Req() req: RequestLike,
    @Param("token") token: string,
    @Body() body: { vehicleId?: unknown },
  ) {
    const { session } = await reviewedDriverFrom(req);
    const requestedVehicleId =
      typeof body.vehicleId === "string" && body.vehicleId.trim()
        ? body.vehicleId.trim()
        : undefined;
    if (body.vehicleId !== undefined && !requestedVehicleId)
      throw new HttpException("Valid vehicleId is required", HttpStatus.BAD_REQUEST);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.tripOrderUrl.findUnique({
        where: { tokenHash: orderUrlTokenHash(token) },
      });
      if (!item)
        throw new HttpException("Order URL not found", HttpStatus.NOT_FOUND);
      if (
        item.revokedAt ||
        item.usedAt ||
        now < item.validFrom ||
        now > item.validUntil
      )
        throw new HttpException("Order URL has expired", HttpStatus.GONE);
      if (item.driverId && item.driverId !== session.sub)
        throw new ForbiddenException("Order URL is assigned to another driver");
      const driver = await tx.driver.findUnique({ where: { id: session.sub } });
      if (!driver) throw new UnauthorizedException("Driver not found");
      const assignedVehicle = await requireActiveDriverVehicle(
        tx,
        driver.id,
        requestedVehicleId,
      );
      const trip = await tx.trip.findUnique({ where: { id: item.tripId } });
      if (
        !trip ||
        trip.status === "COMPLETED" ||
        trip.status === "CANCELLED" ||
        trip.executionPhase === "IN_PROGRESS"
      )
        throw new HttpException("Trip is not available", HttpStatus.CONFLICT);
      if (tripOfferIsExpired(trip.scheduledAt, now))
        throw new HttpException("Trip offer has expired", HttpStatus.GONE);
      if (!item.driverId && trip.driverId && trip.driverId !== driver.id)
        throw new HttpException(
          "Trip has been accepted by another driver",
          HttpStatus.CONFLICT,
        );
      if (item.driverId && trip.driverId && trip.driverId !== driver.id)
        throw new HttpException(
          "Trip has been accepted by another driver",
          HttpStatus.CONFLICT,
        );
      const claimed = await tx.tripOrderUrl.updateMany({
        where: { id: item.id, usedAt: null, revokedAt: null },
        data: { usedAt: now, driverId: driver.id },
      });
      if (claimed.count !== 1)
        throw new HttpException(
          "Order URL is no longer available",
          HttpStatus.CONFLICT,
        );
      const accepted = await tx.trip.updateMany({
        where: {
          id: trip.id,
          driverId: trip.driverId,
          status: "CONFIRMED",
          acceptedAt: null,
          completedAt: null,
          scheduledAt: { gt: tripOfferCutoff(now) },
        },
        data: {
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: `${driver.phoneCountryCode} ${driver.phone}`,
          ...tripVehicleSnapshot(assignedVehicle),
          status: "CONFIRMED",
          executionPhase: "DRIVER_ASSIGNED",
          assignedAt: now,
          acceptedAt: now,
        },
      });
      if (accepted.count !== 1)
        throw new HttpException(
          "Trip is no longer available",
          HttpStatus.CONFLICT,
        );
      return tx.trip.findUniqueOrThrow({
        where: { id: trip.id },
        include: { user: true, driver: true },
      });
    });
    await publishDriverOrderEvent({ reason: "taken", tripId: result.id });
    return driverTripResponse(result, true);
  }
}

@Controller("support")
class SupportController {
  @Post("session")
  async session(@Body() body: { riderId?: string; displayName?: string }) {
    const riderId = body.riderId?.trim();
    if (!riderId || riderId.length > 100)
      throw new HttpException(
        "Valid riderId is required",
        HttpStatus.BAD_REQUEST,
      );
    const conversation = await masterBoxRequest<MasterBoxConversation>(
      "/conversations",
      {
        method: "POST",
        body: JSON.stringify({
          externalId: `master-travel-project:${riderId}`,
          subject: "Master Travel Project 客戶服務",
          metadata: {
            source: "master-travel-project-service",
            riderId,
            displayName: body.displayName?.trim().slice(0, 80) || undefined,
          },
        }),
      },
    );
    const exp = Date.now() + 8 * 60 * 60 * 1000;
    return {
      token: supportTokenFor({ conversationId: conversation.id, riderId, exp }),
      expiresAt: new Date(exp).toISOString(),
    };
  }

  @Get("messages")
  async messages(@Req() req: RequestLike) {
    const { conversationId } = supportSessionFrom(req);
    const conversation = await masterBoxRequest<MasterBoxConversation>(
      `/conversations/${encodeURIComponent(conversationId)}`,
    );
    return { data: conversation.messages || [] };
  }

  @Post("messages")
  async send(
    @Req() req: RequestLike,
    @Body() body: { text?: string; clientId?: string },
  ) {
    const { conversationId } = supportSessionFrom(req);
    const text = body.text?.trim();
    if (!text || text.length > 2000)
      throw new HttpException(
        "Message must contain 1–2000 characters",
        HttpStatus.BAD_REQUEST,
      );
    return masterBoxRequest<MasterBoxMessage>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          externalId: body.clientId,
          direction: "inbound",
          content: { type: "text", text },
        }),
      },
    );
  }
}

@Controller("admin/auth")
class AdminAuthController {
  @Post("login") async login(
    @Req() req: RequestLike,
    @Res({ passthrough: true }) response: Response,
    @Body() body: { username?: string; password?: string },
  ) {
    const username = body.username?.trim() || "";
    const admin = administrators.find(
      (item) => item.username.toLowerCase() === username.toLowerCase(),
    );
    const timestamp = Date.now();
    clearExpiredLoginAttempts(timestamp);
    const lockedUntil = admin?.lockedUntil
      ? new Date(admin.lockedUntil).getTime()
      : 0;
    const accountLocked = lockedUntil > timestamp;
    const blocked = accountLocked || isLoginBlocked(req, username, timestamp);
    const passwordMatches = body.password
      ? verifyPassword(body.password, admin?.passwordHash || fallbackAdminPasswordHash)
      : false;
    if (blocked || !admin || !admin.enabled || !passwordMatches) {
      const failures = accountLocked
        ? admin!.failedLoginAttempts
        : blocked
          ? ADMIN_LOGIN_MAX_FAILURES
          : recordLoginFailure(req, username, timestamp);
      if (admin && !blocked && !accountLocked) {
        admin.failedLoginAttempts = failures;
        admin.lockedUntil =
          failures >= ADMIN_LOGIN_MAX_FAILURES
            ? new Date(timestamp + ADMIN_LOGIN_WINDOW_MS).toISOString()
            : null;
      }
      if (admin)
        await prisma.administrator.update({
          where: { id: admin.id },
          data: {
            failedLoginAttempts: admin.failedLoginAttempts,
            lockedUntil: admin.lockedUntil ? new Date(admin.lockedUntil) : null,
          },
        });
      persistAudit({
        id: `audit-${Date.now()}-${randomBytes(3).toString("hex")}`,
        administratorId: admin?.id || null,
        username: username || "anonymous",
        action: "LOGIN",
        resource: "/admin/auth/login",
        method: "POST",
        status: "FAILED",
        ip: req.ip || "",
        createdAt: new Date().toISOString(),
      });
      await wait(loginFailureDelay(failures));
      throw new UnauthorizedException("Invalid admin credentials");
    }
    clearLoginFailures(req, username);
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.lastLoginAt = new Date().toISOString();
    await prisma.administrator.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(admin.lastLoginAt),
      },
    });
    const token = await tokenFor(admin);
    const csrfToken = randomBytes(32).toString("base64url");
    response.cookie(ADMIN_SESSION_COOKIE, token, cookieOptions(req, true));
    response.cookie(ADMIN_CSRF_COOKIE, csrfToken, cookieOptions(req, false));
    persistAudit({
      id: `audit-${Date.now()}-${randomBytes(3).toString("hex")}`,
      administratorId: admin.id,
      username: admin.username,
      action: "LOGIN",
      resource: "/admin/auth/login",
      method: "POST",
      status: "SUCCESS",
      ip: req.ip || "",
      createdAt: admin.lastLoginAt,
    });
    return {
      expiresIn: 28800,
      administrator: publicAdministrator(admin),
    };
  }
  @Get("me") me(@Req() req: RequestLike) {
    const session = requireAuth(req);
    const admin = administrators.find((item) => item.id === session.sub)!;
    return publicAdministrator(admin);
  }
  @Post("logout") async logout(
    @Req() req: RequestLike,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = requireAuth(req);
    revokedAdminSessions.set(session.jti, session.exp);
    await prisma.adminSession.updateMany({
      where: { jti: session.jti, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "logout" },
    });
    response.clearCookie(ADMIN_SESSION_COOKIE, cookieOptions(req, true, 0));
    response.clearCookie(ADMIN_CSRF_COOKIE, cookieOptions(req, false, 0));
    return { ok: true };
  }
}
@Controller("admin")
class AdminController {
  @Get("drivers") async listDrivers(@Req() req: RequestLike) {
    requireAuth(req);
    const query = parseAdminListQuery(req);
    const enabledQuery = adminQueryBoolean(req, "enabled");
    const statusFilter = adminQueryValue(req, "status");
    const enabled = enabledQuery ?? (statusFilter === "ENABLED" ? true : statusFilter === "DISABLED" ? false : undefined);
    const reviewStatus = adminQueryValue(req, "reviewStatus");
    const driverType = adminQueryValue(req, "driverType") || adminQueryValue(req, "type");
    const online = adminQueryBoolean(req, "isOnline");
    const where: Prisma.DriverWhereInput = {
      ...(enabled === undefined ? {} : { enabled }),
      ...(online === undefined ? {} : { isOnline: online }),
      ...(reviewStatus && reviewStatus !== "全部" ? { reviewStatus } : {}),
      ...(driverType && driverType !== "全部" ? { driverType } : {}),
      ...(query.search
        ? {
            OR: [
              { id: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } },
              { affiliation: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
              { mainlandPhone: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [data, total, all, enabledCount, onlineCount, pendingReviewCount, revisionReviewCount, approvedReviewCount] =
      await prisma.$transaction([
        prisma.driver.findMany({
          where,
          select: {
            id: true,
            driverType: true,
            name: true,
            affiliation: true,
            phoneCountryCode: true,
            phone: true,
            hongKongMacauCountryCode: true,
            hongKongMacauPhone: true,
            mainlandPhone: true,
            reviewStatus: true,
            reviewReason: true,
            reviewSubmittedAt: true,
            reviewedAt: true,
            reviewedBy: true,
            settlementMethod: true,
            settlementAccount: true,
            wechatId: true,
            wechatQrCodeMime: true,
            isOnline: true,
            enabled: true,
            createdAt: true,
            updatedAt: true,
            vehicleAssignments: {
              where: { enabled: true },
              select: {
                isPrimary: true,
                vehicle: {
                  select: {
                    id: true,
                    plateType: true,
                    hkPlate: true,
                    mainlandPlate: true,
                    macauPlate: true,
                    vehicleOwnership: true,
                    vehicleCategory: true,
                    vehicleColor: true,
                    vehiclePhotos: true,
                    vehiclePhotoMime: true,
                    enabled: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            },
          },
          orderBy: [{ createdAt: query.sortOrder }, { id: query.sortOrder }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        prisma.driver.count({ where }),
        prisma.driver.count(),
        prisma.driver.count({ where: { enabled: true } }),
        prisma.driver.count({ where: { enabled: true, isOnline: true } }),
        prisma.driver.count({ where: { reviewStatus: "PENDING" } }),
        prisma.driver.count({ where: { reviewStatus: "REVISION_REQUIRED" } }),
        prisma.driver.count({ where: { reviewStatus: "APPROVED" } }),
      ]);
    return adminListResponse(
      data.map((driver) => ({
        ...driverResponse(driver),
        vehicles: driver.vehicleAssignments.map(({ vehicle, isPrimary }) => ({
          ...driverVehicleResponse(vehicle),
          isPrimary,
        })),
      })),
      total,
      query,
      {
        total: all,
        enabled: enabledCount,
        online: onlineCount,
        pendingReview: pendingReviewCount,
        revisionRequired: revisionReviewCount,
        approved: approvedReviewCount,
      },
    );
  }
  @Get("drivers/options") async listDriverOptions(@Req() req: RequestLike) {
    requireAuth(req);
    const query = parseAdminListQuery(req, 20);
    const where: Prisma.DriverWhereInput = query.search ? { OR: [
      { id: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { mainlandPhone: { contains: query.search, mode: "insensitive" } },
    ] } : {};
    const [data, total] = await prisma.$transaction([
      prisma.driver.findMany({
        where,
        select: {
          id: true,
          name: true,
          phoneCountryCode: true,
          phone: true,
          mainlandPhone: true,
          reviewStatus: true,
          settlementMethod: true,
          isOnline: true,
          enabled: true,
          vehicleAssignments: {
            where: { enabled: true, vehicle: { enabled: true } },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: 1,
            select: {
              isPrimary: true,
              vehicle: { select: { hkPlate: true, macauPlate: true, mainlandPlate: true } },
            },
          },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.driver.count({ where }),
    ]);
    return adminListResponse(
      data.map(({ vehicleAssignments, ...driver }) => ({
        ...driver,
        vehicles: vehicleAssignments.map(({ vehicle, isPrimary }) => ({ ...vehicle, isPrimary })),
      })),
      total,
      query,
    );
  }
  @Get("driver-vehicles") async listAllVehicles(@Req() req: RequestLike) {
    requireAuth(req);
    const data = await prisma.driverVehicle.findMany({
      include: { assignments: { where: { enabled: true }, include: { driver: { select: { id: true, name: true, phone: true, enabled: true } } }, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    return { data: data.map(vehicle => ({ ...driverVehicleResponse(vehicle), assignments: vehicle.assignments.map(({ driver, ...assignment }) => ({ ...assignment, driver })) })), total: data.length };
  }

  @Get("drivers/:id/vehicle-photo") async adminDriverVehiclePhoto(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    requireAuth(req);
    const vehicle = await primaryDriverVehicle(prisma, id);
    if (!vehicle?.vehiclePhotoData || !vehicle.vehiclePhotoMime) throw new HttpException("Vehicle photo not found", HttpStatus.NOT_FOUND);
    response.type(vehicle.vehiclePhotoMime).send(Buffer.from(vehicle.vehiclePhotoData));
  }

  @Get("drivers/:id/trips") async listDriverTrips(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    if (!(await prisma.driver.findUnique({ where: { id }, select: { id: true } })))
      throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    const page = Math.max(1, Number.parseInt(req.query?.page || "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query?.pageSize || "10", 10) || 10),
    );
    const where: Prisma.TripWhereInput = { driverId: id };
    const [data, total] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        include: { user: true, payment: true, settlement: true },
        orderBy: [
          { acceptedAt: { sort: "desc", nulls: "last" } },
          { assignedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.trip.count({ where }),
    ]);
    return {
      data: data.map(({ user, ...trip }) => ({
        ...trip,
        user: userResponse(user),
      })),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  @Get("drivers/:id/vehicles") async listDriverVehicles(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    const assignments = await prisma.driverVehicleAssignment.findMany({
      where: { driverId: id, enabled: true },
      include: { vehicle: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return {
      data: assignments.map(({ vehicle, isPrimary }) => ({
        ...driverVehicleResponse(vehicle),
        isPrimary,
      })),
      total: assignments.length,
    };
  }
  @Post("drivers/:driverId/vehicles/:id/bind") async bindDriverVehicle(
    @Req() req: RequestLike,
    @Param("driverId") driverId: string,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const [driver, vehicle] = await Promise.all([
      prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, enabled: true, reviewStatus: true } }),
      prisma.driverVehicle.findUnique({ where: { id }, select: { id: true, enabled: true } }),
    ]);
    if (!driver || !vehicle) throw new HttpException("Driver or vehicle not found", HttpStatus.NOT_FOUND);
    requireReviewedDriver(driver);
    if (!vehicle.enabled) throw new HttpException("Vehicle is disabled", HttpStatus.CONFLICT);
    await prisma.$transaction(async (tx) => {
      const primary = await tx.driverVehicleAssignment.findFirst({
        where: { driverId, enabled: true, isPrimary: true, vehicle: { enabled: true } },
        select: { id: true },
      });
      await tx.driverVehicleAssignment.upsert({
        where: { driverId_vehicleId: { driverId, vehicleId: id } },
        create: { driverId, vehicleId: id, isPrimary: !primary },
        update: { enabled: true, ...(!primary ? { isPrimary: true } : {}) },
      });
    });
    return driverVehicleResponse(await prisma.driverVehicle.findUniqueOrThrow({ where: { id } }));
  }
  @Post("driver-vehicles")
  @UseInterceptors(FileInterceptor("vehiclePhoto", { limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)) }))
  async createAdminVehicle(
    @Req() req: RequestLike,
    @Body() body: Partial<Prisma.DriverVehicleCreateInput> & { driverId?: string; removeVehiclePhoto?: string },
    @UploadedFile() vehiclePhoto?: Express.Multer.File,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    if (!body.plateType || !body.vehicleCategory || !body.vehicleColor) throw new HttpException("Valid vehicle fields are required", HttpStatus.BAD_REQUEST);
    const normalized = normalizeVehiclePlateData({ ...body, vehicleOwnership: body.vehicleOwnership || "香港" });
    const assignedDriver = body.driverId
      ? await prisma.driver.findUnique({
          where: { id: body.driverId },
          select: { id: true, enabled: true, reviewStatus: true },
        })
      : null;
    if (body.driverId && !assignedDriver)
      throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    if (assignedDriver) requireReviewedDriver(assignedDriver);
    const vehicle = await prisma.driverVehicle.create({ data: {
      id: `vehicle-${Date.now()}-${randomBytes(4).toString("hex")}`,
      plateType: normalized.plateType, hkPlate: normalized.hkPlate || null, macauPlate: normalized.macauPlate || null,
      mainlandPlate: normalized.mainlandPlate || null, vehicleOwnership: normalized.vehicleOwnership,
      vehicleCategory: String(body.vehicleCategory).trim(), vehicleColor: String(body.vehicleColor).trim(), vehiclePhotos: [],
      ...(vehiclePhoto ? { vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer), vehiclePhotoMime: vehiclePhoto.mimetype } : {}),
    } });
    if (body.driverId) {
      await prisma.$transaction(async (tx) => {
        const primary = await tx.driverVehicleAssignment.findFirst({
          where: { driverId: body.driverId, enabled: true, isPrimary: true, vehicle: { enabled: true } },
          select: { id: true },
        });
        await tx.driverVehicleAssignment.create({
          data: { driverId: body.driverId!, vehicleId: vehicle.id, isPrimary: !primary },
        });
      });
    }
    return driverVehicleResponse(vehicle);
  }
  @Patch("driver-vehicles/:id")
  @UseInterceptors(FileInterceptor("vehiclePhoto", { limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)) }))
  async updateAdminVehicle(@Req() req: RequestLike, @Param("id") id: string, @Body() body: Partial<Prisma.DriverVehicleCreateInput> & { removeVehiclePhoto?: string }, @UploadedFile() vehiclePhoto?: Express.Multer.File) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    if (!body.plateType || !body.vehicleCategory || !body.vehicleColor) throw new HttpException("Valid vehicle fields are required", HttpStatus.BAD_REQUEST);
    const normalized = normalizeVehiclePlateData({ ...body, vehicleOwnership: body.vehicleOwnership || "香港" });
    const result = await prisma.driverVehicle.updateMany({ where: { id }, data: {
      plateType: normalized.plateType, hkPlate: normalized.hkPlate || null, macauPlate: normalized.macauPlate || null,
      mainlandPlate: normalized.mainlandPlate || null, vehicleOwnership: normalized.vehicleOwnership,
      vehicleCategory: String(body.vehicleCategory).trim(), vehicleColor: String(body.vehicleColor).trim(), vehiclePhotos: [],
      ...(vehiclePhoto ? { vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer), vehiclePhotoMime: vehiclePhoto.mimetype } : {}),
      ...(body.removeVehiclePhoto === "true" ? { vehiclePhotoData: null, vehiclePhotoMime: null } : {}),
    } });
    if (!result.count) throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
    return driverVehicleResponse(await prisma.driverVehicle.findUniqueOrThrow({ where: { id } }));
  }
  @Post("driver-vehicles/:id/status") async updateAdminVehicleStatus(@Req() req: RequestLike, @Param("id") id: string, @Body() body: { enabled?: boolean }) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    if (typeof body.enabled !== "boolean") throw new HttpException("Enabled status is required", HttpStatus.BAD_REQUEST);
    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.driverVehicle.findUnique({ where: { id }, select: { id: true } });
      if (!vehicle) throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
      const affected = await tx.driverVehicleAssignment.findMany({
        where: {
          vehicleId: id,
          enabled: true,
          ...(!body.enabled ? { isPrimary: true } : {}),
        },
        select: { driverId: true },
      });
      await tx.driverVehicle.update({ where: { id }, data: { enabled: body.enabled } });
      for (const { driverId } of affected) {
        if (body.enabled) await ensurePrimaryDriverVehicle(tx, driverId);
        else await promotePrimaryDriverVehicle(tx, driverId);
      }
    });
    return driverVehicleResponse(await prisma.driverVehicle.findUniqueOrThrow({ where: { id } }));
  }
  @Delete("driver-vehicles/:id") async deleteAdminVehicle(@Req() req: RequestLike, @Param("id") id: string) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.driverVehicle.findUnique({ where: { id }, select: { id: true } });
      if (!vehicle) throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
      const affected = await tx.driverVehicleAssignment.findMany({
        where: { vehicleId: id, enabled: true, isPrimary: true },
        select: { driverId: true },
      });
      await tx.driverVehicle.delete({ where: { id } });
      for (const { driverId } of affected) await promotePrimaryDriverVehicle(tx, driverId);
    });
    return { ok: true };
  }
  @Get("driver-vehicles/:id/photo/thumbnail") async adminVehiclePhotoThumbnail(@Req() req: RequestLike, @Param("id") id: string, @Res() response: Response) {
    requireAuth(req);
    const vehicle = await prisma.driverVehicle.findUnique({ where: { id }, select: { vehiclePhotoData: true, vehiclePhotoMime: true, updatedAt: true } });
    if (!vehicle?.vehiclePhotoData || !vehicle.vehiclePhotoMime) throw new HttpException("Vehicle photo not found", HttpStatus.NOT_FOUND);
    const etag = `\"${createHash("sha256").update(vehicle.vehiclePhotoData).update("vehicle-thumbnail-v1").digest("base64url")}\"`;
    response.setHeader("Cache-Control", "private, max-age=300");
    response.setHeader("ETag", etag);
    response.setHeader("Last-Modified", vehicle.updatedAt.toUTCString());
    if (req.headers["if-none-match"] === etag) {
      response.status(HttpStatus.NOT_MODIFIED).send();
      return;
    }
    const thumbnail = await sharp(Buffer.from(vehicle.vehiclePhotoData))
      .rotate()
      .resize({ width: 320, height: 240, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    response.type("image/webp").send(thumbnail);
  }
  @Get("driver-vehicles/:id/photo") async adminVehiclePhoto(@Req() req: RequestLike, @Param("id") id: string, @Res() response: Response) {
    requireAuth(req);
    const vehicle = await prisma.driverVehicle.findUnique({ where: { id }, select: { vehiclePhotoData: true, vehiclePhotoMime: true } });
    if (!vehicle?.vehiclePhotoData || !vehicle.vehiclePhotoMime) throw new HttpException("Vehicle photo not found", HttpStatus.NOT_FOUND);
    response.type(vehicle.vehiclePhotoMime).send(Buffer.from(vehicle.vehiclePhotoData));
  }
  @Get("driver-vehicles/:id/assignments") async listVehicleAssignments(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    const assignments = await prisma.driverVehicleAssignment.findMany({
      where: { vehicleId: id, enabled: true },
      include: { driver: { select: { id: true, name: true, phone: true, enabled: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { data: assignments.map(({ driver, ...assignment }) => ({ ...assignment, driver })), total: assignments.length };
  }
  @Post("drivers/:driverId/vehicles/:id/primary") async setPrimaryDriverVehicle(
    @Req() req: RequestLike,
    @Param("driverId") driverId: string,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, enabled: true, reviewStatus: true },
    });
    if (!driver) throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    requireReviewedDriver(driver);
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.driverVehicleAssignment.findUnique({
        where: { driverId_vehicleId: { driverId, vehicleId: id } },
        select: { id: true, enabled: true, vehicle: { select: { enabled: true } } },
      });
      if (!assignment?.enabled || !assignment.vehicle.enabled)
        throw new HttpException("Active vehicle binding not found", HttpStatus.NOT_FOUND);
      await tx.driverVehicleAssignment.updateMany({
        where: { driverId },
        data: { isPrimary: false },
      });
      await tx.driverVehicleAssignment.update({
        where: { id: assignment.id },
        data: { isPrimary: true },
      });
    });
    return { ok: true };
  }
  @Delete("drivers/:driverId/vehicles/:id/bind") async unbindDriverVehicle(
    @Req() req: RequestLike,
    @Param("driverId") driverId: string,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.driverVehicleAssignment.findUnique({
        where: { driverId_vehicleId: { driverId, vehicleId: id } },
        select: { id: true, enabled: true, isPrimary: true },
      });
      if (!assignment?.enabled)
        throw new HttpException("Vehicle binding not found", HttpStatus.NOT_FOUND);
      await tx.driverVehicleAssignment.update({
        where: { id: assignment.id },
        data: { enabled: false, isPrimary: false },
      });
      if (assignment.isPrimary) await promotePrimaryDriverVehicle(tx, driverId);
    });
    return { ok: true };
  }
  @Post("drivers/:id/vehicles")
  @UseInterceptors(FileInterceptor("vehiclePhoto", { limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)) }))
  async saveDriverVehicle(
    @Req() req: RequestLike,
    @Param("id") driverId: string,
    @Body() body: Partial<Prisma.DriverVehicleCreateInput> & { id?: string; removeVehiclePhoto?: string },
    @UploadedFile() vehiclePhoto?: Express.Multer.File,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, enabled: true, reviewStatus: true },
    });
    if (!driver) throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    requireReviewedDriver(driver);
    if (!body.plateType || !body.vehicleCategory || !body.vehicleColor)
      throw new HttpException("Valid vehicle fields are required", HttpStatus.BAD_REQUEST);
    const normalized = normalizeVehiclePlateData({ ...body, vehicleOwnership: body.vehicleOwnership || "香港" });
    const data = {
      plateType: normalized.plateType,
      hkPlate: normalized.hkPlate || null,
      macauPlate: normalized.macauPlate || null,
      mainlandPlate: normalized.mainlandPlate || null,
      vehicleOwnership: normalized.vehicleOwnership,
      vehicleCategory: body.vehicleCategory.trim(),
      vehicleColor: body.vehicleColor.trim(),
      vehiclePhotos: [],
      ...(vehiclePhoto ? { vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer), vehiclePhotoMime: vehiclePhoto.mimetype } : {}),
      ...(body.removeVehiclePhoto === "true" ? { vehiclePhotoData: null, vehiclePhotoMime: null } : {}),
    };
    const vehicle = body.id
      ? await prisma.driverVehicle.updateMany({
          where: { id: body.id, assignments: { some: { driverId, enabled: true } } },
          data,
        })
      : null;
    if (body.id) {
      if (!vehicle?.count) throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
      return driverVehicleResponse(await prisma.driverVehicle.findUniqueOrThrow({ where: { id: body.id } }));
    }
    const createdVehicle = await prisma.$transaction(async (tx) => {
      const primary = await tx.driverVehicleAssignment.findFirst({
        where: { driverId, enabled: true, isPrimary: true, vehicle: { enabled: true } },
        select: { id: true },
      });
      const created = await tx.driverVehicle.create({ data: { id: `vehicle-${Date.now()}-${randomBytes(4).toString("hex")}`, ...data } });
      await tx.driverVehicleAssignment.create({
        data: { driverId, vehicleId: created.id, isPrimary: !primary },
      });
      return created;
    });
    return driverVehicleResponse(createdVehicle);
  }
  @Post("drivers/:driverId/vehicles/:id/status") async updateDriverVehicleStatus(
    @Req() req: RequestLike,
    @Param("driverId") driverId: string,
    @Param("id") id: string,
    @Body() body: { enabled?: boolean },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    if (typeof body.enabled !== "boolean") throw new HttpException("Enabled status is required", HttpStatus.BAD_REQUEST);
    const assignment = await prisma.driverVehicleAssignment.findFirst({
      where: { driverId, vehicleId: id, enabled: true },
      select: { id: true },
    });
    if (!assignment) throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
    return this.updateAdminVehicleStatus(req, id, body);
  }
  @Delete("drivers/:driverId/vehicles/:id") async deleteDriverVehicle(
    @Req() req: RequestLike,
    @Param("driverId") driverId: string,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const assignment = await prisma.driverVehicleAssignment.findFirst({
      where: { driverId, vehicleId: id, enabled: true },
      select: { id: true },
    });
    if (!assignment) throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
    return this.deleteAdminVehicle(req, id);
  }
  @Get("drivers/:driverId/vehicles/:id/photo") async driverVehiclePhoto(
    @Req() req: RequestLike,
    @Param("driverId") driverId: string,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    requireAuth(req);
    const vehicle = await prisma.driverVehicle.findFirst({ where: { id, assignments: { some: { driverId, enabled: true } } }, select: { vehiclePhotoData: true, vehiclePhotoMime: true } });
    if (!vehicle?.vehiclePhotoData || !vehicle.vehiclePhotoMime) throw new HttpException("Vehicle photo not found", HttpStatus.NOT_FOUND);
    response.type(vehicle.vehiclePhotoMime).send(Buffer.from(vehicle.vehiclePhotoData));
  }
  @Post("drivers/:id/review/approve") async approveDriver(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    const session = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    if (!["PENDING", "REVISION_REQUIRED"].includes(existing.reviewStatus))
      throw new HttpException(
        "Driver registration cannot be approved from its current status",
        HttpStatus.CONFLICT,
      );
    const driver = await prisma.driver.update({
      where: { id },
      data: {
        reviewStatus: "APPROVED",
        reviewReason: null,
        reviewedAt: new Date(),
        reviewedBy: session.sub,
      },
    });
    return driverResponse(driver);
  }
  @Post("drivers/:id/review/revision") async requestDriverRevision(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { reason?: unknown },
  ) {
    const session = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason)
      throw new HttpException(
        "Review reason is required",
        HttpStatus.BAD_REQUEST,
      );
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    if (existing.reviewStatus !== "PENDING")
      throw new HttpException(
        "Only pending registrations can be returned for revision",
        HttpStatus.CONFLICT,
      );
    const driver = await prisma.driver.update({
      where: { id },
      data: {
        reviewStatus: "REVISION_REQUIRED",
        reviewReason: reason,
        reviewedAt: new Date(),
        reviewedBy: session.sub,
        isOnline: false,
      },
    });
    return driverResponse(driver);
  }
  @Post("drivers/:id/review/reject") async rejectDriver(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { reason?: unknown },
  ) {
    const session = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason)
      throw new HttpException(
        "Review reason is required",
        HttpStatus.BAD_REQUEST,
      );
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    if (!["PENDING", "REVISION_REQUIRED"].includes(existing.reviewStatus))
      throw new HttpException(
        "Driver registration cannot be rejected from its current status",
        HttpStatus.CONFLICT,
      );
    const driver = await prisma.driver.update({
      where: { id },
      data: {
        reviewStatus: "REJECTED",
        reviewReason: reason,
        reviewedAt: new Date(),
        reviewedBy: session.sub,
        isOnline: false,
      },
    });
    return driverResponse(driver);
  }
  @Post("drivers")
  @UseInterceptors(
    FileInterceptor("vehiclePhoto", {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
    }),
  )
  async saveDriver(
    @Req() req: RequestLike,
    @Body()
    body: Partial<Prisma.DriverCreateInput> & Record<string, unknown> & {
      id?: string;
      removeVehiclePhoto?: string;
    },
    @UploadedFile() vehiclePhoto?: Express.Multer.File,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    if (!validDriverPayload(body))
      throw new HttpException(
        "Valid driver fields are required",
        HttpStatus.BAD_REQUEST,
      );
    const normalized = normalizeVehiclePlateData({
      ...body,
      vehicleOwnership: body.vehicleOwnership || "香港",
    });
    const data = {
      driverType: body.driverType?.trim() || "內部司機",
      name: body.name!.trim(),
      affiliation: body.affiliation!.trim(),
      phoneCountryCode: body.phoneCountryCode?.trim() || "+852",
      phone: body.phone!.trim(),
      settlementMethod: body.settlementMethod?.trim() || null,
      settlementAccount: body.settlementAccount?.trim() || null,
    };
    const driver = await prisma.$transaction(async (tx) => {
      const savedDriver = body.id
        ? await tx.driver.update({ where: { id: body.id }, data })
        : await tx.driver.create({
            data: {
              id: `driver-${Date.now()}-${randomBytes(4).toString("hex")}`,
              ...data,
            },
          });
      const existingVehicle = await primaryDriverVehicle(tx, savedDriver.id);
      const vehicleData = {
        plateType: normalized.plateType,
        hkPlate: normalized.hkPlate || null,
        macauPlate: normalized.macauPlate || null,
        mainlandPlate: normalized.mainlandPlate || null,
        vehicleOwnership: normalized.vehicleOwnership,
        vehicleCategory: String(body.vehicleCategory).trim(),
        vehicleColor: String(body.vehicleColor).trim(),
        vehiclePhotos: [],
        ...(vehiclePhoto
          ? {
              vehiclePhotoData: new Uint8Array(vehiclePhoto.buffer),
              vehiclePhotoMime: vehiclePhoto.mimetype,
            }
          : {}),
        ...(body.removeVehiclePhoto === "true"
          ? { vehiclePhotoData: null, vehiclePhotoMime: null }
          : {}),
      };
      if (existingVehicle) {
        await tx.driverVehicle.update({ where: { id: existingVehicle.id }, data: vehicleData });
      } else {
        await tx.driverVehicle.create({
          data: {
            id: `vehicle-${Date.now()}-${randomBytes(4).toString("hex")}`,
            ...vehicleData,
            assignments: { create: { driverId: savedDriver.id, isPrimary: true } },
          },
        });
      }
      return savedDriver;
    });
    return driverResponse(driver);
  }
  @Patch("drivers/:id/settlement") async updateDriverSettlement(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { settlementMethod?: unknown; settlementAccount?: unknown },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const settlementMethod = typeof body.settlementMethod === "string" ? body.settlementMethod.trim() : "";
    const settlementAccount = typeof body.settlementAccount === "string" ? body.settlementAccount.trim() : "";
    if (!settlementMethod)
      throw new HttpException("Settlement method is required", HttpStatus.BAD_REQUEST);
    const result = await prisma.driver.updateMany({
      where: { id },
      data: { settlementMethod, settlementAccount: settlementAccount || null },
    });
    if (!result.count)
      throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    return driverResponse(await prisma.driver.findUniqueOrThrow({ where: { id } }));
  }

  @Post("drivers/:id/status") async updateDriverStatus(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { enabled?: boolean },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    if (typeof body.enabled !== "boolean")
      throw new HttpException(
        "Enabled status is required",
        HttpStatus.BAD_REQUEST,
      );
    const existing = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing)
      throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
    const driver = await prisma.$transaction(async (tx) => {
      const updated = await tx.driver.update({
        where: { id },
        data: {
          enabled: body.enabled,
          ...(!body.enabled ? { isOnline: false } : {}),
        },
      });
      if (!body.enabled)
        await tx.driverSession.updateMany({
          where: {
            driverId: id,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { revokedAt: new Date() },
        });
      return updated;
    });
    return driverResponse(driver);
  }
  @Delete("drivers/:id") async deleteDriver(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.driver.findUnique({
        where: { id },
        select: {
          id: true,
          _count: { select: { trips: true, settlements: true, ratings: true } },
        },
      });
      if (!existing)
        throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
      if (
        existing._count.trips ||
        existing._count.settlements ||
        existing._count.ratings
      ) {
        throw new HttpException(
          "司機已有行程、結算或評分歷史，不能永久刪除；請改為停用帳號。",
          HttpStatus.CONFLICT,
        );
      }
      await tx.tripOrderUrl.updateMany({
        where: { driverId: id },
        data: { driverId: null },
      });
      await tx.driver.delete({ where: { id } });
    });
    return { ok: true };
  }

  @Get("administrators") async listAdministrators(@Req() req: RequestLike) {
    requireRole(req, ["SUPER_ADMIN"]);
    const activeSessions = await prisma.adminSession.groupBy({
      by: ["administratorId"],
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      _count: { _all: true },
    });
    const sessionCounts = new Map(
      activeSessions.map((item) => [item.administratorId, item._count._all]),
    );
    return {
      data: administrators.map((admin) => ({
        ...publicAdministrator(admin),
        activeSessionCount: sessionCounts.get(admin.id) || 0,
      })),
      total: administrators.length,
    };
  }
  @Post("administrators") async saveAdministrator(
    @Req() req: RequestLike,
    @Body() body: Partial<Administrator> & { password?: string },
  ) {
    const session = requireRole(req, ["SUPER_ADMIN"]);
    const username = body.username?.trim();
    const displayName = body.displayName?.trim();
    const roles: AdminRole[] = ["SUPER_ADMIN", "OPERATOR", "VIEWER"];
    if (!username || !displayName || !body.role || !roles.includes(body.role))
      throw new HttpException(
        "Valid administrator fields are required",
        HttpStatus.BAD_REQUEST,
      );
    const duplicate = administrators.find(
      (item) =>
        item.username.toLowerCase() === username.toLowerCase() &&
        item.id !== body.id,
    );
    if (duplicate)
      throw new HttpException(
        "Administrator username already exists",
        HttpStatus.CONFLICT,
      );
    const existing = body.id
      ? administrators.find((item) => item.id === body.id)
      : undefined;
    if (body.id && !existing)
      throw new HttpException("Administrator not found", HttpStatus.NOT_FOUND);
    if (!existing && !body.password)
      throw new BadRequestException("Password is required");
    if (!existing) validateAdminPassword(body.password!, username);
    if (existing) {
      const removingSuperAccess =
        existing.role === "SUPER_ADMIN" &&
        (body.role !== "SUPER_ADMIN" || body.enabled === false);
      const enabledSuperAdministrators = administrators.filter(
        (item) => item.role === "SUPER_ADMIN" && item.enabled,
      );
      if (removingSuperAccess && enabledSuperAdministrators.length === 1)
        throw new HttpException(
          "At least one enabled super administrator is required",
          HttpStatus.BAD_REQUEST,
        );
      if (
        existing.id === session.sub &&
        (body.role !== "SUPER_ADMIN" || body.enabled === false)
      )
        throw new HttpException(
          "Cannot remove your own super administrator access",
          HttpStatus.BAD_REQUEST,
        );
      const revokeExistingSessions =
        Boolean(body.password) || body.enabled === false || existing.role !== body.role;
      existing.username = username;
      existing.displayName = displayName;
      existing.role = body.role;
      existing.enabled = body.enabled ?? existing.enabled;
      existing.updatedAt = new Date().toISOString();
      if (body.password) {
        validateAdminPassword(body.password, username);
        existing.passwordHash = hashPassword(body.password);
      }
      await prisma.administrator.update({
        where: { id: existing.id },
        data: {
          username: existing.username,
          normalizedUsername: existing.username.toLowerCase(),
          displayName: existing.displayName,
          role: existing.role,
          enabled: existing.enabled,
          passwordHash: existing.passwordHash,
        },
      });
      if (revokeExistingSessions) {
        const sessions = await prisma.adminSession.findMany({
          where: { administratorId: existing.id, revokedAt: null },
          select: { jti: true, expiresAt: true },
        });
        await prisma.adminSession.updateMany({
          where: { administratorId: existing.id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: "administrator-changed" },
        });
        for (const item of sessions)
          revokedAdminSessions.set(item.jti, item.expiresAt.getTime());
      }
      return publicAdministrator(existing);
    }
    const created: Administrator = {
      id: `admin-${Date.now()}`,
      username,
      displayName,
      role: body.role,
      enabled: body.enabled ?? true,
      passwordHash: hashPassword(body.password!),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
    await prisma.administrator.create({
      data: {
        id: created.id,
        username: created.username,
        normalizedUsername: created.username.toLowerCase(),
        displayName: created.displayName,
        role: created.role,
        enabled: created.enabled,
        passwordHash: created.passwordHash,
      },
    });
    administrators.push(created);
    return publicAdministrator(created);
  }
  @Post("administrators/:id/unlock") async unlockAdministrator(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN"]);
    const admin = administrators.find((item) => item.id === id);
    if (!admin)
      throw new HttpException("Administrator not found", HttpStatus.NOT_FOUND);
    await prisma.administrator.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.updatedAt = new Date().toISOString();
    return publicAdministrator(admin);
  }

  @Post("administrators/:id/revoke-sessions") async revokeAdministratorSessions(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    const actor = requireRole(req, ["SUPER_ADMIN"]);
    if (actor.sub === id)
      throw new BadRequestException("Cannot revoke your own session");
    const admin = administrators.find((item) => item.id === id);
    if (!admin)
      throw new HttpException("Administrator not found", HttpStatus.NOT_FOUND);
    const activeSessionFilter = {
      administratorId: id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    };
    const sessions = await prisma.adminSession.findMany({
      where: activeSessionFilter,
      select: { jti: true, expiresAt: true },
    });
    await prisma.adminSession.updateMany({
      where: activeSessionFilter,
      data: { revokedAt: new Date(), revokedReason: "manual-revocation" },
    });
    for (const item of sessions)
      revokedAdminSessions.set(item.jti, item.expiresAt.getTime());
    return { ok: true, revokedCount: sessions.length };
  }

  @Delete("administrators/:id") async disableAdministrator(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    const session = requireRole(req, ["SUPER_ADMIN"]);
    if (session.sub === id)
      throw new HttpException(
        "Cannot disable the current administrator",
        HttpStatus.BAD_REQUEST,
      );
    const admin = administrators.find((item) => item.id === id);
    if (!admin)
      throw new HttpException("Administrator not found", HttpStatus.NOT_FOUND);
    if (
      admin.role === "SUPER_ADMIN" &&
      admin.enabled &&
      administrators.filter(
        (item) => item.role === "SUPER_ADMIN" && item.enabled,
      ).length === 1
    )
      throw new HttpException(
        "At least one enabled super administrator is required",
        HttpStatus.BAD_REQUEST,
      );
    admin.enabled = false;
    admin.updatedAt = new Date().toISOString();
    await prisma.administrator.update({
      where: { id: admin.id },
      data: { enabled: false },
    });
    const sessions = await prisma.adminSession.findMany({
      where: { administratorId: admin.id, revokedAt: null },
      select: { jti: true, expiresAt: true },
    });
    await prisma.adminSession.updateMany({
      where: { administratorId: admin.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "administrator-disabled" },
    });
    for (const item of sessions)
      revokedAdminSessions.set(item.jti, item.expiresAt.getTime());
    return { ok: true };
  }
  @Get("audit-logs") async listAuditLogs(@Req() req: RequestLike) {
    requireRole(req, ["SUPER_ADMIN"]);
    const query = parseAdminListQuery(req, 50);
    const status = adminQueryValue(req, "status");
    const method = adminQueryValue(req, "method");
    const action = adminQueryValue(req, "action");
    const resource = adminQueryValue(req, "resource");
    const from = adminQueryDate(req, "from");
    const to = adminQueryDate(req, "to");
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(status && status !== "all" ? { status } : {}),
      ...(method && method !== "all" ? { method } : {}),
      ...(action ? { action } : {}),
      ...(resource ? { resource } : {}),
      ...((from || to) ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(query.search ? { OR: [
        { username: { contains: query.search, mode: "insensitive" } },
        { action: { contains: query.search, mode: "insensitive" } },
        { resource: { contains: query.search, mode: "insensitive" } },
        { ip: { contains: query.search, mode: "insensitive" } },
      ] } : {}),
    };
    const [data, total, all, success, failed] = await prisma.$transaction([
      prisma.adminAuditLog.findMany({ where, orderBy: [{ createdAt: query.sortOrder }, { id: query.sortOrder }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.count(),
      prisma.adminAuditLog.count({ where: { status: "SUCCESS" } }),
      prisma.adminAuditLog.count({ where: { status: "FAILED" } }),
    ]);
    return adminListResponse(data.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })), total, query, { total: all, success, failed });
  }

  @Get("notification-templates") async listNotificationTemplates(
    @Req() req: RequestLike,
  ) {
    requireAuth(req);
    return {
      data: await prisma.notificationTemplate.findMany({
        orderBy: [{ builtIn: "desc" }, { createdAt: "asc" }],
      }),
    };
  }
  @Post("notification-templates") async createNotificationTemplate(
    @Req() req: RequestLike,
    @Body()
    body: {
      name?: string;
      type?: string;
      title?: string;
      content?: string;
      audience?: string;
      important?: boolean;
      enabled?: boolean;
    },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const name = body.name?.trim();
    const type = body.type?.trim();
    const title = body.title?.trim();
    const content = body.content?.trim();
    if (!name || !type || !title || !content)
      throw new HttpException(
        "Template name, type, title and content are required",
        HttpStatus.BAD_REQUEST,
      );
    return prisma.notificationTemplate.create({
      data: {
        name,
        type,
        title,
        content,
        audience: body.audience === "ALL_DRIVERS" ? "ALL_DRIVERS" : "ALL_USERS",
        important: Boolean(body.important),
        enabled: body.enabled !== false,
        builtIn: false,
      },
    });
  }
  @Post("notification-templates/:id/preview") async previewNotificationTemplate(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { title?: string; content?: string },
  ) {
    requireAuth(req);
    const template = await prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!template)
      throw new HttpException(
        "Notification template not found",
        HttpStatus.NOT_FOUND,
      );
    return {
      data: {
        ...template,
        title: body.title?.trim() || template.title,
        content: body.content?.trim() || template.content,
      },
    };
  }

  @Get("notifications") async listNotifications(@Req() req: RequestLike) {
    requireAuth(req);
    const query = parseAdminListQuery(req);
    const audience = adminQueryValue(req, "audience");
    const templateType = adminQueryValue(req, "templateType");
    const important = adminQueryBoolean(req, "important");
    const read = adminQueryBoolean(req, "read");
    const where: Prisma.NotificationWhereInput = {
      ...(audience ? { audience } : {}),
      ...(templateType ? { templateType } : {}),
      ...(important === undefined ? {} : { important }),
      ...(read === undefined ? {} : { readAt: read ? { not: null } : null }),
      ...(query.search ? { OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { content: { contains: query.search, mode: "insensitive" } },
      ] } : {}),
    };
    const [data, total, all, unread, importantCount] = await prisma.$transaction([
      prisma.notification.findMany({ where, orderBy: [{ createdAt: query.sortOrder }, { id: query.sortOrder }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.notification.count({ where }),
      prisma.notification.count(),
      prisma.notification.count({ where: { readAt: null } }),
      prisma.notification.count({ where: { important: true } }),
    ]);
    return adminListResponse(data, total, query, { total: all, unread, important: importantCount });
  }
  @Post("notifications") async createNotification(
    @Req() req: RequestLike,
    @Body()
    body: {
      title?: string;
      content?: string;
      audience?: string;
      userIds?: string[];
      driverIds?: string[];
      templateType?: string;
      important?: boolean;
    },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const title = body.title?.trim();
    const content = body.content?.trim();
    const audience =
      body.audience === "ALL_USERS" || body.audience === "ALL_DRIVERS"
        ? body.audience
        : "SELECTED";
    if (!title || !content)
      throw new HttpException(
        "Title and content are required",
        HttpStatus.BAD_REQUEST,
      );
    const requestedUserIds = Array.isArray(body.userIds)
      ? [
          ...new Set(
            body.userIds
              .filter((id) => typeof id === "string" && id.trim())
              .map((id) => id.trim()),
          ),
        ]
      : [];
    const requestedDriverIds = Array.isArray(body.driverIds)
      ? [
          ...new Set(
            body.driverIds
              .filter((id) => typeof id === "string" && id.trim())
              .map((id) => id.trim()),
          ),
        ]
      : [];
    const userIds =
      audience === "ALL_USERS"
        ? (
            await prisma.user.findMany({
              where: { enabled: true },
              select: { id: true },
            })
          ).map((item) => item.id)
        : requestedUserIds;
    const driverIds =
      audience === "ALL_DRIVERS"
        ? (await prisma.driver.findMany({ select: { id: true } })).map(
            (item) => item.id,
          )
        : requestedDriverIds;
    if (!userIds.length && !driverIds.length)
      throw new HttpException(
        "At least one recipient is required",
        HttpStatus.BAD_REQUEST,
      );
    if (audience === "SELECTED") {
      const [users, drivers] = await Promise.all([
        userIds.length
          ? prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true },
            })
          : [],
        driverIds.length
          ? prisma.driver.findMany({
              where: { id: { in: driverIds } },
              select: { id: true },
            })
          : [],
      ]);
      if (
        users.length !== userIds.length ||
        drivers.length !== driverIds.length
      )
        throw new HttpException(
          "One or more recipients were not found",
          HttpStatus.BAD_REQUEST,
        );
    }
    const templateType = body.templateType?.trim() || "system";
    const important = Boolean(body.important);
    const uniqueDriverIds = [...new Set(driverIds)];
    let eligibleDriverIds = uniqueDriverIds;
    if (!important && uniqueDriverIds.length) {
      const preferences = await prisma.driverNotificationPreference.findMany({
        where: { driverId: { in: uniqueDriverIds } },
      });
      const preferencesByDriver = new Map(
        preferences.map((preference) => [preference.driverId, preference]),
      );
      eligibleDriverIds = uniqueDriverIds.filter((driverId) => {
        const preference = preferencesByDriver.get(driverId);
        if (!preference) return true;
        if (!preference.notificationsOn) return false;
        if (templateType === "order") return preference.orderOn;
        if (templateType === "settlement") return preference.settlementOn;
        return preference.systemOn;
      });
    }
    const records: Array<{
      title: string;
      content: string;
      audience: string;
      templateType: string;
      important: boolean;
      userId?: string;
      driverId?: string;
    }> = [
      ...[...new Set(userIds)].map((userId) => ({
        title,
        content,
        audience: "USER",
        templateType,
        important,
        userId,
      })),
      ...eligibleDriverIds.map((driverId) => ({
        title,
        content,
        audience: "DRIVER",
        templateType,
        important,
        driverId,
      })),
    ];
    await prisma.notification.createMany({ data: records });
    await Promise.all([
      publishNotificationEvent({
        recipientType: "user",
        recipientIds: records.map((record) => record.userId).filter((id): id is string => Boolean(id)),
      }),
      publishNotificationEvent({
        recipientType: "driver",
        recipientIds: records.map((record) => record.driverId).filter((id): id is string => Boolean(id)),
      }),
    ]);
    return { ok: true, count: records.length };
  }

  @Get("promotions") async listPromotions(@Req() req: RequestLike) {
    requireAuth(req);
    const data = await prisma.promotion.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    return { data, total: data.length };
  }

  @Post("promotions") async savePromotion(
    @Req() req: RequestLike,
    @Body() body: PromotionInput,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const kind =
      body.kind === "COUPON" ||
      body.kind === "MEMBER" ||
      body.kind === "CAMPAIGN"
        ? body.kind
        : "";
    const discountType =
      body.discountType === "FIXED_AMOUNT" ||
      body.discountType === "PERCENTAGE" ||
      body.discountType === "TOTAL_PRICE"
        ? body.discountType
        : "";
    const stackingMode =
      body.stackingMode === "PERCENTAGE_AND_VOUCHER" ||
      body.stackingMode === "ALL"
        ? body.stackingMode
        : "NONE";
    const discountValue = Number(body.discountValue);
    const minimumSpend = Number(body.minimumSpend ?? 0);
    const maximumDiscount =
      body.maximumDiscount === "" ||
      body.maximumDiscount === null ||
      body.maximumDiscount === undefined
        ? null
        : Number(body.maximumDiscount);
    const usageLimit =
      body.usageLimit === "" ||
      body.usageLimit === null ||
      body.usageLimit === undefined
        ? null
        : Number(body.usageLimit);
    const priority = Number(body.priority ?? 0);
    const couponCode =
      typeof body.couponCode === "string" && body.couponCode.trim()
        ? body.couponCode.trim().toUpperCase()
        : null;
    const membershipLevel =
      typeof body.membershipLevel === "string" && body.membershipLevel.trim()
        ? body.membershipLevel.trim()
        : null;
    const originRegion = normalizeRuleText(body.originRegion) || null;
    const originCity = normalizeRuleText(body.originCity) || null;
    const destinationRegion = normalizeRuleText(body.destinationRegion) || null;
    const destinationCity = normalizeRuleText(body.destinationCity) || null;
    const weekdays = normalizeWeekdays(body.weekdays);
    const timeStart = normalizeRuleText(body.timeStart) || null;
    const timeEnd = normalizeRuleText(body.timeEnd) || null;
    const startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
    const endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
    if (
      !name ||
      !kind ||
      !discountType ||
      !Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      (discountType === "PERCENTAGE" && discountValue > 100) ||
      !Number.isFinite(minimumSpend) ||
      minimumSpend < 0 ||
      !Number.isInteger(priority) ||
      (maximumDiscount !== null &&
        (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)) ||
      (usageLimit !== null &&
        (!Number.isInteger(usageLimit) || usageLimit <= 0)) ||
      (startsAt && Number.isNaN(startsAt.valueOf())) ||
      (endsAt && Number.isNaN(endsAt.valueOf())) ||
      (startsAt && endsAt && startsAt >= endsAt) ||
      (timeStart && timeToMinutes(timeStart) === null) ||
      (timeEnd && timeToMinutes(timeEnd) === null) ||
      (kind === "COUPON" && !couponCode) ||
      (kind === "MEMBER" && !membershipLevel)
    )
      throw new HttpException(
        "Promotion fields are invalid",
        HttpStatus.BAD_REQUEST,
      );
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const data = {
      name,
      kind: kind as PromotionKind,
      discountType: discountType as DiscountType,
      stackingMode: stackingMode as PromotionStackingMode,
      discountValue,
      currency: configuredCurrencyLabel(settings),
      minimumSpend,
      maximumDiscount,
      priority,
      startsAt,
      endsAt,
      enabled: body.enabled !== false,
      couponCode: kind === "COUPON" ? couponCode : null,
      usageLimit,
      membershipLevel: kind === "MEMBER" ? membershipLevel : null,
      originRegion,
      originCity,
      destinationRegion,
      destinationCity,
      weekdays: weekdays.length ? weekdays : Prisma.JsonNull,
      timeStart,
      timeEnd,
    };
    if (id) {
      const existing = await prisma.promotion.findUnique({ where: { id } });
      if (!existing)
        throw new HttpException("Promotion not found", HttpStatus.NOT_FOUND);
      return prisma.promotion.update({ where: { id }, data });
    }
    return prisma.promotion.create({ data });
  }
  @Delete("promotions/:id") async deletePromotion(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException("Promotion not found", HttpStatus.NOT_FOUND);
    await prisma.promotion.delete({ where: { id } });
    return { ok: true };
  }

  @Get("mileage/settings") async mileageSettings(@Req() req: RequestLike) {
    requireAuth(req);
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const [rewards, accounts] = await Promise.all([
      prisma.mileageReward.findMany({
        include: { promotion: true, _count: { select: { redemptions: true } } },
        orderBy: [{ enabled: "desc" }, { cost: "asc" }],
      }),
      prisma.user.findMany({
        include: { mileageAccount: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);
    return {
      rules: {
        spendPerKm: settings.mileageSpendPerKm,
        validityMonths: settings.mileageValidityMonths,
      },
      rewards,
      accounts: accounts.map((user) => ({
        id: user.mileageAccount?.id || `pending-${user.id}`,
        userId: user.id,
        balance: user.mileageAccount?.balance || 0,
        lifetimeEarned: user.mileageAccount?.lifetimeEarned || 0,
        lifetimeRedeemed: user.mileageAccount?.lifetimeRedeemed || 0,
        updatedAt: user.mileageAccount?.updatedAt || user.createdAt,
        user: {
          id: user.id,
          name: user.name,
          countryCode: user.countryCode,
          phoneNumber: user.phoneNumber,
          membershipLevel: user.membershipLevel,
        },
      })),
    };
  }

  @Post("mileage/rules") async saveMileageRules(
    @Req() req: RequestLike,
    @Body() body: { spendPerKm?: unknown; validityMonths?: unknown },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const spendPerKm = Number(body.spendPerKm);
    const validityMonths = Number(body.validityMonths);
    if (
      !Number.isFinite(spendPerKm) ||
      spendPerKm <= 0 ||
      spendPerKm > 100000 ||
      !Number.isInteger(validityMonths) ||
      validityMonths < 1 ||
      validityMonths > 120
    )
      throw new HttpException("Mileage rules are invalid", HttpStatus.BAD_REQUEST);
    const settings = await prisma.appSetting.update({
      where: { id: appSettingsDefaults.id },
      data: { mileageSpendPerKm: spendPerKm, mileageValidityMonths: validityMonths },
    });
    return {
      spendPerKm: settings.mileageSpendPerKm,
      validityMonths: settings.mileageValidityMonths,
    };
  }

  @Get("invitations/settings") async invitationSettings(@Req() req: RequestLike) {
    requireAuth(req);
    const now = new Date();
    await prisma.invitation.updateMany({
      where: { status: "REGISTERED", expiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    });
    const [settings, records, grouped] = await Promise.all([
      prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } }),
      prisma.invitation.findMany({
        include: {
          inviter: { select: { id: true, name: true, displayName: true, phoneNumber: true } },
          invitee: { select: { id: true, name: true, displayName: true, phoneNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.invitation.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const count = (status: string) => grouped.find((item) => item.status === status)?._count._all ?? 0;
    return {
      rules: {
        enabled: settings.invitationEnabled,
        inviterMileage: settings.invitationInviterMileage,
        inviteeFare: settings.invitationInviteeFare,
        qualificationDays: settings.invitationQualificationDays,
        mileageValidityMonths: settings.invitationMileageValidityMonths,
      },
      walletCurrency: settings.walletCurrency,
      summary: {
        pending: count("REGISTERED"),
        rewarded: count("REWARDED"),
        expired: count("EXPIRED"),
      },
      records,
    };
  }

  @Post("invitations/settings") async saveInvitationSettings(
    @Req() req: RequestLike,
    @Body() body: {
      enabled?: unknown;
      inviterMileage?: unknown;
      inviteeFare?: unknown;
      qualificationDays?: unknown;
      mileageValidityMonths?: unknown;
    },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const inviterMileage = Number(body.inviterMileage);
    const inviteeFare = roundMoney(Number(body.inviteeFare));
    const qualificationDays = Number(body.qualificationDays);
    const mileageValidityMonths = Number(body.mileageValidityMonths);
    if (
      typeof body.enabled !== "boolean" ||
      !Number.isInteger(inviterMileage) ||
      inviterMileage < 0 ||
      inviterMileage > 1000000 ||
      !Number.isFinite(inviteeFare) ||
      inviteeFare < 0 ||
      inviteeFare > 1000000 ||
      !Number.isInteger(qualificationDays) ||
      qualificationDays < 1 ||
      qualificationDays > 365 ||
      !Number.isInteger(mileageValidityMonths) ||
      mileageValidityMonths < 1 ||
      mileageValidityMonths > 120
    )
      throw new HttpException("Invitation settings are invalid", HttpStatus.BAD_REQUEST);
    const settings = await prisma.appSetting.update({
      where: { id: appSettingsDefaults.id },
      data: {
        invitationEnabled: body.enabled,
        invitationInviterMileage: inviterMileage,
        invitationInviteeFare: inviteeFare,
        invitationQualificationDays: qualificationDays,
        invitationMileageValidityMonths: mileageValidityMonths,
      },
    });
    return {
      enabled: settings.invitationEnabled,
      inviterMileage: settings.invitationInviterMileage,
      inviteeFare: settings.invitationInviteeFare,
      qualificationDays: settings.invitationQualificationDays,
      mileageValidityMonths: settings.invitationMileageValidityMonths,
      walletCurrency: settings.walletCurrency,
    };
  }

  @Post("mileage/rewards") async saveMileageReward(
    @Req() req: RequestLike,
    @Body() body: MileageRewardInput,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const cost = Number(body.cost);
    const stock =
      body.stock === "" || body.stock === null || body.stock === undefined
        ? null
        : Number(body.stock);
    const couponValue =
      body.couponValue === "" ||
      body.couponValue === null ||
      body.couponValue === undefined
        ? null
        : Number(body.couponValue);
    const couponCurrency =
      typeof body.couponCurrency === "string" && body.couponCurrency.trim()
        ? body.couponCurrency.trim()
        : null;
    const promotionId =
      typeof body.promotionId === "string" && body.promotionId.trim()
        ? body.promotionId.trim()
        : null;
    if (
      !name ||
      !description ||
      !Number.isInteger(cost) ||
      cost <= 0 ||
      (stock !== null && (!Number.isInteger(stock) || stock < 0)) ||
      (couponValue !== null && (!Number.isFinite(couponValue) || couponValue <= 0))
    )
      throw new HttpException("Mileage reward fields are invalid", HttpStatus.BAD_REQUEST);
    if (promotionId) {
      const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
      if (!promotion || promotion.kind !== "COUPON" || !promotion.couponCode)
        throw new HttpException(
          "Mileage rewards can only link to coupon promotions",
          HttpStatus.BAD_REQUEST,
        );
    }
    const data = {
      name,
      description,
      cost,
      enabled: body.enabled !== false,
      stock,
      couponValue,
      couponCurrency,
      promotionId,
    };
    if (id) {
      const existing = await prisma.mileageReward.findUnique({ where: { id } });
      if (!existing)
        throw new HttpException("Mileage reward not found", HttpStatus.NOT_FOUND);
      return prisma.mileageReward.update({
        where: { id },
        data,
        include: { promotion: true, _count: { select: { redemptions: true } } },
      });
    }
    return prisma.mileageReward.create({
      data,
      include: { promotion: true, _count: { select: { redemptions: true } } },
    });
  }

  @Delete("mileage/rewards/:id") async deleteMileageReward(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const redemptionCount = await prisma.mileageRedemption.count({
      where: { rewardId: id },
    });
    if (redemptionCount > 0)
      throw new HttpException(
        "Redeemed rewards can only be disabled",
        HttpStatus.CONFLICT,
      );
    const result = await prisma.mileageReward.deleteMany({ where: { id } });
    if (result.count !== 1)
      throw new HttpException("Mileage reward not found", HttpStatus.NOT_FOUND);
    return { ok: true };
  }

  @Get("mileage/accounts/:userId/ledger") async mileageAccountLedger(
    @Req() req: RequestLike,
    @Param("userId") userId: string,
  ) {
    requireAuth(req);
    const items = await prisma.mileageLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { data: items };
  }

  @Post("mileage/accounts/:userId/adjust") async adjustMileage(
    @Req() req: RequestLike,
    @Param("userId") userId: string,
    @Body() body: { amount?: unknown; reason?: unknown },
  ) {
    const session = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const amount = Number(body.amount);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1000000 || !reason)
      throw new HttpException("Mileage adjustment is invalid", HttpStatus.BAD_REQUEST);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      const account = await tx.mileageAccount.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      if (account.balance + amount < 0)
        throw new HttpException("Mileage balance is insufficient", HttpStatus.CONFLICT);
      const updated = await tx.mileageAccount.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          ...(amount > 0
            ? { lifetimeEarned: { increment: amount } }
            : { lifetimeRedeemed: { increment: Math.abs(amount) } }),
        },
      });
      await tx.mileageLedger.create({
        data: {
          userId,
          amount,
          balanceAfter: updated.balance,
          type: "ADJUST",
          reason: `管理員調整：${reason}`,
          administratorId: session.sub,
        },
      });
      return updated;
    });
  }

  @Post("users/:id/membership") async updateMembership(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { membershipLevel?: string | null },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const user = await prisma.user.update({
      where: { id },
      data: { membershipLevel: body.membershipLevel?.trim() || null },
    });
    return userResponse(user);
  }

  @Get("dashboard") async dashboard(@Req() req: RequestLike) {
    requireAuth(req);
    const now = new Date();
    const [
      users,
      onlineDrivers,
      onlinePassengerUsers,
      tripsCount,
      pendingTrips,
      completedTrips,
      recommendedAddresses,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.driver.count({ where: { isOnline: true, enabled: true } }),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT session."userId") AS count
        FROM "ClientSession" AS session
        INNER JOIN "User" AS passenger ON passenger."id" = session."userId"
        WHERE session."revokedAt" IS NULL
          AND session."expiresAt" > ${now}
          AND passenger."enabled" = true
      `.then(([result]) => Number(result?.count || 0)),
      prisma.trip.count(),
      prisma.trip.count({ where: { status: "PENDING" } }),
      prisma.trip.count({ where: { status: "COMPLETED" } }),
      prisma.recommendedAddress.count({ where: { enabled: true } }),
    ]);
    return {
      users,
      onlineDrivers,
      onlinePassengers: onlinePassengerUsers,
      trips: tripsCount,
      pendingTrips,
      completedTrips,
      charterOrders: charterOrders.length,
      pendingCharters: charterOrders.filter(
        (order) => order.status === "PENDING",
      ).length,
      recommendedAddresses,
    };
  }
  @Get("users") async listUsers(@Req() req: RequestLike) {
    requireAuth(req);
    const query = parseAdminListQuery(req);
    const enabledQuery = adminQueryBoolean(req, "enabled");
    const statusFilter = adminQueryValue(req, "status");
    const enabled = enabledQuery ?? (statusFilter === "ENABLED" ? true : statusFilter === "DISABLED" ? false : undefined);
    const membershipLevel = adminQueryValue(req, "membershipLevel");
    const region = adminQueryValue(req, "region");
    const where: Prisma.UserWhereInput = {
      ...(enabled === undefined ? {} : { enabled }),
      ...(membershipLevel ? { membershipLevel } : {}),
      ...(region ? { region } : {}),
      ...(query.search ? { OR: [
        { id: { contains: query.search, mode: "insensitive" } },
        { name: { contains: query.search, mode: "insensitive" } },
        { displayName: { contains: query.search, mode: "insensitive" } },
        { phoneNumber: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ] } : {}),
    };
    const [data, total, all, enabledCount, members] = await prisma.$transaction([
      prisma.user.findMany({ where, orderBy: [{ createdAt: query.sortOrder }, { id: query.sortOrder }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.user.count({ where }),
      prisma.user.count(),
      prisma.user.count({ where: { enabled: true } }),
      prisma.user.count({ where: { membershipLevel: { not: null } } }),
    ]);
    return adminListResponse(data.map(userResponse), total, query, { total: all, enabled: enabledCount, members });
  }
  @Get("users/options") async listUserOptions(@Req() req: RequestLike) {
    requireAuth(req);
    const query = parseAdminListQuery(req, 20);
    const where: Prisma.UserWhereInput = query.search ? { OR: [
      { id: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
      { displayName: { contains: query.search, mode: "insensitive" } },
      { phoneNumber: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ] } : {};
    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: { id: true, countryCode: true, phoneNumber: true, name: true, displayName: true, enabled: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return adminListResponse(data.map((user) => ({ ...user, phone: `${user.countryCode} ${user.phoneNumber}` })), total, query);
  }
  @Post("users") async createUser(
    @Req() req: RequestLike,
    @Body()
    body: {
      countryCode?: string;
      phoneNumber?: string;
      name?: string;
      displayName?: string;
      email?: string;
      gender?: string;
      region?: string;
      birthday?: string;
    },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const identity = parsePhoneIdentity(body);
    const duplicate = await prisma.user.findUnique({
      where: { countryCode_phoneNumber: identity },
    });
    if (duplicate)
      throw new HttpException(
        "A user with this phone number already exists",
        HttpStatus.CONFLICT,
      );
    const email = parseProfileEmail(body.email);
    const birthday = parseBirthday(body.birthday);
    return userResponse(
      await prisma.user.create({
        data: {
          id: await generateUserId(),
          ...identity,
          name: body.name?.trim() || null,
          displayName: body.displayName?.trim() || null,
          email,
          gender: body.gender?.trim() || null,
          region: body.region?.trim() || null,
          birthday,
        },
      }),
    );
  }
  @Get("users/:id") async getUser(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        authIdentities: { select: { provider: true } },
        verificationCodes: { orderBy: { createdAt: "desc" }, take: 20 },
        walletTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!user) throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    const [currentTrips, currentCharterOrders] = await Promise.all([
      prisma.trip.findMany({
        where: { userId: id, status: { in: ["PENDING", "CONFIRMED"] } },
        orderBy: { scheduledAt: "asc" },
      }),
      Promise.resolve(
        charterOrders.filter(
          (order) =>
            order.userId === id &&
            ["PENDING", "CONFIRMED"].includes(order.status),
        ),
      ),
    ]);
    return {
      ...userResponse(user),
      loginMethods: loginMethods(user),
      verificationCodes: (user.verificationCodes || []).map((item) => ({
        id: item.id,
        purpose: item.purpose,
        status: item.status,
        attempts: item.attempts,
        expiresAt: item.expiresAt.toISOString(),
        consumedAt: item.consumedAt?.toISOString() || null,
        createdAt: item.createdAt.toISOString(),
      })),
      currentTrips: currentTrips.map((trip) => ({
        ...trip,
        scheduledAt: trip.scheduledAt.toISOString(),
        createdAt: trip.createdAt.toISOString(),
        updatedAt: trip.updatedAt.toISOString(),
      })),
      currentCharterOrders,
      walletTransactions: user.walletTransactions,
    };
  }
  @Post("users/:id") async updateUser(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body()
    body: {
      countryCode?: string;
      phoneNumber?: string;
      name?: string;
      displayName?: string;
      email?: string;
      gender?: string;
      region?: string;
      birthday?: string;
    },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    const identity = parsePhoneIdentity({
      countryCode: body.countryCode ?? existing.countryCode,
      phoneNumber: body.phoneNumber ?? existing.phoneNumber,
    });
    const duplicate = await prisma.user.findUnique({
      where: { countryCode_phoneNumber: identity },
    });
    if (duplicate && duplicate.id !== id)
      throw new HttpException(
        "A user with this phone number already exists",
        HttpStatus.CONFLICT,
      );
    const email = parseProfileEmail(body.email);
    const birthday = parseBirthday(body.birthday);
    return userResponse(
      await prisma.user.update({
        where: { id },
        data: {
          ...identity,
          name: body.name?.trim() || null,
          displayName: body.displayName?.trim() || null,
          email,
          gender: body.gender?.trim() || null,
          region: body.region?.trim() || null,
          birthday,
        },
      }),
    );
  }
  @Post("users/:id/status") async updateUserStatus(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { enabled?: boolean },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    if (typeof body.enabled !== "boolean")
      throw new HttpException(
        "Enabled status is required",
        HttpStatus.BAD_REQUEST,
      );
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { enabled: body.enabled },
      });
      if (!body.enabled)
        await tx.clientSession.updateMany({
          where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } },
          data: { revokedAt: new Date() },
        });
      return result;
    });
    return userResponse(updated);
  }
  @Delete("users/:id") async deleteUser(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          _count: {
            select: { trips: true, payments: true, walletTransactions: true },
          },
        },
      });
      if (!existing)
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      if (
        existing._count.trips ||
        existing._count.payments ||
        existing._count.walletTransactions
      ) {
        throw new HttpException(
          "用戶已有行程、付款或錢包歷史，不能永久刪除；請改為停用帳號。",
          HttpStatus.CONFLICT,
        );
      }
      await tx.verificationCode.updateMany({
        where: { userId: id },
        data: { userId: null },
      });
      await tx.user.delete({ where: { id } });
    });
    return { ok: true };
  }
  @Post("users/:id/wallet-adjustments") async adjustWallet(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body()
    body: {
      wallet?: "CASH" | "FARE";
      direction?: "INCREASE" | "DECREASE";
      amount?: number;
      reason?: string;
    },
  ) {
    const session = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const amount = roundMoney(Number(body.amount));
    const reason = body.reason?.trim();
    if (
      (body.wallet !== "CASH" && body.wallet !== "FARE") ||
      (body.direction !== "INCREASE" && body.direction !== "DECREASE") ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !reason ||
      reason.length > 500
    ) {
      throw new HttpException(
        "Wallet, direction, positive amount, and reason are required",
        HttpStatus.BAD_REQUEST,
      );
    }
    const wallet = body.wallet;
    const direction = body.direction;
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user)
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      const balanceField = wallet === "CASH" ? "cashBalance" : "fareBalance";
      const balance = user[balanceField];
      if (direction === "DECREASE" && balance < amount)
        throw new HttpException(
          "Insufficient wallet balance",
          HttpStatus.BAD_REQUEST,
        );
      const balanceAfter = roundMoney(
        direction === "INCREASE" ? balance + amount : balance - amount,
      );
      const updated = await tx.user.update({
        where: { id },
        data: { [balanceField]: balanceAfter },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: id,
          wallet,
          type: direction === "INCREASE" ? "ADMIN_INCREASE" : "ADMIN_DECREASE",
          amount,
          balanceAfter,
          reason,
          administratorId: session.sub,
        },
      });
      return { user: userResponse(updated), transaction };
    });
    return result;
  }
  @Get("users/:id/wallet-transactions") async listWalletTransactions(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    if (
      !(await prisma.user.findUnique({ where: { id }, select: { id: true } }))
    )
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    return {
      data: await prisma.walletTransaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
      }),
    };
  }
  @Get("users/:id/top-up-withdrawal-history") async listTopUpWithdrawalHistory(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    if (
      !(await prisma.user.findUnique({ where: { id }, select: { id: true } }))
    )
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    return {
      data: await prisma.walletTransaction.findMany({
        where: { userId: id, type: { in: ["TOP_UP", "WITHDRAWAL"] } },
        orderBy: { createdAt: "desc" },
      }),
    };
  }
  @Get("trips") async listTrips(@Req() req: RequestLike) {
    requireAuth(req);
    await prisma.trip.updateMany({
      where: {
        status: "PENDING",
        quote: { is: { expiresAt: { lte: new Date() } } },
      },
      data: { status: "CANCELLED" },
    });
    const query = parseAdminListQuery(req);
    const mode = adminQueryValue(req, "mode");
    const statusValue = adminQueryValue(req, "status");
    const settlementStatus = mode === "settlements"
      ? (statusValue && ["ALL", "UNSETTLED", "SETTLED"].includes(statusValue) ? statusValue : "UNSETTLED")
      : "";
    const status = !settlementStatus && statusValue !== "ALL" ? statusValue : "";
    const executionPhase = adminQueryValue(req, "executionPhase");
    const tripStatusWhere = adminTripStatusWhere(status, executionPhase);
    const region = adminQueryValue(req, "region");
    const driverId = adminQueryValue(req, "driverId");
    const userId = adminQueryValue(req, "userId");
    const settlement = adminQueryValue(req, "settlement");
    const dispatch = adminQueryValue(req, "dispatch");
    const scheduledFrom = adminQueryDate(req, "scheduledFrom");
    const scheduledTo = adminQueryDate(req, "scheduledTo");
    const date = adminQueryValue(req, "date");
    const dateStart = date ? adminQueryDate(req, "date") : undefined;
    const dateEnd = dateStart ? new Date(dateStart.getTime() + 24 * 60 * 60 * 1000) : undefined;
    const includeOrderUrls = mode === "dispatch";
    const where: Prisma.TripWhereInput = {
      ...tripStatusWhere,
      ...(region ? { region: region as any } : {}),
      ...(driverId ? { driverId } : {}),
      ...(userId ? { userId } : {}),
      ...(settlement === "settled" || settlementStatus === "SETTLED" ? { status: "COMPLETED", driverId: { not: null }, settlement: { isNot: null } } : {}),
      ...(settlement === "unsettled" || settlementStatus === "UNSETTLED" ? { status: "COMPLETED", driverId: { not: null }, settlement: { is: null } } : {}),
      ...(settlementStatus === "ALL" ? { status: "COMPLETED", driverId: { not: null } } : {}),
      ...(dispatch === "waiting" ? { status: { notIn: ["COMPLETED", "CANCELLED"] } } : {}),
      ...(dispatch === "assigned" ? { driverId: { not: null } } : {}),
      ...(dispatch === "unassigned" ? { driverId: null } : {}),
      ...((scheduledFrom || scheduledTo || dateStart) ? { scheduledAt: { ...(scheduledFrom ? { gte: scheduledFrom } : {}), ...(scheduledTo ? { lte: scheduledTo } : {}), ...(dateStart ? { gte: dateStart, lt: dateEnd } : {}) } } : {}),
      ...(query.search ? { OR: [
        { id: { contains: query.search, mode: "insensitive" } },
        { origin: { contains: query.search, mode: "insensitive" } },
        { destination: { contains: query.search, mode: "insensitive" } },
        { passengerName: { contains: query.search, mode: "insensitive" } },
        { passengerPhone: { contains: query.search, mode: "insensitive" } },
        { driverName: { contains: query.search, mode: "insensitive" } },
        { vehiclePlate: { contains: query.search, mode: "insensitive" } },
        { user: { is: { OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { displayName: { contains: query.search, mode: "insensitive" } },
          { phoneNumber: { contains: query.search, mode: "insensitive" } },
        ] } } },
      ] } : {}),
    };
    const [data, total, all, pending, confirmed, completed, cancelled, inProgress, waitingDispatch, unsettled] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        select: {
          ...adminTripListSelect,
          ...(includeOrderUrls ? {
            orderUrls: {
              orderBy: { createdAt: "desc" as const },
              select: {
                id: true,
                tripId: true,
                driverId: true,
                source: true,
                createdByAdminId: true,
                reservedAt: true,
                acceptedAt: true,
                completedAt: true,
                provisionalDriverId: true,
                validFrom: true,
                validUntil: true,
                usedAt: true,
                revokedAt: true,
                createdAt: true,
                driver: { select: { id: true, name: true, phone: true } },
              },
            },
          } : {}),
        },
        orderBy: [{ createdAt: query.sortOrder }, { id: query.sortOrder }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.trip.count({ where }),
      prisma.trip.count(),
      prisma.trip.count({ where: { status: "PENDING" } }),
      prisma.trip.count({ where: { status: "CONFIRMED" } }),
      prisma.trip.count({ where: { status: "COMPLETED" } }),
      prisma.trip.count({ where: { status: "CANCELLED" } }),
      prisma.trip.count({ where: { executionPhase: "IN_PROGRESS" } }),
      prisma.trip.count({ where: { status: "CONFIRMED", executionPhase: "WAITING_DRIVER" } }),
      prisma.trip.count({ where: { status: "COMPLETED", driverId: { not: null }, settlement: { is: null } } }),
    ]);
    const summary: Record<string, unknown> = {
      total: all,
      pending,
      confirmed,
      completed,
      cancelled,
      inProgress,
      waitingDispatch,
      unsettled,
    };
    if (mode === "settlements") {
      const eligibleWhere: Prisma.TripWhereInput = {
        status: "COMPLETED",
        driverId: { not: null },
      };
      const [eligible, globalUnsettled, settled, unsettledTotals, settledTotals] = await prisma.$transaction([
        prisma.trip.count({ where: eligibleWhere }),
        prisma.trip.count({ where: { ...eligibleWhere, settlement: { is: null } } }),
        prisma.trip.count({ where: { ...eligibleWhere, settlement: { isNot: null } } }),
        prisma.trip.groupBy({
          by: ["driverPayoutCurrency"],
          where: { ...eligibleWhere, settlement: { is: null } },
          orderBy: { driverPayoutCurrency: "asc" },
          _sum: { driverPayoutAmount: true },
        }),
        prisma.trip.groupBy({
          by: ["driverPayoutCurrency"],
          where: { ...eligibleWhere, settlement: { isNot: null } },
          orderBy: { driverPayoutCurrency: "asc" },
          _sum: { driverPayoutAmount: true },
        }),
      ]);
      const payoutTotals = (items: typeof unsettledTotals) => items.map((item) => ({
        driverPayoutCurrency: item.driverPayoutCurrency || "HKD",
        driverPayoutAmount: item._sum?.driverPayoutAmount || 0,
      }));
      Object.assign(summary, {
        eligible,
        unsettled: globalUnsettled,
        settled,
        unsettledTotal: payoutTotals(unsettledTotals),
        settledTotal: payoutTotals(settledTotals),
      });
    } else if (mode === "dispatch") {
      const now = new Date();
      const [waiting, activeOrderUrls] = await prisma.$transaction([
        prisma.trip.count({
          where: {
            driverId: null,
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
        prisma.tripOrderUrl.count({
          where: {
            usedAt: null,
            revokedAt: null,
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
        }),
      ]);
      Object.assign(summary, {
        total: all,
        unassigned: waiting,
        waiting,
        activeOrderUrls,
      });
    }
    return adminListResponse(data.map(adminTripListResponse), total, query, summary);
  }
  @Post("trips") async createTrip(
    @Req() req: RequestLike,
    @Body() body: Partial<Prisma.TripUncheckedCreateInput>,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const userId = body.userId?.trim();
    const origin = body.origin?.trim();
    const destination = body.destination?.trim();
    const scheduledAt = parseScheduledAt(body.scheduledAt);
    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ] as const;
    const allowedExecutionPhases = [
      "WAITING_DRIVER",
      "DRIVER_ASSIGNED",
      "IN_PROGRESS",
    ] as const;
    const allowedRegions = ["HK", "MACAU", "GUANGDONG"] as const;
    if (
      !userId ||
      !origin ||
      !destination ||
      !body.region ||
      !allowedRegions.includes(
        body.region as (typeof allowedRegions)[number],
      ) ||
      Number.isNaN(scheduledAt.getTime()) ||
      !body.status ||
      !allowedStatuses.includes(
        body.status as (typeof allowedStatuses)[number],
      ) ||
      (body.executionPhase !== undefined &&
        body.executionPhase !== null &&
        !allowedExecutionPhases.includes(
          body.executionPhase as (typeof allowedExecutionPhases)[number],
        ))
    )
      throw new HttpException(
        "Valid trip fields are required",
        HttpStatus.BAD_REQUEST,
      );
    if (
      body.driverId &&
      !(await prisma.driver.findUnique({
        where: { id: body.driverId },
        select: { id: true },
      }))
    )
      throw new HttpException("Driver not found", HttpStatus.BAD_REQUEST);
    if (
      !(await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }))
    )
      throw new HttpException("User not found", HttpStatus.BAD_REQUEST);
    const trip = await prisma.trip.create({
      data: {
        userId,
        origin,
        destination,
        region: body.region as any,
        scheduledAt,
        status: body.status as any,
        executionPhase:
          body.status === "CONFIRMED"
            ? (body.executionPhase as any) || "WAITING_DRIVER"
            : null,
        driverId: body.driverId?.trim() || null,
        driverName: body.driverName || null,
        driverPhone: body.driverPhone || null,
        vehiclePlate: body.vehiclePlate || null,
      },
      include: { user: true },
    });
    return {
      ...trip,
      scheduledAt: trip.scheduledAt.toISOString(),
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      user: userResponse(trip.user),
    };
  }
  @Get("trips/:id") async getTrip(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    const trip = await prisma.trip.findUnique({
      where: { id },
      select: adminTripDetailSelect,
    });
    if (!trip)
      throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    return tripResponse(trip);
  }

  @Post("trips/:id") async updateTrip(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: Partial<Prisma.TripUncheckedCreateInput>,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    const origin = body.origin?.trim();
    const destination = body.destination?.trim();
    const scheduledAt =
      body.scheduledAt == null
        ? existing.scheduledAt
        : parseScheduledAt(body.scheduledAt);
    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ] as const;
    const allowedExecutionPhases = [
      "WAITING_DRIVER",
      "DRIVER_PENDING_ACCEPTANCE",
      "DRIVER_ASSIGNED",
      "IN_PROGRESS",
    ] as const;
    if (
      !origin ||
      !destination ||
      !body.region?.trim() ||
      Number.isNaN(scheduledAt.getTime()) ||
      !body.status ||
      !allowedStatuses.includes(
        body.status as (typeof allowedStatuses)[number],
      ) ||
      (body.executionPhase !== undefined &&
        body.executionPhase !== null &&
        !allowedExecutionPhases.includes(
          body.executionPhase as (typeof allowedExecutionPhases)[number],
        ))
    )
      throw new HttpException(
        "Valid trip fields are required",
        HttpStatus.BAD_REQUEST,
      );
    if (
      body.userId &&
      !(await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true },
      }))
    )
      throw new HttpException("User not found", HttpStatus.BAD_REQUEST);
    const requestedDriver = body.driverId
      ? await prisma.driver.findUnique({
          where: { id: body.driverId },
          select: {
            id: true,
            name: true,
            phoneCountryCode: true,
            phone: true,
            vehicleAssignments: {
              where: { enabled: true, vehicle: { enabled: true } },
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              take: 1,
              select: {
                vehicle: {
                  select: { hkPlate: true, macauPlate: true, mainlandPlate: true },
                },
              },
            },
          },
        })
      : null;
    if (body.driverId && (!requestedDriver || !requestedDriver.vehicleAssignments[0]))
      throw new HttpException("Driver or assigned vehicle not found", HttpStatus.BAD_REQUEST);
    if (
      body.status === "CANCELLED" &&
      (existing.status === "COMPLETED" ||
        existing.executionPhase === "IN_PROGRESS")
    )
      throw new HttpException(
        "Completed or in-progress trips cannot be cancelled",
        HttpStatus.CONFLICT,
      );
    const requestedVehicle = requestedDriver?.vehicleAssignments[0]?.vehicle;
    const assigningNewDriver = Boolean(
      requestedDriver && requestedDriver.id !== existing.driverId,
    );
    const region = body.region.trim();
    const result = await prisma.$transaction(async (tx) => {
      const currentTrip = await tx.trip.findUniqueOrThrow({
        where: { id },
        select: {
          status: true,
          userId: true,
          driverId: true,
          acceptedAt: true,
        },
      });
      const payment = await tx.payment.findUnique({ where: { tripId: id } });
      if (
        body.status === "CANCELLED" &&
        currentTrip.status !== "CANCELLED" &&
        payment?.status === "PAID"
      ) {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: currentTrip.userId },
        });
        const fareBalance = roundMoney(user.fareBalance + payment.fareAmount);
        const cashBalance = roundMoney(user.cashBalance + payment.cashAmount);
        await tx.user.update({
          where: { id: user.id },
          data: { fareBalance, cashBalance },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
        if (payment.fareAmount > 0)
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              wallet: "FARE",
              type: "REFUND",
              amount: payment.fareAmount,
              balanceAfter: fareBalance,
              reason: `訂單退款 - 車費餘額 (訂單: ${id.slice(-8)})`,
              paymentId: payment.id,
            },
          });
        if (payment.cashAmount > 0)
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              wallet: "CASH",
              type: "REFUND",
              amount: payment.cashAmount,
              balanceAfter: cashBalance,
              reason: `訂單退款 - 現金餘額 (訂單: ${id.slice(-8)})`,
              paymentId: payment.id,
            },
          });
      }
      const trip = await tx.trip.update({
        where: { id },
        data: {
          userId: body.userId || existing.userId,
          origin,
          destination,
          region: region as any,
          scheduledAt,
          status: body.status as any,
          cancelledAt:
            body.status === "CANCELLED" && currentTrip.status !== "CANCELLED"
              ? new Date()
              : body.status !== "CANCELLED"
                ? null
                : undefined,
          cancellationSource:
            body.status === "CANCELLED" && currentTrip.status !== "CANCELLED"
              ? "PLATFORM"
              : body.status !== "CANCELLED"
                ? null
                : undefined,
          executionPhase:
            body.status !== "CONFIRMED"
              ? null
              : assigningNewDriver
                ? "DRIVER_PENDING_ACCEPTANCE"
                : (body.executionPhase as any) ||
                  existing.executionPhase ||
                  "WAITING_DRIVER",
          driverId: body.driverId ?? existing.driverId,
          driverName: assigningNewDriver
            ? requestedDriver!.name
            : (body.driverName ?? existing.driverName),
          driverPhone: assigningNewDriver
            ? `${requestedDriver!.phoneCountryCode} ${requestedDriver!.phone}`
            : (body.driverPhone ?? existing.driverPhone),
          vehiclePlate: assigningNewDriver
            ? requestedVehicle!.hkPlate
            : (body.vehiclePlate ?? existing.vehiclePlate),
          vehicleHkPlate: assigningNewDriver
            ? requestedVehicle!.hkPlate
            : undefined,
          vehicleMacauPlate: assigningNewDriver
            ? requestedVehicle!.macauPlate
            : undefined,
          vehicleMainlandPlate: assigningNewDriver
            ? requestedVehicle!.mainlandPlate
            : undefined,
          acceptedAt: assigningNewDriver ? null : undefined,
          assignedAt: assigningNewDriver ? new Date() : undefined,
        },
        include: { user: true },
      });
      const cancelledDriverId =
        body.status === "CANCELLED" &&
        currentTrip.status !== "CANCELLED" &&
        currentTrip.driverId &&
        currentTrip.acceptedAt
          ? currentTrip.driverId
          : null;
      if (cancelledDriverId) {
        await tx.notification.create({
          data: {
            title: "行程已取消",
            content: "後台管理已取消此行程，請停止前往。",
            audience: "driver",
            templateType: "trip_cancelled",
            important: true,
            driverId: cancelledDriverId,
            tripId: id,
          },
        });
      }
      return { trip, cancelledDriverId };
    });
    if (assigningNewDriver) {
      await publishDriverOrderEvent({ reason: "available", tripId: id });
    }
    if (result.cancelledDriverId) {
      await publishDriverOrderEvent({
        reason: "cancelled",
        tripId: id,
        driverId: result.cancelledDriverId,
      });
    }
    const trip = result.trip;
    return {
      ...trip,
      scheduledAt: trip.scheduledAt.toISOString(),
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      user: userResponse(trip.user),
    };
  }
  @Post("trips/:id/settlement") async settleTrip(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { method?: string },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const method = body.method?.trim();
    if (!method)
      throw new HttpException(
        "Settlement method is required",
        HttpStatus.BAD_REQUEST,
      );
    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, driverId: true, status: true },
    });
    if (!trip) throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    if (!trip.driverId || trip.status !== "COMPLETED")
      throw new HttpException(
        "Only completed trips assigned to a driver can be settled",
        HttpStatus.CONFLICT,
      );
    const settlement = await prisma.driverSettlement.upsert({
      where: { tripId: id },
      create: {
        id: `settlement-${Date.now()}-${randomBytes(4).toString("hex")}`,
        tripId: id,
        driverId: trip.driverId,
        method,
      },
      update: { driverId: trip.driverId, method, settledAt: new Date() },
    });
    return {
      ...settlement,
      settledAt: settlement.settledAt.toISOString(),
      createdAt: settlement.createdAt.toISOString(),
    };
  }
  @Post("trips/:id/settlement/unsettle") async unsettleTrip(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const settlement = await prisma.driverSettlement.findUnique({
      where: { tripId: id },
    });
    if (!settlement)
      throw new HttpException(
        "Trip is already unsettled",
        HttpStatus.NOT_FOUND,
      );
    await prisma.driverSettlement.delete({ where: { tripId: id } });
    return { ok: true };
  }
  @Post("trips/:id/dispatch") async dispatchTrip(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { driverId?: string; driverPayoutAmount?: unknown },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const driverId = body.driverId?.trim();
    const driverPayoutAmount = Number(body.driverPayoutAmount);
    if (!driverId)
      throw new HttpException("Driver is required", HttpStatus.BAD_REQUEST);
    if (!Number.isFinite(driverPayoutAmount) || driverPayoutAmount < 0)
      throw new HttpException(
        "A valid driver payout amount is required",
        HttpStatus.BAD_REQUEST,
      );
    const [trip, driver, settings] = await Promise.all([
      prisma.trip.findUnique({ where: { id }, include: { payment: true } }),
      prisma.driver.findUnique({ where: { id: driverId } }),
      prisma.appSetting.findUniqueOrThrow({
        where: { id: appSettingsDefaults.id },
      }),
    ]);
    if (!trip) throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    const activeOrderUrlCount = await prisma.tripOrderUrl.count({
      where: { tripId: id, revokedAt: null },
    });
    if (activeOrderUrlCount > 0)
      throw new HttpException(
        "This trip is reserved for URL acceptance",
        HttpStatus.CONFLICT,
      );
    if (!driver)
      throw new HttpException("Driver not found", HttpStatus.BAD_REQUEST);
    requireReviewedDriver(driver);
    const isWaitingForDriver =
      trip.status === "CONFIRMED" &&
      trip.executionPhase === "WAITING_DRIVER" &&
      !trip.driverId;
    const canBeOpenedManually =
      trip.status === "CONFIRMED" &&
      trip.executionPhase === null &&
      !trip.driverId &&
      trip.scheduledAt > tripOfferCutoff();
    if (!isWaitingForDriver && !canBeOpenedManually)
      throw new HttpException(
        "This trip is not open for dispatch",
        HttpStatus.CONFLICT,
      );
    if (!trip.payment || trip.payment.status !== "PAID")
      throw new HttpException(
        "Only paid trips can be dispatched",
        HttpStatus.CONFLICT,
      );
    const assignedVehicle = await requireActiveDriverVehicle(prisma, driver.id);
    const driverPayoutPercentage =
      trip.driverPayoutPercentage ?? settings.driverPayoutPercentage;
    const driverPayoutCalculatedAmount =
      trip.driverPayoutCalculatedAmount ??
      roundMoney((trip.payment.total * driverPayoutPercentage) / 100);
    const updated = await prisma.trip.update({
      where: { id },
      data: {
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: `${driver.phoneCountryCode} ${driver.phone}`,
        ...tripVehicleSnapshot(assignedVehicle),
        driverPayoutPercentage,
        driverPayoutCalculatedAmount,
        driverPayoutAmount: roundMoney(driverPayoutAmount),
        driverPayoutCurrency:
          trip.driverPayoutCurrency || trip.payment.currency,
        status: "CONFIRMED",
        executionPhase: "DRIVER_PENDING_ACCEPTANCE",
        assignedAt: new Date(),
        acceptedAt: null,
      },
      include: { user: true, driver: true },
    });
    await publishDriverOrderEvent({ reason: "available", tripId: id });
    return {
      ...updated,
      scheduledAt: updated.scheduledAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      user: userResponse(updated.user),
    };
  }
  @Post("trips/:id/order-url")
  async createOrderUrl(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body()
    body: { driverId?: string; validFrom?: string; validUntil?: string },
  ) {
    const session = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const validFrom = new Date(body.validFrom || "");
    const validUntil = new Date(body.validUntil || "");
    if (
      Number.isNaN(validFrom.getTime()) ||
      Number.isNaN(validUntil.getTime()) ||
      validFrom >= validUntil
    )
      throw new HttpException(
        "Valid URL date range is required",
        HttpStatus.BAD_REQUEST,
      );
    const [trip, driver] = await Promise.all([
      prisma.trip.findUnique({ where: { id }, include: { payment: true } }),
      body.driverId
        ? prisma.driver.findUnique({ where: { id: body.driverId.trim() } })
        : null,
    ]);
    if (!trip) throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    if (trip.status !== "CONFIRMED" || trip.executionPhase !== "WAITING_DRIVER")
      throw new HttpException(
        "This trip is not open for driver order URLs",
        HttpStatus.CONFLICT,
      );
    if (!trip.payment || trip.payment.status !== "PAID")
      throw new HttpException(
        "Only paid trips can create an order URL",
        HttpStatus.CONFLICT,
      );
    if (body.driverId && !driver)
      throw new HttpException("Driver not found", HttpStatus.BAD_REQUEST);
    if (driver) requireReviewedDriver(driver);
    const existingOrderUrl = await prisma.tripOrderUrl.findFirst({
      where: { tripId: id, revokedAt: null },
      select: { id: true },
    });
    if (existingOrderUrl)
      throw new HttpException(
        "This trip already has an order URL. Revoke it before creating another one",
        HttpStatus.CONFLICT,
      );
    const token = randomBytes(32).toString("base64url");
    const url = orderUrlValue(token);
    const item = await prisma.tripOrderUrl
      .create({
        data: {
          tokenHash: orderUrlTokenHash(token),
          encryptedToken: encryptOrderUrlToken(token),
          tripId: id,
          driverId: driver?.id || null,
          source: "ADMIN",
          createdByAdminId: session.sub,
          validFrom,
          validUntil,
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          throw new HttpException(
            "This trip already has an order URL. Revoke it before creating another one",
            HttpStatus.CONFLICT,
          );
        throw error;
      });
    await publishDriverOrderEvent({ reason: "taken", tripId: id });
    return {
      id: item.id,
      token,
      url,
      tripId: id,
      driverId: item.driverId,
      validFrom: validFrom.toISOString(),
      validUntil: validUntil.toISOString(),
      usedAt: null,
      revokedAt: null,
    };
  }
  @Get("trips/:id/order-urls")
  async listOrderUrls(@Req() req: RequestLike, @Param("id") id: string) {
    requireAuth(req);
    const data = await prisma.tripOrderUrl.findMany({
      where: { tripId: id },
      include: { driver: true, provisionalDriver: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      data: data.map((item) => ({
        id: item.id,
        tripId: item.tripId,
        source: item.source,
        createdByAdminId: item.createdByAdminId,
        driver: item.driver ? driverResponse(item.driver) : null,
        provisionalDriver: item.provisionalDriver
          ? driverResponse(item.provisionalDriver)
          : null,
        validFrom: item.validFrom.toISOString(),
        validUntil: item.validUntil.toISOString(),
        reservedAt: item.reservedAt?.toISOString() || null,
        acceptedAt: item.acceptedAt?.toISOString() || null,
        completedAt: item.completedAt?.toISOString() || null,
        usedAt: item.usedAt?.toISOString() || null,
        revokedAt: item.revokedAt?.toISOString() || null,
        createdAt: item.createdAt.toISOString(),
        lifecycleStatus: item.revokedAt
          ? "REVOKED"
          : item.completedAt
            ? "COMPLETED"
            : item.acceptedAt
              ? "ACCEPTED"
              : item.reservedAt
                ? "RESERVED"
                : item.usedAt
                  ? "USED"
                  : new Date() > item.validUntil
                    ? "EXPIRED"
                    : "ACTIVE",
      })),
      total: data.length,
    };
  }
  @Post("trips/:id/order-urls/:urlId/copy")
  async copyOrderUrl(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Param("urlId") urlId: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const item = await prisma.tripOrderUrl.findFirst({
      where: { id: urlId, tripId: id },
      include: { trip: true },
    });
    if (!item)
      throw new HttpException("Order URL not found", HttpStatus.NOT_FOUND);
    if (item.revokedAt || item.trip.status === "CANCELLED" || item.trip.cancelledAt)
      throw new HttpException("This order URL is no longer available", HttpStatus.CONFLICT);
    let token: string;
    let rotated = false;
    if (item.encryptedToken) {
      token = decryptOrderUrlToken(item.encryptedToken);
    } else {
      rotated = true;
      token = randomBytes(32).toString("base64url");
      await prisma.tripOrderUrl.update({
        where: { id: item.id },
        data: {
          tokenHash: orderUrlTokenHash(token),
          encryptedToken: encryptOrderUrlToken(token),
        },
      });
    }
    return { id: item.id, url: orderUrlValue(token), rotated };
  }
  @Post("trips/:id/order-urls/:urlId/expiry")
  async updateOrderUrlExpiry(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Param("urlId") urlId: string,
    @Body() body: { validUntil?: string },
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const validUntil = new Date(body.validUntil || "");
    if (Number.isNaN(validUntil.getTime()) || validUntil <= new Date())
      throw new HttpException(
        "URL expiry must be later than the current time",
        HttpStatus.BAD_REQUEST,
      );
    const item = await prisma.tripOrderUrl.findFirst({
      where: { id: urlId, tripId: id },
      include: { trip: true },
    });
    if (!item)
      throw new HttpException("Order URL not found", HttpStatus.NOT_FOUND);
    if (item.revokedAt)
      throw new HttpException("Revoked order URLs cannot be changed", HttpStatus.CONFLICT);
    if (item.trip.status === "CANCELLED" || item.trip.cancelledAt)
      throw new HttpException("Cancelled trip order URLs cannot be changed", HttpStatus.CONFLICT);
    const updated = await prisma.tripOrderUrl.update({
      where: { id: urlId },
      data: { validUntil },
    });
    return {
      id: updated.id,
      validUntil: updated.validUntil.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
  @Post("trips/:id/order-urls/:urlId/revoke")
  async revokeOrderUrl(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Param("urlId") urlId: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const item = await prisma.tripOrderUrl.findFirst({
      where: { id: urlId, tripId: id },
    });
    if (!item)
      throw new HttpException("Order URL not found", HttpStatus.NOT_FOUND);
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.tripOrderUrl.update({
        where: { id: urlId },
        data: { revokedAt: new Date() },
      });
      await tx.provisionalDriverSession.updateMany({
        where: { orderUrlId: urlId, revokedAt: null },
        data: { revokedAt: result.revokedAt },
      });
      return result;
    });
    if (!item.revokedAt)
      await publishDriverOrderEvent({ reason: "available", tripId: id });
    return {
      id: updated.id,
      revokedAt: updated.revokedAt?.toISOString() || null,
    };
  }
  @Get("charter-orders") async listCharterOrders(@Req() req: RequestLike) {
    requireAuth(req);
    const usersById = new Map(
      (await prisma.user.findMany()).map((user) => [
        user.id,
        userResponse(user),
      ]),
    );
    return {
      data: charterOrders.map((order) => ({
        ...order,
        user: usersById.get(order.userId) || null,
      })),
      total: charterOrders.length,
    };
  }
  @Post("charter-orders/:id") async updateCharterOrder(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: Partial<CharterOrder>,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const order = charterOrders.find((item) => item.id === id);
    if (!order)
      throw new HttpException("Charter order not found", HttpStatus.NOT_FOUND);
    const origin = body.origin?.trim();
    const destination = body.destination?.trim();
    const scheduledAt = new Date(body.scheduledAt || order.scheduledAt);
    const durationHours = Number(body.durationHours);
    const statuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
    const regions = ["大陸", "香港", "澳門"];
    if (
      !origin ||
      !destination ||
      !body.originRegion ||
      !regions.includes(body.originRegion) ||
      !body.destinationRegion ||
      !regions.includes(body.destinationRegion) ||
      Number.isNaN(scheduledAt.getTime()) ||
      !Number.isFinite(durationHours) ||
      durationHours <= 0 ||
      !body.status ||
      !statuses.includes(body.status)
    )
      throw new HttpException(
        "Valid charter order fields are required",
        HttpStatus.BAD_REQUEST,
      );
    if (
      body.userId &&
      !(await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true },
      }))
    )
      throw new HttpException("User not found", HttpStatus.BAD_REQUEST);
    Object.assign(order, {
      userId: body.userId || order.userId,
      originRegion: body.originRegion,
      origin,
      destinationRegion: body.destinationRegion,
      destination,
      scheduledAt: scheduledAt.toISOString(),
      durationHours,
      status: body.status,
    });
    return order;
  }
  @Post("charter-orders/:id/status") updateCharterStatus(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: { status?: string },
  ) {
    requireAuth(req);
    const order = charterOrders.find((item) => item.id === id);
    if (!order)
      throw new HttpException("Charter order not found", HttpStatus.NOT_FOUND);
    const allowed = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
    if (!body.status || !allowed.includes(body.status))
      throw new HttpException(
        "Valid status is required",
        HttpStatus.BAD_REQUEST,
      );
    order.status = body.status;
    return order;
  }
  @Get("membership-plans") async listMembershipPlans(@Req() req: RequestLike) {
    requireAuth(req);
    const data = await prisma.membershipPlan.findMany({ orderBy: { order: "asc" } });
    return { data: data.map(membershipPlanResponse), total: data.length };
  }
  @Post("membership-plans") async saveMembershipPlan(
    @Req() req: RequestLike,
    @Body() body: Partial<MembershipPlan> & { description?: unknown; voucherCount?: unknown; mileageRate?: unknown },
  ) {
    requireAuth(req);
    const id = body.id?.trim();
    const name = body.name?.trim();
    const level = body.level?.trim();
    const monthly = Number(body.monthly);
    const yearly = Number(body.yearly);
    const voucherCount = Number(body.voucherCount ?? 0);
    const mileageRate = Number(body.mileageRate ?? 1);
    if (!id || !name || !level || !Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0 || !Number.isInteger(voucherCount) || voucherCount < 0 || !Number.isFinite(mileageRate) || mileageRate < 1 || mileageRate > 3)
      throw new HttpException("Valid membership plan fields are required", HttpStatus.BAD_REQUEST);
    const benefits = Array.isArray(body.benefits) ? body.benefits.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 8) : [];
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
      select: { pricingCurrency: true },
    });
    const currency = configuredCurrencyLabel(settings);
    const plan = await prisma.membershipPlan.upsert({
      where: { id },
      create: { id, level, name, description: typeof body.description === "string" ? body.description.trim() : "", monthlyPrice: monthly, yearlyPrice: yearly, currency, benefits, voucherCount, mileageRate, recommended: body.recommended ?? false, enabled: body.enabled ?? true, order: Number(body.order) || 1 },
      update: { level, name, description: typeof body.description === "string" ? body.description.trim() : "", monthlyPrice: monthly, yearlyPrice: yearly, currency, benefits, voucherCount, mileageRate, recommended: body.recommended ?? false, enabled: body.enabled ?? true, order: Number(body.order) || 1 },
    });
    return membershipPlanResponse(plan);
  }
  @Delete("membership-plans/:id") async deleteMembershipPlan(@Req() req: RequestLike, @Param("id") id: string) {
    requireAuth(req);
    const item = await prisma.membershipPlan.findUnique({ where: { id } });
    if (!item) throw new HttpException("Membership plan not found", HttpStatus.NOT_FOUND);
    await prisma.membershipPlan.update({ where: { id }, data: { enabled: false } });
    return { ok: true };
  }
  @Get("membership-orders") async listMembershipOrders(@Req() req: RequestLike) {
    requireAuth(req);
    const query = parseAdminListQuery(req);
    const status = adminQueryValue(req, "status");
    const billingPeriod = adminQueryValue(req, "billingPeriod");
    const planId = adminQueryValue(req, "planId");
    const where: Prisma.MembershipOrderWhereInput = {
      ...(status ? { status: status as any } : {}),
      ...(billingPeriod ? { billingPeriod: billingPeriod as any } : {}),
      ...(planId ? { planId } : {}),
      ...(query.search ? { OR: [
        { id: { contains: query.search, mode: "insensitive" } },
        { user: { is: { OR: [
          { id: { contains: query.search, mode: "insensitive" } },
          { name: { contains: query.search, mode: "insensitive" } },
          { displayName: { contains: query.search, mode: "insensitive" } },
          { phoneNumber: { contains: query.search, mode: "insensitive" } },
        ] } } },
        { plan: { is: { name: { contains: query.search, mode: "insensitive" } } } },
      ] } : {}),
    };
    const [data, total, all, pending, paid, cancelled] = await prisma.$transaction([
      prisma.membershipOrder.findMany({ where, include: { user: { select: { id: true, name: true, displayName: true, phoneNumber: true } }, plan: true, subscription: true }, orderBy: [{ createdAt: query.sortOrder }, { id: query.sortOrder }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.membershipOrder.count({ where }),
      prisma.membershipOrder.count(),
      prisma.membershipOrder.count({ where: { status: "PENDING" } }),
      prisma.membershipOrder.count({ where: { status: "PAID" } }),
      prisma.membershipOrder.count({ where: { status: "CANCELLED" } }),
    ]);
    return adminListResponse(data.map((order) => ({ ...order, plan: membershipPlanResponse(order.plan) })), total, query, { total: all, pending, paid, cancelled });
  }
  @Post("membership-orders/:id/confirm") async confirmMembershipOrder(@Req() req: RequestLike, @Param("id") id: string) {
    requireAuth(req);
    return prisma.$transaction(async (tx) => {
      const order = await tx.membershipOrder.findUnique({ where: { id }, include: { plan: true } });
      if (!order) throw new HttpException("Membership order not found", HttpStatus.NOT_FOUND);
      if (order.status === "CANCELLED") throw new HttpException("Cancelled order cannot be confirmed", HttpStatus.CONFLICT);
      if (order.status === "PAID") return { ok: true, subscriptionId: order.subscriptionId };
      const now = new Date();
      const periodEnd = new Date(now);
      if (order.billingPeriod === "MONTHLY") periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      const active = await tx.membershipSubscription.findFirst({ where: { userId: order.userId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
      const subscription = active
        ? await tx.membershipSubscription.update({ where: { id: active.id }, data: { planId: order.planId, billingPeriod: order.billingPeriod, currentPeriodStartsAt: now, currentPeriodEndsAt: periodEnd, cancelAtPeriodEnd: false, cancelledAt: null } })
        : await tx.membershipSubscription.create({ data: { userId: order.userId, planId: order.planId, billingPeriod: order.billingPeriod, currentPeriodStartsAt: now, currentPeriodEndsAt: periodEnd } });
      await tx.membershipOrder.update({ where: { id }, data: { status: "PAID", paidAt: now, subscriptionId: subscription.id } });
      await tx.user.update({ where: { id: order.userId }, data: { membershipLevel: order.plan.level } });
      await tx.membershipEvent.create({ data: { userId: order.userId, subscriptionId: subscription.id, orderId: order.id, type: "ACTIVATED", title: `${order.plan.name}已啟用`, details: { billingPeriod: order.billingPeriod, periodEndsAt: periodEnd.toISOString() } } });
      return { ok: true, subscriptionId: subscription.id };
    });
  }
  @Get("vehicle-categories") async listVehicleCategories(
    @Req() req: RequestLike,
  ) {
    requireAuth(req);
    const [data, total] = await prisma.$transaction([
      prisma.vehicleCategory.findMany({ orderBy: { order: "asc" } }),
      prisma.vehicleCategory.count(),
    ]);
    return { data: data.map(vehicleCategoryResponse), total };
  }
  @Post("vehicle-categories") async saveVehicleCategory(
    @Req() req: RequestLike,
    @Body() body: Partial<VehicleCategory>,
  ) {
    requireAuth(req);
    if (!validVehicleCategory(body))
      throw new HttpException(
        "Category id, name and tab label are required",
        HttpStatus.BAD_REQUEST,
      );
    const existing = await prisma.vehicleCategory.findUnique({
      where: { id: body.id },
    });
    if (existing)
      return vehicleCategoryResponse(
        await prisma.vehicleCategory.update({
          where: { id: existing.id },
          data: {
            name: body.name!.trim(),
            tabLabel: body.tabLabel!.trim(),
            order: Number(body.order) || existing.order,
            enabled: body.enabled ?? existing.enabled,
          },
        }),
      );
    const order =
      Number(body.order) || (await prisma.vehicleCategory.count()) + 1;
    const item = {
      id: body.id!,
      name: body.name!.trim(),
      tabLabel: body.tabLabel!.trim(),
      order,
      enabled: body.enabled ?? true,
    };
    const pricing = defaultDistancePricing(item.id);
    return prisma.$transaction(async (tx) => {
      const category = await tx.vehicleCategory.create({ data: item });
      await tx.categoryDistancePricing.create({
        data: {
          categoryId: item.id,
          minimumFare: pricing.minimumFare,
          currency: pricing.currency,
          tiers: { create: pricing.tiers },
        },
      });
      return vehicleCategoryResponse(category);
    });
  }
  @Delete("vehicle-categories/:id") async deleteVehicleCategory(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    const category = await prisma.vehicleCategory.findUnique({ where: { id } });
    if (!category)
      throw new HttpException(
        "Vehicle category not found",
        HttpStatus.NOT_FOUND,
      );
    await prisma.$transaction([
      prisma.vehicle.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      prisma.vehicleCategory.delete({ where: { id } }),
    ]);
    return { ok: true };
  }
  @Get("vehicles") async listVehicles(@Req() req: RequestLike) {
    requireAuth(req);
    const [data, total] = await prisma.$transaction([
      prisma.vehicle.findMany({ orderBy: { order: "asc" } }),
      prisma.vehicle.count(),
    ]);
    return { data: data.map(vehicleResponse), total };
  }
  @Post("vehicles")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "vehicleImage", maxCount: 1 },
        { name: "vehicleLogo", maxCount: 1 },
      ],
      {
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (_req, file, callback) => {
          if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
            callback(
              new BadRequestException(
                "Vehicle image and logo must be JPEG, PNG, or WebP",
              ),
              false,
            );
            return;
          }
          callback(null, true);
        },
      },
    ),
  )
  async saveVehicle(
    @Req() req: RequestLike,
    @Body() body: Omit<Partial<VehicleCatalogItem>, "enabled"> & { enabled?: boolean | string; removeVehicleImage?: string; removeVehicleLogo?: string },
    @UploadedFiles() files?: { vehicleImage?: Express.Multer.File[]; vehicleLogo?: Express.Multer.File[] },
  ) {
    requireAuth(req);
    const vehicleImage = files?.vehicleImage?.[0];
    const vehicleLogo = files?.vehicleLogo?.[0];
    const [category, existing] = await Promise.all([
      prisma.vehicleCategory.findUnique({
        where: { id: body.categoryId || "" },
      }),
      body.id ? prisma.vehicle.findUnique({ where: { id: body.id } }) : null,
    ]);
    const seats = Number(body.seats);
    const image = body.image?.trim() || existing?.image || "";
    const removeVehicleImage = body.removeVehicleImage === "true";
    const removeVehicleLogo = body.removeVehicleLogo === "true";
    const hasImage = Boolean(
      vehicleImage ||
      image ||
      (!removeVehicleImage && existing?.imageData && existing.imageMime),
    );
    if (
      !category ||
      !body.id ||
      !body.model?.trim() ||
      !Number.isInteger(seats) ||
      seats <= 0 ||
      !hasImage
    )
      throw new HttpException(
        "Valid vehicle fields are required",
        HttpStatus.BAD_REQUEST,
      );
    const vehicleId = body.id;
    const enabled = typeof body.enabled === "string" ? body.enabled === "true" : body.enabled ?? true;
    const values = {
      categoryId: body.categoryId!,
      brand: body.brand?.trim() || "",
      model: body.model.trim(),
      series: body.series?.trim() || "",
      seats,
      image,
      ...(vehicleImage ? { imageData: new Uint8Array(vehicleImage.buffer), imageMime: vehicleImage.mimetype } : {}),
      ...(!vehicleImage && removeVehicleImage ? { imageData: null, imageMime: null } : {}),
      ...(vehicleLogo ? { logoData: new Uint8Array(vehicleLogo.buffer), logoMime: vehicleLogo.mimetype } : {}),
      ...(!vehicleLogo && removeVehicleLogo ? { logoData: null, logoMime: null } : {}),
      colorLabel: body.colorLabel?.trim() || "不限顏色",
      modelChoiceLabel: body.modelChoiceLabel?.trim() || "",
      enabled,
      order:
        Number(body.order) ||
        existing?.order ||
        (await prisma.vehicle.count()) + 1,
    };
    return prisma.$transaction(async (tx) => {
      const vehicle = existing
        ? await tx.vehicle.update({
            where: { id: existing.id },
            data: values,
          })
        : await tx.vehicle.create({ data: { id: vehicleId, ...values } });
      await tx.fareQuoteVehicleSnapshot.updateMany({
        where: { vehicleId: vehicle.id },
        data: {
          image: vehicleImagePath(vehicle),
          logo: vehicleLogoPath(vehicle),
        },
      });
      return vehicleResponse(vehicle);
    });
  }
  @Delete("vehicles/:id") async deleteVehicle(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    const item = await prisma.vehicle.findUnique({ where: { id } });
    if (!item)
      throw new HttpException("Vehicle not found", HttpStatus.NOT_FOUND);
    await prisma.vehicle.update({ where: { id }, data: { enabled: false } });
    return { ok: true };
  }

  @Get("vehicle-extras") async listVehicleExtras(@Req() req: RequestLike) {
    requireAuth(req);
    const [data, total] = await prisma.$transaction([
      prisma.vehicleExtra.findMany({
        orderBy: [{ order: "asc" }, { id: "asc" }],
      }),
      prisma.vehicleExtra.count(),
    ]);
    return { data: data.map(vehicleExtraResponse), total };
  }
  @Post("vehicle-extras") async saveVehicleExtra(
    @Req() req: RequestLike,
    @Body() body: Partial<VehicleExtraOption>,
  ) {
    requireAuth(req);
    const existing = body.id
      ? await prisma.vehicleExtra.findUnique({ where: { id: body.id } })
      : null;
    const price = Number(body.price);
    if (!body.id || !body.label?.trim() || !Number.isFinite(price) || price < 0)
      throw new HttpException(
        "Valid extra option fields are required",
        HttpStatus.BAD_REQUEST,
      );
    const rawRequiredWithinMinutes = body.requiredWithinMinutes as unknown;
    const requiredWithinMinutes =
      rawRequiredWithinMinutes === undefined ||
      rawRequiredWithinMinutes === null ||
      rawRequiredWithinMinutes === ""
        ? null
        : Number(rawRequiredWithinMinutes);
    if (
      requiredWithinMinutes !== null &&
      (!Number.isInteger(requiredWithinMinutes) ||
        requiredWithinMinutes <= 0 ||
        requiredWithinMinutes > 24 * 60)
    )
      throw new HttpException(
        "Required time window must be between 1 and 1440 minutes",
        HttpStatus.BAD_REQUEST,
      );
    const triggerType = normalizeTriggerType(
      body.triggerType,
      body.requiredForImmediate === true,
    );
    const nightStartTime =
      body.nightStartTime === null || body.nightStartTime === ""
        ? null
        : String(body.nightStartTime);
    const nightEndTime =
      body.nightEndTime === null || body.nightEndTime === ""
        ? null
        : String(body.nightEndTime);
    if (
      triggerType === "NIGHT" &&
      (timeToMinutes(nightStartTime) === null ||
        timeToMinutes(nightEndTime) === null)
    )
      throw new HttpException(
        "Night trigger requires valid start and end times",
        HttpStatus.BAD_REQUEST,
      );
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const values = {
      name: body.name?.trim() || body.id,
      label: body.label.trim(),
      price,
      currency: configuredCurrencyLabel(settings),
      enabled: body.enabled ?? true,
      order:
        Number(body.order) ||
        existing?.order ||
        (await prisma.vehicleExtra.count()) + 1,
      requiredForImmediate: triggerType === "IMMEDIATE",
      requiredWithinMinutes:
        triggerType === "IMMEDIATE" ? requiredWithinMinutes : null,
      triggerType,
      triggerEnabled: body.triggerEnabled ?? true,
      nightStartTime: triggerType === "NIGHT" ? nightStartTime : null,
      nightEndTime: triggerType === "NIGHT" ? nightEndTime : null,
    };
    return vehicleExtraResponse(
      existing
        ? await prisma.vehicleExtra.update({
            where: { id: existing.id },
            data: values,
          })
        : await prisma.vehicleExtra.create({
            data: { id: body.id, ...values },
          }),
    );
  }
  @Delete("vehicle-extras/:id") async deleteVehicleExtra(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireAuth(req);
    const item = await prisma.vehicleExtra.findUnique({ where: { id } });
    if (!item)
      throw new HttpException("Extra option not found", HttpStatus.NOT_FOUND);
    await prisma.vehicleExtra.update({
      where: { id },
      data: { enabled: false },
    });
    return { ok: true };
  }
  @Get("distance-pricing") async getDistancePricing(@Req() req: RequestLike) {
    requireAuth(req);
    const categories = await prisma.vehicleCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        distancePricing: { include: { tiers: { orderBy: { order: "asc" } } } },
      },
    });
    return {
      data: categories.flatMap((category) =>
        category.distancePricing
          ? [
              {
                ...pricingResponse(category.distancePricing),
                category: {
                  id: category.id,
                  name: category.name,
                  tabLabel: category.tabLabel,
                  enabled: category.enabled,
                },
              },
            ]
          : [],
      ),
    };
  }
  @Post("distance-pricing/currency") async switchDistancePricingCurrency(
    @Req() req: RequestLike,
    @Body() body: { currency?: string },
  ) {
    requireAuth(req);
    if (body.currency !== "RMB" && body.currency !== "HKD")
      throw new HttpException(
        "Currency must be RMB or HKD",
        HttpStatus.BAD_REQUEST,
      );
    const targetLabel = currencyLabels[body.currency];
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    await prisma.$transaction([
      prisma.appSetting.update({
        where: { id: settings.id },
        data: { pricingCurrency: body.currency },
      }),
      prisma.categoryDistancePricing.updateMany({
        data: { currency: targetLabel },
      }),
      prisma.vehicleExtra.updateMany({ data: { currency: targetLabel } }),
      prisma.routeMinimumFare.updateMany({ data: { currency: targetLabel } }),
      prisma.promotion.updateMany({ data: { currency: targetLabel } }),
    ]);
    const data = await prisma.categoryDistancePricing.findMany({
      orderBy: { category: { order: "asc" } },
      include: { tiers: { orderBy: { order: "asc" } } },
    });
    return { currency: targetLabel, data: data.map(pricingResponse) };
  }
  @Post("distance-pricing/:categoryId") async saveDistancePricing(
    @Req() req: RequestLike,
    @Param("categoryId") categoryId: string,
    @Body() body: Partial<DistancePricingSettings>,
  ) {
    requireAuth(req);
    if (
      !(await prisma.vehicleCategory.findUnique({ where: { id: categoryId } }))
    )
      throw new HttpException(
        "Vehicle category not found",
        HttpStatus.NOT_FOUND,
      );
    const appSettings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const settings = {
      ...parseDistancePricing(categoryId, body),
      currency: configuredCurrencyLabel(appSettings),
    };
    const pricing = await prisma.categoryDistancePricing.upsert({
      where: { categoryId },
      create: {
        categoryId,
        minimumFare: settings.minimumFare,
        currency: settings.currency,
        tiers: { create: settings.tiers },
      },
      update: {
        minimumFare: settings.minimumFare,
        currency: settings.currency,
        tiers: { deleteMany: {}, create: settings.tiers },
      },
      include: { tiers: { orderBy: { order: "asc" } } },
    });
    return pricingResponse(pricing);
  }
  @Post("distance-pricing/:categoryId/calculate") async previewDistancePricing(
    @Req() req: RequestLike,
    @Param("categoryId") categoryId: string,
    @Body() body: { distanceKm?: number },
  ) {
    requireAuth(req);
    const pricing = await prisma.categoryDistancePricing.findUnique({
      where: { categoryId },
      include: { tiers: { orderBy: { order: "asc" } } },
    });
    if (!pricing)
      throw new HttpException(
        "Vehicle category pricing not found",
        HttpStatus.NOT_FOUND,
      );
    const distanceKm = Number(body.distanceKm);
    if (!Number.isFinite(distanceKm) || distanceKm < 0)
      throw new HttpException(
        "Valid distance is required",
        HttpStatus.BAD_REQUEST,
      );
    return {
      categoryId,
      distanceKm,
      fare: calculateDistanceFare(distanceKm, pricing),
      currency: pricing.currency,
    };
  }
  @Get("route-minimum-fares") async listRouteMinimumFares(
    @Req() req: RequestLike,
  ) {
    requireAuth(req);
    const data = await prisma.routeMinimumFare.findMany({
      orderBy: [
        { originRegion: "asc" },
        { destinationRegion: "asc" },
        { createdAt: "asc" },
      ],
    });
    return { data: data.map(routeMinimumFareResponse) };
  }
  @Post("route-minimum-fares") async saveRouteMinimumFare(
    @Req() req: RequestLike,
    @Body() body: Partial<RouteMinimumFareSettings>,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const appSettings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const values = {
      ...parseRouteMinimumFare(body),
      currency: configuredCurrencyLabel(appSettings),
    };
    if (
      values.categoryId &&
      !(await prisma.vehicleCategory.findUnique({
        where: { id: values.categoryId },
      }))
    ) {
      throw new HttpException(
        "Vehicle category not found",
        HttpStatus.NOT_FOUND,
      );
    }
    const mirrorWhere = {
      originRegion: values.destinationRegion,
      originCity: values.destinationCity,
      destinationRegion: values.originRegion,
      destinationCity: values.originCity,
      categoryId: values.categoryId,
    };
    const item = await prisma.$transaction(async (tx) => {
      const current = body.id
        ? await tx.routeMinimumFare.findUnique({ where: { id: body.id } })
        : null;
      if (body.id && !current)
        throw new HttpException(
          "Route minimum fare not found",
          HttpStatus.NOT_FOUND,
        );
      const saved = current
        ? await tx.routeMinimumFare.update({
            where: { id: current.id },
            data: values,
          })
        : await tx.routeMinimumFare.create({ data: values });
      const mirror = await tx.routeMinimumFare.findFirst({
        where: { ...mirrorWhere, id: { not: saved.id } },
      });
      const mirrorValues = {
        ...values,
        originRegion: mirrorWhere.originRegion,
        originCity: mirrorWhere.originCity,
        destinationRegion: mirrorWhere.destinationRegion,
        destinationCity: mirrorWhere.destinationCity,
      };
      if (mirror) {
        await tx.routeMinimumFare.update({
          where: { id: mirror.id },
          data: mirrorValues,
        });
      } else {
        await tx.routeMinimumFare.create({ data: mirrorValues });
      }
      return saved;
    });
    return routeMinimumFareResponse(item);
  }
  @Delete("route-minimum-fares/:id") async deleteRouteMinimumFare(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    await prisma.$transaction(async (tx) => {
      const item = await tx.routeMinimumFare.findUnique({ where: { id } });
      if (!item)
        throw new HttpException(
          "Route minimum fare not found",
          HttpStatus.NOT_FOUND,
        );
      await tx.routeMinimumFare.deleteMany({
        where: {
          OR: [
            { id: item.id },
            {
              originRegion: item.destinationRegion,
              originCity: item.destinationCity,
              destinationRegion: item.originRegion,
              destinationCity: item.originCity,
              categoryId: item.categoryId,
            },
          ],
        },
      });
    });
    return { ok: true };
  }
  @Get("recommended-addresses") async listRecommendedAddresses(
    @Req() req: RequestLike,
  ) {
    requireAuth(req);
    const [data, total] = await prisma.$transaction([
      prisma.recommendedAddress.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
      prisma.recommendedAddress.count(),
    ]);
    return { data: data.map(recommendedAddressResponse), total };
  }
  @Get("mainland-cities") async listMainlandCities(@Req() req: RequestLike) {
    requireAuth(req);
    return {
      data: await prisma.mainlandCity.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
    };
  }
  @Post("mainland-cities") async saveMainlandCity(
    @Req() req: RequestLike,
    @Body() body: Partial<MainlandCity>,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const existing = id
      ? await prisma.mainlandCity.findUnique({ where: { id } })
      : null;
    if (id && !existing)
      throw new HttpException("Mainland city not found", HttpStatus.NOT_FOUND);
    const values = parseMainlandCity(
      body,
      existing?.order ?? (await prisma.mainlandCity.count()) + 1,
    );
    try {
      return existing
        ? await prisma.mainlandCity.update({
            where: { id: existing.id },
            data: values,
          })
        : await prisma.mainlandCity.create({ data: values });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint"))
        throw new HttpException("City already exists", HttpStatus.CONFLICT);
      throw error;
    }
  }
  @Delete("mainland-cities/:id") async deleteMainlandCity(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const existing = await prisma.mainlandCity.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException("Mainland city not found", HttpStatus.NOT_FOUND);
    await prisma.$transaction([
      prisma.recommendedAddress.updateMany({
        where: { region: "大陸", city: existing.name },
        data: { city: null },
      }),
      prisma.mainlandCity.delete({ where: { id } }),
    ]);
    return { ok: true };
  }
  @Post("recommended-addresses") async saveRecommendedAddress(
    @Req() req: RequestLike,
    @Body() body: Partial<RecommendedAddress>,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const existing = id
      ? await prisma.recommendedAddress.findUnique({ where: { id } })
      : null;
    if (id && !existing)
      throw new HttpException(
        "Recommended address not found",
        HttpStatus.NOT_FOUND,
      );
    const values = parseRecommendedAddress(
      body,
      existing?.order ?? (await prisma.recommendedAddress.count()) + 1,
    );
    if (values.region === "大陸" && values.city) {
      const city = await prisma.mainlandCity.findFirst({
        where: { name: values.city!, enabled: true },
      });
      if (!city)
        throw new HttpException(
          "Please select an enabled mainland city",
          HttpStatus.BAD_REQUEST,
        );
    }
    const saved = existing
      ? await prisma.recommendedAddress.update({
          where: { id: existing.id },
          data: values,
        })
      : await prisma.recommendedAddress.create({ data: values });
    return recommendedAddressResponse(saved);
  }
  @Patch("recommended-addresses/:id") async updateRecommendedAddress(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body() body: Partial<RecommendedAddress>,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const existing = await prisma.recommendedAddress.findUnique({
      where: { id },
    });
    if (!existing)
      throw new HttpException(
        "Recommended address not found",
        HttpStatus.NOT_FOUND,
      );
    const values = parseRecommendedAddress(
      { ...existing, ...body },
      existing.order,
    );
    if (values.region === "大陸" && values.city) {
      const city = await prisma.mainlandCity.findFirst({
        where: { name: values.city!, enabled: true },
      });
      if (!city)
        throw new HttpException(
          "Please select an enabled mainland city",
          HttpStatus.BAD_REQUEST,
        );
    }
    const updated = await prisma.recommendedAddress.update({
      where: { id },
      data: values,
    });
    return recommendedAddressResponse(updated);
  }
  @Delete("recommended-addresses/:id") async deleteRecommendedAddress(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    const existing = await prisma.recommendedAddress.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing)
      throw new HttpException(
        "Recommended address not found",
        HttpStatus.NOT_FOUND,
      );
    await prisma.recommendedAddress.delete({ where: { id } });
    return { ok: true };
  }
}
@Controller("notifications")
class NotificationsController {
  @Post("events/ticket") async eventTicket(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    pruneNotificationEventTickets();
    const ticket = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + 60_000;
    notificationEventTickets.set(ticket, {
      recipientType: "user",
      recipientId: session.sub,
      expiresAt,
    });
    return { ticket, expiresAt: new Date(expiresAt).toISOString() };
  }
  @Get("events") async events(@Req() req: RequestLike, @Res() res: Response) {
    pruneNotificationEventTickets();
    const ticket = req.query?.ticket;
    const entry = ticket ? notificationEventTickets.get(ticket) : undefined;
    if (!ticket || !entry || entry.recipientType !== "user" || entry.expiresAt <= Date.now())
      throw new UnauthorizedException("Valid notification event ticket required");
    notificationEventTickets.delete(ticket);
    res.status(HttpStatus.OK);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const subscription = notificationEvents.subscribe((event) => {
      if (event.recipientType !== "user" || !event.recipientIds.includes(entry.recipientId)) return;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
    }, 25_000);
    const cleanup = () => {
      clearInterval(heartbeat);
      subscription.unsubscribe();
    };
    req.on?.("close", cleanup);
  }
  @Get("me") async listMine(@Req() req: RequestLike) {
    const auth = req.headers.authorization || "";
    if (!auth) throw new UnauthorizedException("Authentication required");
    const session = await clientSessionFrom(req).catch(() => null);
    if (session) {
      const data = await prisma.notification.findMany({
        where: { OR: [{ userId: session.sub }, { audience: "ALL_USERS" }] },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return { data, unread: data.filter((item) => !item.readAt).length };
    }
    const driver = await driverSessionFrom(req);
    const data = await prisma.notification.findMany({
      where: { OR: [{ driverId: driver.sub }, { audience: "ALL_DRIVERS" }] },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { data, unread: data.filter((item) => !item.readAt).length };
  }
  @Post(":id/read") async markRead(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    try {
      const client = await clientSessionFrom(req);
      return prisma.notification.updateMany({
        where: { id, OR: [{ userId: client.sub }, { audience: "ALL_USERS" }] },
        data: { readAt: new Date() },
      });
    } catch {
      const driver = await driverSessionFrom(req);
      return prisma.notification.updateMany({
        where: {
          id,
          OR: [{ driverId: driver.sub }, { audience: "ALL_DRIVERS" }],
        },
        data: { readAt: new Date() },
      });
    }
  }
}

@Controller("membership-plans")
class PublicMembershipPlansController {
  @Get() async list() {
    const data = await prisma.membershipPlan.findMany({ where: { enabled: true }, orderBy: { order: "asc" } });
    return { data: data.map(membershipPlanResponse) };
  }
}

@Controller("client/membership")
class ClientMembershipController {
  @Get("summary")
  async summary(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const now = new Date();
    const [user, plans, subscription, pendingOrder, events] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, name: true, displayName: true, membershipLevel: true } }),
      prisma.membershipPlan.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
      prisma.membershipSubscription.findFirst({ where: { userId: session.sub, status: "ACTIVE", currentPeriodEndsAt: { gt: now } }, include: { plan: true }, orderBy: { createdAt: "desc" } }),
      prisma.membershipOrder.findFirst({ where: { userId: session.sub, status: "PENDING" }, include: { plan: true }, orderBy: { createdAt: "desc" } }),
      prisma.membershipEvent.findMany({ where: { userId: session.sub }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    if (!user) throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    return {
      user: { id: user.id, name: user.displayName || user.name || "會員" },
      membershipLevel: subscription?.plan.level || null,
      subscription: subscription ? { id: subscription.id, status: subscription.status, billingPeriod: subscription.billingPeriod, currentPeriodStartsAt: subscription.currentPeriodStartsAt, currentPeriodEndsAt: subscription.currentPeriodEndsAt, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, plan: membershipPlanResponse(subscription.plan) } : null,
      pendingOrder: pendingOrder ? { id: pendingOrder.id, status: pendingOrder.status, billingPeriod: pendingOrder.billingPeriod, amount: pendingOrder.amount, currency: pendingOrder.currency, createdAt: pendingOrder.createdAt, plan: membershipPlanResponse(pendingOrder.plan) } : null,
      plans: plans.map(membershipPlanResponse),
      events,
    };
  }

  @Post("orders")
  async createOrder(@Req() req: RequestLike, @Body() body: { planId?: unknown; billingPeriod?: unknown; idempotencyKey?: unknown }) {
    const session = await clientSessionFrom(req);
    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const billingPeriod = body.billingPeriod === "MONTHLY" || body.billingPeriod === "YEARLY" ? body.billingPeriod : null;
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
    if (!planId || !billingPeriod || !idempotencyKey) throw new HttpException("請選擇有效會員方案", HttpStatus.BAD_REQUEST);
    const existing = await prisma.membershipOrder.findUnique({ where: { idempotencyKey }, include: { plan: true } });
    if (existing) {
      if (existing.userId !== session.sub) throw new HttpException("Invalid idempotency key", HttpStatus.CONFLICT);
      return { data: { ...existing, plan: membershipPlanResponse(existing.plan) } };
    }
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.enabled) throw new HttpException("會員方案不存在或已停用", HttpStatus.NOT_FOUND);
    const pending = await prisma.membershipOrder.findFirst({ where: { userId: session.sub, status: "PENDING" } });
    if (pending) throw new HttpException("已有待確認的會員訂單", HttpStatus.CONFLICT);
    const amount = billingPeriod === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice;
    const order = await prisma.membershipOrder.create({ data: { userId: session.sub, planId, billingPeriod, amount, currency: plan.currency, idempotencyKey, planSnapshot: membershipPlanResponse(plan), events: { create: { userId: session.sub, type: "ORDER_CREATED", title: `已建立${plan.name}訂單`, details: { billingPeriod, amount, currency: plan.currency } } } }, include: { plan: true } });
    return { data: { ...order, plan: membershipPlanResponse(order.plan) }, message: "會員訂單已建立，等待確認" };
  }

  @Post("orders/:id/cancel")
  async cancelOrder(@Req() req: RequestLike, @Param("id") id: string) {
    const session = await clientSessionFrom(req);
    const order = await prisma.membershipOrder.findFirst({ where: { id, userId: session.sub } });
    if (!order) throw new HttpException("會員訂單不存在", HttpStatus.NOT_FOUND);
    if (order.status !== "PENDING") throw new HttpException("只有待確認訂單可以取消", HttpStatus.CONFLICT);
    await prisma.$transaction([
      prisma.membershipOrder.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } }),
      prisma.membershipEvent.create({ data: { userId: session.sub, orderId: id, type: "ORDER_CANCELLED", title: "會員訂單已取消" } }),
    ]);
    return { ok: true };
  }

  @Post("subscription/cancel-renewal")
  async cancelRenewal(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const subscription = await prisma.membershipSubscription.findFirst({ where: { userId: session.sub, status: "ACTIVE", currentPeriodEndsAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
    if (!subscription) throw new HttpException("目前沒有有效會員會籍", HttpStatus.NOT_FOUND);
    if (subscription.cancelAtPeriodEnd) return { ok: true };
    await prisma.$transaction([
      prisma.membershipSubscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: true, cancelledAt: new Date() } }),
      prisma.membershipEvent.create({ data: { userId: session.sub, subscriptionId: subscription.id, type: "RENEWAL_CANCELLED", title: "已取消自動續期", details: { accessUntil: subscription.currentPeriodEndsAt.toISOString() } } }),
    ]);
    return { ok: true };
  }
}

@Controller("promotions")
class PublicPromotionsController {
  private publicPromotion(promotion: Prisma.PromotionGetPayload<object>) {
    return {
      id: promotion.id,
      name: promotion.name,
      kind: promotion.kind,
      discountType: promotion.discountType,
      stackingMode: promotion.stackingMode,
      discountValue: promotion.discountValue,
      currency: promotion.currency,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      minimumSpend: promotion.minimumSpend,
      originRegion: promotion.originRegion,
      destinationRegion: promotion.destinationRegion,
      couponCode: promotion.kind === "COUPON" ? promotion.couponCode : null,
    };
  }

  @Get()
  async list() {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        enabled: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    return {
      data: promotions.map((promotion) => this.publicPromotion(promotion)),
    };
  }

  @Post("redeem")
  async redeem(@Body() body: { couponCode?: unknown }) {
    const couponCode =
      typeof body.couponCode === "string"
        ? body.couponCode.trim().toUpperCase()
        : "";
    if (!couponCode)
      throw new HttpException("請輸入優惠代碼", HttpStatus.BAD_REQUEST);
    const now = new Date();
    const promotion = await prisma.promotion.findFirst({
      where: {
        enabled: true,
        kind: "COUPON",
        couponCode,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
    });
    if (!promotion)
      throw new HttpException("優惠代碼無效或已過期", HttpStatus.NOT_FOUND);
    if (promotion.usageLimit !== null) {
      const reserved = await prisma.promotionUsage.count({
        where: { promotionId: promotion.id, status: "RESERVED" },
      });
      if (promotion.usageCount + reserved >= promotion.usageLimit)
        throw new HttpException("優惠代碼已達使用上限", HttpStatus.CONFLICT);
    }
    return {
      data: this.publicPromotion(promotion),
      message: "優惠代碼有效，可於預約行程時使用",
    };
  }
}

@Controller("vehicles")
class PublicVehiclesController {
  @Get(":id/logo") async vehicleLogo(
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { logoData: true, logoMime: true },
    });
    if (!vehicle?.logoData || !vehicle.logoMime)
      throw new HttpException("Vehicle logo not found", HttpStatus.NOT_FOUND);
    response.type(vehicle.logoMime).send(Buffer.from(vehicle.logoData));
  }

  @Get(":id/image") async vehicleImage(
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { imageData: true, imageMime: true },
    });
    if (!vehicle?.imageData || !vehicle.imageMime)
      throw new HttpException("Vehicle image not found", HttpStatus.NOT_FOUND);
    response.type(vehicle.imageMime).send(Buffer.from(vehicle.imageData));
  }

  @Get() async listPublicVehicles() {
    const [categories, data, extras, settings] = await Promise.all([
      prisma.vehicleCategory.findMany({
        where: { enabled: true },
        orderBy: { order: "asc" },
      }),
      prisma.vehicle.findMany({
        where: { enabled: true, category: { is: { enabled: true } } },
        orderBy: { order: "asc" },
      }),
      prisma.vehicleExtra.findMany({
        where: {
          OR: [
            { enabled: true },
            {
              triggerEnabled: true,
              triggerType: { in: ["IMMEDIATE", "NIGHT"] },
            },
            { triggerEnabled: true, triggerType: "WEATHER" },
          ],
        },
        orderBy: [{ order: "asc" }, { id: "asc" }],
      }),
      prisma.appSetting.findUniqueOrThrow({
        where: { id: appSettingsDefaults.id },
      }),
    ]);
    return {
      categories: categories.map(vehicleCategoryResponse),
      data: data.map(vehicleResponse),
      extras: extras.map(vehicleExtraResponse),
      severeWeatherEnabled: settings.severeWeatherEnabled,
    };
  }
}
@Controller("quotes")
class PublicQuotesController {
  @Post()
  async create(@Body() body: CreateQuoteRequest) {
    const categoryId =
      typeof body.categoryId === "string" ? body.categoryId.trim() : "";
    const vehicleId =
      typeof body.vehicleId === "string" ? body.vehicleId.trim() : "";
    const distanceMeters = Number(body.distanceMeters);
    if (
      !categoryId ||
      !vehicleId ||
      !Number.isFinite(distanceMeters) ||
      distanceMeters < 0
    ) {
      throw new HttpException(
        "Category, vehicle, and a valid distance in meters are required",
        HttpStatus.BAD_REQUEST,
      );
    }
    const distanceKm = distanceMeters / 1000;
    const durationSeconds = Number(body.durationSeconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0)
      throw new HttpException(
        "A valid route duration is required",
        HttpStatus.BAD_REQUEST,
      );
    const originRegion =
      typeof body.originRegion === "string" ? body.originRegion.trim() : "";
    const originCity =
      typeof body.originCity === "string" ? body.originCity.trim() : "";
    const destinationRegion =
      typeof body.destinationRegion === "string"
        ? body.destinationRegion.trim()
        : "";
    const destinationCity =
      typeof body.destinationCity === "string"
        ? body.destinationCity.trim()
        : "";
    const scheduledAtValue = body.scheduledAt
      ? new Date(String(body.scheduledAt))
      : new Date();
    if (Number.isNaN(scheduledAtValue.valueOf()))
      throw new HttpException(
        "Scheduled time is invalid",
        HttpStatus.BAD_REQUEST,
      );
    const requestedExtras = parseQuoteExtras(body);
    const quote = await prisma.$transaction(async (tx) => {
      const [settings, category, vehicle, extras, routeMinimumFares] =
        await Promise.all([
          tx.appSetting.findUniqueOrThrow({
            where: { id: appSettingsDefaults.id },
          }),
          tx.vehicleCategory.findUnique({
            where: { id: categoryId },
            include: {
              distancePricing: {
                include: { tiers: { orderBy: { order: "asc" } } },
              },
            },
          }),
          tx.vehicle.findUnique({ where: { id: vehicleId } }),
          tx.vehicleExtra.findMany({
            where: {
              OR: [
                { enabled: true },
                {
                  triggerEnabled: true,
                  triggerType: { in: ["IMMEDIATE", "NIGHT", "WEATHER"] },
                },
              ],
            },
          }),
          originRegion && destinationRegion
            ? tx.routeMinimumFare.findMany({
                where: {
                  enabled: true,
                  originRegion,
                  destinationRegion,
                  OR: [
                    { originCity: null },
                    ...(originCity ? [{ originCity }] : []),
                  ],
                  AND: [
                    {
                      OR: [
                        { destinationCity: null },
                        ...(destinationCity ? [{ destinationCity }] : []),
                      ],
                    },
                    { OR: [{ categoryId: null }, { categoryId }] },
                  ],
                },
              })
            : Promise.resolve([]),
        ]);
      if (!category || !category.enabled)
        throw new HttpException(
          "Vehicle category is unavailable",
          HttpStatus.NOT_FOUND,
        );
      if (!category.distancePricing)
        throw new HttpException(
          "Vehicle category pricing is unavailable",
          HttpStatus.CONFLICT,
        );
      if (!vehicle || !vehicle.enabled || vehicle.categoryId !== category.id)
        throw new HttpException(
          "Vehicle is unavailable for the selected category",
          HttpStatus.BAD_REQUEST,
        );
      const requestedExtraIds = new Set(
        requestedExtras.map((selection) => selection.id),
      );
      if (
        extras.filter((extra) => requestedExtraIds.has(extra.id)).length !==
        requestedExtraIds.size
      )
        throw new HttpException(
          "One or more extras are unavailable",
          HttpStatus.BAD_REQUEST,
        );
      const requiredExtras = extras.filter((extra) =>
        extraTriggerMatches(
          extra,
          scheduledAtValue,
          new Date(),
          settings.severeWeatherEnabled,
        ),
      );
      for (const extra of requiredExtras) {
        if (!requestedExtras.some((selection) => selection.id === extra.id))
          requestedExtras.push({ id: extra.id, quantity: 1 });
      }

      const exchangeRate = Number(settings.exchangeRate);
      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0)
        throw new HttpException(
          "Exchange rate is unavailable",
          HttpStatus.CONFLICT,
        );
      const currency = displayCurrency(
        body.displayCurrency ?? body.currency,
        settings.currency,
      );
      const pricing = category.distancePricing;
      const routeMinimumFare =
        routeMinimumFares.sort(
          (a, b) =>
            Number(Boolean(b.originCity)) +
            Number(Boolean(b.destinationCity)) +
            Number(Boolean(b.categoryId)) -
            (Number(Boolean(a.originCity)) +
              Number(Boolean(a.destinationCity)) +
              Number(Boolean(a.categoryId))),
        )[0] || null;
      const extraById = new Map(extras.map((extra) => [extra.id, extra]));
      const lines = [
        ...quoteDistanceLines(distanceKm, pricing).map((line) => ({
          ...line,
          unitAmount: convertCurrency(
            line.unitAmount,
            pricing.currency,
            currency,
            exchangeRate,
          ),
          totalAmount: convertCurrency(
            line.totalAmount,
            pricing.currency,
            currency,
            exchangeRate,
          ),
          currency: currencyLabels[currency],
        })),
        ...routeMinimumFareLine(
          routeMinimumFare,
          convertCurrency(
            calculateDistanceFare(distanceKm, pricing),
            pricing.currency,
            "RMB",
            exchangeRate,
          ),
          exchangeRate,
        ).map((line) => ({
          ...line,
          unitAmount: convertCurrency(
            line.unitAmount,
            "RMB",
            currency,
            exchangeRate,
          ),
          totalAmount: convertCurrency(
            line.totalAmount,
            "RMB",
            currency,
            exchangeRate,
          ),
          currency: currencyLabels[currency],
        })),
        ...requestedExtras.map((selection) => {
          const extra = extraById.get(selection.id)!;
          const unitAmount = convertCurrency(
            extra.price,
            extra.currency,
            currency,
            exchangeRate,
          );
          return {
            type: "EXTRA" as const,
            sourceId: extra.id,
            label: extra.label,
            quantity: selection.quantity,
            unitAmount,
            totalAmount: roundMoney(unitAmount * selection.quantity),
            currency: currencyLabels[currency],
          };
        }),
      ].map((line, index) => ({ ...line, order: index + 1 }));
      const subtotal = roundMoney(
        lines.reduce((total, line) => total + line.totalAmount, 0),
      );
      const now = new Date();
      const couponCode =
        typeof body.couponCode === "string"
          ? body.couponCode.trim().toUpperCase()
          : "";
      let membershipLevel =
        typeof body.membershipLevel === "string"
          ? body.membershipLevel.trim()
          : "";
      if (typeof body.userId === "string" && body.userId.trim())
        membershipLevel =
          (
            await tx.user.findUnique({
              where: { id: body.userId.trim() },
              select: { membershipLevel: true },
            })
          )?.membershipLevel || "";
      const promotions = await tx.promotion.findMany({
        where: {
          enabled: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
      });
      await tx.promotionUsage.updateMany({
        where: { status: "RESERVED", quote: { expiresAt: { lte: now } } },
        data: { status: "RELEASED", releasedAt: now },
      });
      const reservedCounts = new Map(
        await Promise.all(
          promotions
            .filter((promotion) => promotion.kind === "COUPON")
            .map(
              async (promotion) =>
                [
                  promotion.id,
                  await tx.promotionUsage.count({
                    where: { promotionId: promotion.id, status: "RESERVED" },
                  }),
                ] as const,
            ),
        ),
      );
      const eligiblePromotions = promotions.filter((promotion) => {
        if (
          promotion.kind === "COUPON" &&
          (!couponCode ||
            promotion.couponCode !== couponCode ||
            (promotion.usageLimit !== null &&
              promotion.usageCount + (reservedCounts.get(promotion.id) || 0) >=
                promotion.usageLimit))
        )
          return false;
        if (
          promotion.kind === "MEMBER" &&
          (!membershipLevel || promotion.membershipLevel !== membershipLevel)
        )
          return false;
        if (
          !promotionMatchesContext(promotion, {
            originRegion,
            originCity,
            destinationRegion,
            destinationCity,
            scheduledAt: scheduledAtValue,
          })
        )
          return false;
        if (
          promotion.kind === "CAMPAIGN" ||
          promotion.kind === "COUPON" ||
          promotion.kind === "MEMBER"
        ) {
          const minimumSpend = convertCurrency(
            promotion.minimumSpend,
            promotion.currency,
            currency,
            exchangeRate,
          );
          return subtotal >= minimumSpend;
        }
        return false;
      });
      const promotionDiscounts = eligiblePromotions.map((promotion) => {
        const rawDiscount =
          promotion.discountType === "PERCENTAGE"
            ? (subtotal * promotion.discountValue) / 100
            : promotion.discountType === "TOTAL_PRICE"
              ? Math.max(
                  0,
                  subtotal -
                    convertCurrency(
                      promotion.discountValue,
                      promotion.currency,
                      currency,
                      exchangeRate,
                    ),
                )
              : convertCurrency(
                  promotion.discountValue,
                  promotion.currency,
                  currency,
                  exchangeRate,
                );
        const maximumDiscount =
          promotion.maximumDiscount === null
            ? null
            : convertCurrency(
                promotion.maximumDiscount,
                promotion.currency,
                currency,
                exchangeRate,
              );
        const discount = roundMoney(
          Math.min(
            subtotal,
            maximumDiscount === null
              ? rawDiscount
              : Math.min(rawDiscount, maximumDiscount),
          ),
        );
        return {
          promotion,
          discount,
          discountItems: [{ promotion, discount }],
        };
      });
      const combinations = couponCode
        ? promotionDiscounts.flatMap((first, index) =>
            promotionDiscounts
              .slice(index + 1)
              .map((second) => {
                const canStack =
                  first.promotion.stackingMode === "ALL" ||
                  second.promotion.stackingMode === "ALL" ||
                  (first.promotion.stackingMode === "PERCENTAGE_AND_VOUCHER" &&
                    second.promotion.kind === "COUPON") ||
                  (second.promotion.stackingMode === "PERCENTAGE_AND_VOUCHER" &&
                    first.promotion.kind === "COUPON");
                if (
                  !canStack ||
                  first.promotion.discountType === "TOTAL_PRICE" ||
                  second.promotion.discountType === "TOTAL_PRICE"
                )
                  return [];
                const ordered = [first, second].sort((a, b) => {
                  if (
                    a.promotion.discountType === "PERCENTAGE" &&
                    b.promotion.discountType !== "PERCENTAGE"
                  )
                    return -1;
                  if (
                    b.promotion.discountType === "PERCENTAGE" &&
                    a.promotion.discountType !== "PERCENTAGE"
                  )
                    return 1;
                  return 0;
                });
                let remaining = subtotal;
                let discount = 0;
                const discountItems: Array<{
                  promotion: typeof first.promotion;
                  discount: number;
                }> = [];
                for (const item of ordered) {
                  const rawDiscount =
                    item.promotion.discountType === "PERCENTAGE"
                      ? (remaining * item.promotion.discountValue) / 100
                      : convertCurrency(
                          item.promotion.discountValue,
                          item.promotion.currency,
                          currency,
                          exchangeRate,
                        );
                  const maximumDiscount =
                    item.promotion.maximumDiscount === null
                      ? null
                      : convertCurrency(
                          item.promotion.maximumDiscount,
                          item.promotion.currency,
                          currency,
                          exchangeRate,
                        );
                  const appliedDiscount = roundMoney(
                    Math.min(
                      remaining,
                      maximumDiscount === null
                        ? rawDiscount
                        : Math.min(rawDiscount, maximumDiscount),
                    ),
                  );
                  discount = roundMoney(discount + appliedDiscount);
                  remaining = roundMoney(remaining - appliedDiscount);
                  discountItems.push({
                    promotion: item.promotion,
                    discount: appliedDiscount,
                  });
                }
                return [
                  {
                    promotion: first.promotion,
                    secondaryPromotion: second.promotion,
                    discount,
                    discountItems,
                  },
                ];
              })
              .flat(),
          )
        : [];
      const applicableDiscounts = [
        ...promotionDiscounts.map((item) => ({
          ...item,
          secondaryPromotion: null,
        })),
        ...combinations,
      ];
      const applied = applicableDiscounts.sort(
        (a, b) =>
          b.discount - a.discount ||
          b.promotion.priority - a.promotion.priority,
      )[0];
      const quotedLines =
        applied && applied.discount > 0
          ? [
              ...lines,
              ...applied.discountItems
                .filter((item) => item.discount > 0)
                .map((item, index) => ({
                  type: "DISCOUNT" as const,
                  sourceId: item.promotion.id,
                  label: item.promotion.name,
                  quantity: 1,
                  unitAmount: -item.discount,
                  totalAmount: -item.discount,
                  currency: currencyLabels[currency],
                  order: lines.length + index + 1,
                })),
            ]
          : lines;
      const reservedPromotions = [
        applied?.promotion,
        applied?.secondaryPromotion,
      ].filter(
        (promotion): promotion is NonNullable<typeof applied>["promotion"] =>
          Boolean(promotion && promotion.kind === "COUPON"),
      );
      const total = roundMoney(subtotal - (applied?.discount || 0));
      return tx.fareQuote.create({
        data: {
          distanceKm,
          durationSeconds,
          currency: currencyLabels[currency],
          subtotal,
          total,
          expiresAt: quoteExpiryDate(),
          pricing: {
            create: {
              categoryId: category.id,
              categoryName: category.name,
              tabLabel: category.tabLabel,
              minimumFare: pricing.minimumFare,
              routeMinimumFare: routeMinimumFare
                ? convertCurrency(
                    routeMinimumFare.minimumFare,
                    routeMinimumFare.currency,
                    currency,
                    exchangeRate,
                  )
                : null,
              routeOriginRegion: routeMinimumFare ? originRegion : null,
              routeOriginCity: routeMinimumFare ? originCity || null : null,
              routeDestinationRegion: routeMinimumFare
                ? destinationRegion
                : null,
              routeDestinationCity: routeMinimumFare
                ? destinationCity || null
                : null,
              currency: pricing.currency,
              tiers: {
                create: pricing.tiers.map((tier) => ({
                  sourceTierId: tier.id,
                  fromKm: tier.fromKm,
                  toKm: tier.toKm,
                  pricePerKm: tier.pricePerKm,
                  order: tier.order,
                })),
              },
            },
          },
          vehicle: {
            create: {
              vehicleId: vehicle.id,
              categoryId: vehicle.categoryId,
              brand: vehicle.brand,
              model: vehicle.model,
              series: vehicle.series,
              seats: vehicle.seats,
              image: vehicleImagePath(vehicle),
              logo: vehicleLogoPath(vehicle),
              colorLabel: vehicle.colorLabel,
              modelChoiceLabel: vehicle.modelChoiceLabel,
            },
          },
          lines: { create: quotedLines },
          promotionUsages: {
            create: reservedPromotions.map((promotion) => ({
              promotionId: promotion.id,
            })),
          },
        },
        include: {
          pricing: { include: { tiers: { orderBy: { order: "asc" } } } },
          vehicle: true,
          lines: { orderBy: { order: "asc" } },
        },
      });
    });
    return quoteResponse(quote);
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const quote = await prisma.fareQuote.findUnique({
      where: { id },
      include: {
        pricing: { include: { tiers: { orderBy: { order: "asc" } } } },
        vehicle: true,
        lines: { orderBy: { order: "asc" } },
      },
    });
    if (!quote)
      throw new HttpException("Quote not found", HttpStatus.NOT_FOUND);
    if (quote.expiresAt && quote.expiresAt.getTime() <= Date.now())
      throw new HttpException("Quote has expired", HttpStatus.GONE);
    return quoteResponse(quote);
  }

  @Post(":id/consume")
  async consume(@Param("id") id: string) {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const quote = await tx.fareQuote.findUnique({
        where: { id },
        include: { promotionUsages: true },
      });
      if (!quote)
        throw new HttpException("Quote not found", HttpStatus.NOT_FOUND);
      if (quote.expiresAt && quote.expiresAt <= now)
        throw new HttpException("Quote has expired", HttpStatus.GONE);
      for (const usage of quote.promotionUsages.filter(
        (item) => item.status === "RESERVED",
      )) {
        await tx.promotionUsage.update({
          where: { id: usage.id },
          data: { status: "USED", usedAt: now },
        });
        await tx.promotion.update({
          where: { id: usage.promotionId },
          data: { usageCount: { increment: 1 } },
        });
      }
      return { ok: true, quoteId: id };
    });
  }

  @Post(":id/release")
  async release(@Param("id") id: string) {
    const result = await prisma.promotionUsage.updateMany({
      where: { quoteId: id, status: "RESERVED" },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
    return { ok: true, quoteId: id, released: result.count };
  }
}
@Controller("recommended-addresses")
class RecommendedAddressesController {
  @Get("mainland-cities") async listCities() {
    return {
      data: await prisma.mainlandCity.findMany({
        where: { enabled: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
    };
  }
  @Get() async list() {
    const data = await prisma.recommendedAddress.findMany({
      where: { enabled: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return { data: data.map(recommendedAddressResponse) };
  }
}
@Controller("settings")
class SettingsController {
  @Get() async get() {
    return appSettingsResponse(
      await prisma.appSetting.findUniqueOrThrow({
        where: { id: appSettingsDefaults.id },
      }),
    );
  }
  @Post() async update(
    @Req() req: RequestLike,
    @Body()
    body: {
      language?: string;
      region?: string;
      currency?: string;
      pricingCurrency?: string;
      exchangeRate?: number;
      adminLogo?: string | null;
      severeWeatherEnabled?: boolean;
      driverRaceEnabled?: boolean;
      dispatchSchedulingEnabled?: boolean;
      driverPayoutPercentage?: unknown;
      fareBalancePayEnabled?: boolean;
      cashBalancePayEnabled?: boolean;
      wechatPayEnabled?: boolean;
      alipayPayEnabled?: boolean;
      bankCardPayEnabled?: boolean;
      sandboxMode?: boolean;
    },
  ) {
    const session = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
    if (body.adminLogo !== undefined && session.role !== "SUPER_ADMIN")
      throw new ForbiddenException(
        "Only super administrators may update the logo",
      );
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const pricingCurrency =
      body.pricingCurrency && ["HKD", "RMB"].includes(body.pricingCurrency)
        ? body.pricingCurrency
        : settings.pricingCurrency;
    const driverPayoutPercentage =
      body.driverPayoutPercentage === undefined
        ? settings.driverPayoutPercentage
        : Number(body.driverPayoutPercentage);
    if (
      !Number.isFinite(driverPayoutPercentage) ||
      driverPayoutPercentage < 0 ||
      driverPayoutPercentage > 100
    )
      throw new HttpException(
        "Driver payout percentage must be between 0 and 100",
        HttpStatus.BAD_REQUEST,
      );
    const data = {
      language: body.language || settings.language,
      region: body.region || settings.region,
      currency:
        body.currency && ["HKD", "RMB"].includes(body.currency)
          ? body.currency
          : settings.currency,
      pricingCurrency,
      exchangeRate:
        body.exchangeRate !== undefined
          ? (normalizeExchangeRate(body.exchangeRate) ?? settings.exchangeRate)
          : settings.exchangeRate,
      adminLogo:
        body.adminLogo === undefined
          ? settings.adminLogo
          : body.adminLogo === null
            ? null
            : validateAdminLogo(body.adminLogo),
      severeWeatherEnabled:
        body.severeWeatherEnabled ?? settings.severeWeatherEnabled,
      driverRaceEnabled: body.driverRaceEnabled ?? settings.driverRaceEnabled,
      dispatchSchedulingEnabled:
        body.dispatchSchedulingEnabled ?? settings.dispatchSchedulingEnabled,
      driverPayoutPercentage,
      fareBalancePayEnabled:
        body.fareBalancePayEnabled ?? settings.fareBalancePayEnabled,
      cashBalancePayEnabled:
        body.cashBalancePayEnabled ?? settings.cashBalancePayEnabled,
      wechatPayEnabled: body.wechatPayEnabled ?? settings.wechatPayEnabled,
      alipayPayEnabled: body.alipayPayEnabled ?? settings.alipayPayEnabled,
      bankCardPayEnabled:
        body.bankCardPayEnabled ?? settings.bankCardPayEnabled,
      sandboxMode: body.sandboxMode ?? settings.sandboxMode,
    };
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appSetting.update({
        where: { id: settings.id },
        data,
      });
      if (
        data.dispatchSchedulingEnabled &&
        !settings.dispatchSchedulingEnabled
      ) {
        await openEligibleTripsForDispatch(tx, driverPayoutPercentage);
      }
      if (pricingCurrency !== settings.pricingCurrency) {
        const label = configuredCurrencyLabel({ pricingCurrency });
        await Promise.all([
          tx.categoryDistancePricing.updateMany({ data: { currency: label } }),
          tx.vehicleExtra.updateMany({ data: { currency: label } }),
          tx.routeMinimumFare.updateMany({ data: { currency: label } }),
          tx.promotion.updateMany({ data: { currency: label } }),
        ]);
        const membershipPlans = await tx.membershipPlan.findMany({
          select: { id: true, monthlyPrice: true, yearlyPrice: true, currency: true },
        });
        for (const plan of membershipPlans) {
          if (plan.currency === label) continue;
          const sourceCurrency = currencyCode(plan.currency);
          if (!sourceCurrency) {
            throw new HttpException("會員方案貨幣無效", HttpStatus.CONFLICT);
          }
          await tx.membershipPlan.update({
            where: { id: plan.id },
            data: {
              monthlyPrice: convertCurrency(plan.monthlyPrice, sourceCurrency, pricingCurrency as "RMB" | "HKD", data.exchangeRate),
              yearlyPrice: convertCurrency(plan.yearlyPrice, sourceCurrency, pricingCurrency as "RMB" | "HKD", data.exchangeRate),
              currency: label,
            },
          });
        }
      }
      return result;
    });
    addAudit(req, "SUCCESS");
    if (data.dispatchSchedulingEnabled && !settings.dispatchSchedulingEnabled) {
      await publishDriverOrderEvent({ reason: "available" });
    }
    return appSettingsResponse(updated);
  }
}
@Controller("location")
class LocationController {
  private getAmapKey() {
    const key = process.env.AMAP_WEB_SERVICE_KEY;
    if (!key)
      throw new HttpException(
        "AMap Web Service is not configured",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    return key;
  }

  private async requestAmap<T>(
    path: string,
    params: URLSearchParams,
  ): Promise<T> {
    params.set("key", this.getAmapKey());
    const response = await fetch(`https://restapi.amap.com${path}?${params}`);
    const data = (await response.json()) as T & {
      status?: string;
      info?: string;
    };
    if (!response.ok || data.status !== "1") {
      throw new HttpException(
        data.info || "Unable to query AMap",
        HttpStatus.BAD_GATEWAY,
      );
    }
    return data;
  }

  @Get("flight-information")
  async flightInformation(@Req() req: RequestLike) {
    const date = req.query?.date || "";
    const arrival = req.query?.arrival === "true";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpException("Valid date is required", HttpStatus.BAD_REQUEST);
    }
    const url = `https://www.hongkongairport.com/flightinfo-rest/rest/flights/past?date=${encodeURIComponent(date)}&lang=en&cargo=false&arrival=${arrival}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new HttpException(
        "Unable to query HKIA flight information",
        HttpStatus.BAD_GATEWAY,
      );
    }
    const payload = (await response.json()) as Array<{
      list?: Array<Record<string, unknown>>;
    }>;
    return payload.flatMap((day) =>
      (day.list || []).map((item) => ({
        time: item.time || "--:--",
        status: item.status || "Status unavailable",
        flight: item.flight || [],
        destination: item.destination || [],
        origin: item.origin || [],
        baggage: item.baggage || null,
        hall: item.hall || null,
        stand: item.stand || null,
        terminal: item.terminal || "",
        gate: item.gate || "",
      })),
    );
  }

  @Get("flight-information/lookup")
  async lookupFlight(@Req() req: RequestLike) {
    const flightNumber = (req.query?.flightNumber || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    const date = req.query?.date || "";
    const direction = req.query?.direction || "";
    if (
      !/^[A-Z0-9]{2,8}$/.test(flightNumber) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      (direction !== "" && direction !== "arrival" && direction !== "departure")
    ) {
      throw new HttpException(
        "Valid flightNumber, date and direction are required",
        HttpStatus.BAD_REQUEST,
      );
    }
    const fetchDirection = async (arrival: boolean) => {
      const url = `https://www.hongkongairport.com/flightinfo-rest/rest/flights/past?date=${encodeURIComponent(date)}&lang=en&cargo=false&arrival=${arrival}`;
      const response = await fetch(url);
      if (!response.ok)
        throw new HttpException(
          "Unable to query HKIA flight information",
          HttpStatus.BAD_GATEWAY,
        );
      return (await response.json()) as Array<{
        date?: string;
        arrival?: boolean;
        list?: Array<{
          time?: string;
          status?: string;
          flight?: Array<{ no?: string }>;
          origin?: string[];
          destination?: string[];
        }>;
      }>;
    };
    const [arrivals, departures] = await Promise.all([
      direction === "departure" ? Promise.resolve([]) : fetchDirection(true),
      direction === "arrival" ? Promise.resolve([]) : fetchDirection(false),
    ]);
    const matches: Array<{
      direction: "arrival" | "departure";
      item: NonNullable<(typeof arrivals)[number]["list"]>[number];
    }> = [];
    for (const day of arrivals)
      for (const item of day.list || [])
        if (
          (item.flight || []).some(
            (flight) =>
              (flight.no || "").replace(/\s+/g, "").toUpperCase() ===
              flightNumber,
          )
        )
          matches.push({ direction: "arrival", item });
    for (const day of departures)
      for (const item of day.list || [])
        if (
          (item.flight || []).some(
            (flight) =>
              (flight.no || "").replace(/\s+/g, "").toUpperCase() ===
              flightNumber,
          )
        )
          matches.push({ direction: "departure", item });
    if (matches.length === 0)
      throw new HttpException("找不到指定日期的航班", HttpStatus.NOT_FOUND);
    const airportMetadata: Record<string, Omit<FlightAirport, "iata">> = {
      HKG: {
        name: "香港國際機場",
        city: "香港",
        latitude: 22.308,
        longitude: 113.9185,
      },
      SHA: {
        name: "上海虹橋國際機場",
        city: "上海",
        latitude: 31.1979,
        longitude: 121.3363,
      },
      PVG: {
        name: "上海浦東國際機場",
        city: "上海",
        latitude: 31.1443,
        longitude: 121.8083,
      },
      PKX: {
        name: "北京大興國際機場",
        city: "北京",
        latitude: 39.5098,
        longitude: 116.4105,
      },
      CAN: {
        name: "廣州白雲國際機場",
        city: "廣州",
        latitude: 23.3924,
        longitude: 113.2988,
      },
      SZX: {
        name: "深圳寶安國際機場",
        city: "深圳",
        latitude: 22.6393,
        longitude: 113.8107,
      },
      MFM: {
        name: "澳門國際機場",
        city: "澳門",
        latitude: 22.1496,
        longitude: 113.5916,
      },
      TPE: {
        name: "桃園國際機場",
        city: "桃園",
        latitude: 25.0797,
        longitude: 121.2342,
      },
      ICN: {
        name: "仁川國際機場",
        city: "首爾",
        latitude: 37.4602,
        longitude: 126.4407,
      },
      NRT: {
        name: "成田國際機場",
        city: "東京",
        latitude: 35.772,
        longitude: 140.3929,
      },
      KIX: {
        name: "關西國際機場",
        city: "大阪",
        latitude: 34.4347,
        longitude: 135.244,
      },
      SIN: {
        name: "新加坡樟宜機場",
        city: "新加坡",
        latitude: 1.3644,
        longitude: 103.9915,
      },
      BKK: {
        name: "蘇凡納布國際機場",
        city: "曼谷",
        latitude: 13.69,
        longitude: 100.7501,
      },
      MNL: {
        name: "尼諾伊·阿基諾國際機場",
        city: "馬尼拉",
        latitude: 14.5086,
        longitude: 121.0198,
      },
      CDG: {
        name: "巴黎戴高樂機場",
        city: "巴黎",
        latitude: 49.0097,
        longitude: 2.5479,
      },
      LAX: {
        name: "洛杉磯國際機場",
        city: "洛杉磯",
        latitude: 33.9416,
        longitude: -118.4085,
      },
      SYD: {
        name: "悉尼機場",
        city: "悉尼",
        latitude: -33.9399,
        longitude: 151.1753,
      },
    };
    const airport = (iata: string): FlightAirport => ({
      iata,
      ...(airportMetadata[iata] || {
        name: iata,
        city: iata,
        latitude: null,
        longitude: null,
      }),
    });
    const results = matches.flatMap((match) => {
      const code =
        match.direction === "arrival"
          ? match.item.origin?.[0]
          : match.item.destination?.[0];
      if (!code) return [];
      const origin =
        match.direction === "arrival" ? airport(code) : airport("HKG");
      const destination =
        match.direction === "arrival" ? airport("HKG") : airport(code);
      return [{
        flightNumber,
        direction: match.direction,
        status: match.item.status || "",
        scheduledTime: match.item.time || "",
        origin,
        destination,
      }];
    });
    if (results.length === 0)
      throw new HttpException("航班機場資料不完整", HttpStatus.BAD_GATEWAY);
    return results.length === 1 ? results[0] : { matches: results };
  }

  @Get("reverse-geocode")
  async reverseGeocode(@Req() req: RequestLike) {
    const latitude = Number(req.query?.latitude);
    const longitude = Number(req.query?.longitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      throw new HttpException(
        "Valid latitude and longitude are required",
        HttpStatus.BAD_REQUEST,
      );
    }
    const params = new URLSearchParams({
      location: `${longitude},${latitude}`,
      extensions: "all",
    });
    const data = await this.requestAmap<{
      regeocode?: {
        formatted_address?: string;
        addressComponent?: {
          city?: string | string[];
          province?: string;
          district?: string;
        };
        pois?: Array<{ name?: string; distance?: string }>;
      };
    }>("/v3/geocode/regeo", params);
    if (!data.regeocode)
      throw new HttpException(
        "Unable to resolve location",
        HttpStatus.BAD_GATEWAY,
      );
    const component = data.regeocode.addressComponent;
    const city =
      typeof component?.city === "string"
        ? component.city
        : component?.province || "";
    return {
      city,
      district: component?.district || "",
      address: data.regeocode.formatted_address || "",
      landmark: data.regeocode.pois?.[0]?.name || "",
    };
  }

  @Get("search")
  async search(@Req() req: RequestLike) {
    const keyword = req.query?.keyword?.trim();
    if (!keyword)
      throw new HttpException(
        "A search keyword is required",
        HttpStatus.BAD_REQUEST,
      );
    const params = new URLSearchParams({
      keywords: keyword,
      offset: "20",
      page: "1",
      extensions: "base",
    });
    const region = req.query?.region;
    if (region === "香港") params.set("city", "香港");
    else if (region === "澳門") params.set("city", "澳門");
    else if (region === "大陸" && req.query?.city?.trim())
      params.set("city", req.query.city.trim());
    const data = await this.requestAmap<{
      pois?: Array<{
        id?: string;
        name?: string;
        address?: string | string[];
        location?: string;
        pname?: string;
        cityname?: string;
        adname?: string;
      }>;
    }>("/v3/place/text", params);
    const pois = data.pois || [];
    const mainlandPois = pois.filter((poi) => {
      const area = `${poi.pname || ""}${poi.cityname || ""}`;
      return area.includes("广东") || area.includes("廣東");
    });
    const supportedPois = pois.filter((poi) => {
      const area = `${poi.pname || ""}${poi.cityname || ""}`;
      return (
        area.includes("广东") ||
        area.includes("廣東") ||
        area.includes("香港") ||
        area.includes("澳門") ||
        area.includes("澳门")
      );
    });
    if (!region && pois.length > 0 && supportedPois.length === 0) {
      throw new HttpException("未開通服務", HttpStatus.FORBIDDEN);
    }
    const results = (
      region === "大陸" ? mainlandPois : !region ? supportedPois : pois
    ).flatMap((poi, index) => {
      const [longitude, latitude] = (poi.location || "").split(",").map(Number);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      const area = `${poi.pname || ""}${poi.cityname || ""}`;
      const region = area.includes("香港")
        ? "香港"
        : area.includes("澳門") || area.includes("澳门")
          ? "澳門"
          : "大陸";
      const rawAddress = Array.isArray(poi.address)
        ? poi.address.join("")
        : poi.address || "";
      const address =
        region === "香港"
          ? `${poi.adname || ""}-${rawAddress}`
          : region === "澳門"
            ? `${poi.adname || ""}-${rawAddress}`
            : `${poi.cityname || ""}-${poi.adname || ""}-${rawAddress}`;
      return [
        {
          id: poi.id || `${longitude},${latitude},${index}`,
          name: poi.name || keyword,
          address,
          displayAddress: formattedAddress(region, address),
          region,
          city: poi.cityname || "",
          district: poi.adname || "",
          landmark: poi.name || "",
          latitude,
          longitude,
        },
      ];
    });
    if (results.length > 0) return { data: results };

    const geocodeParams = new URLSearchParams({ address: keyword });
    if (region === "香港") geocodeParams.set("city", "香港");
    else if (region === "澳門") geocodeParams.set("city", "澳門");
    else if (region === "大陸" && req.query?.city?.trim())
      geocodeParams.set("city", req.query.city.trim());
    const geocode = await this.requestAmap<{
      geocodes?: Array<{
        formatted_address?: string;
        location?: string;
        level?: string;
        country?: string;
        province?: string;
        city?: string | string[];
        district?: string;
      }>;
    }>("/v3/geocode/geo", geocodeParams);
    const fallbackResults = (geocode.geocodes || []).flatMap((item, index) => {
      const [longitude, latitude] = (item.location || "")
        .split(",")
        .map(Number);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      const city =
        typeof item.city === "string" ? item.city : item.province || "";
      const area = `${item.province || ""}${city}`;
      const resultRegion: AddressRegion = area.includes("香港")
        ? "香港"
        : area.includes("澳門") || area.includes("澳门")
          ? "澳門"
          : "大陸";
      if (region && resultRegion !== region) return [];
      const address = item.formatted_address || keyword;
      return [
        {
          id: `${longitude},${latitude},geocode-${index}`,
          name: keyword,
          address,
          displayAddress: formattedAddress(resultRegion, address),
          region: resultRegion,
          city,
          district: item.district || "",
          landmark: keyword,
          latitude,
          longitude,
        },
      ];
    });
    return { data: fallbackResults };
  }

  @Get("driving-route")
  async drivingRoute(@Req() req: RequestLike) {
    const coordinatePattern = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;
    const origin = req.query?.origin || "";
    const destination = req.query?.destination || "";
    if (
      !coordinatePattern.test(origin) ||
      !coordinatePattern.test(destination)
    ) {
      throw new HttpException(
        "Valid origin and destination are required",
        HttpStatus.BAD_REQUEST,
      );
    }
    const params = new URLSearchParams({
      origin,
      destination,
      show_fields: "cost,polyline",
    });
    const data = await this.requestAmap<{
      route?: {
        paths?: Array<{
          distance?: string;
          cost?: { duration?: string };
          steps?: Array<{ polyline?: string }>;
        }>;
      };
    }>("/v5/direction/driving", params);
    const path = data.route?.paths?.[0];
    if (!path)
      throw new HttpException(
        "No driving route was found",
        HttpStatus.NOT_FOUND,
      );
    const points = (path.steps || [])
      .flatMap((step) => (step.polyline || "").split(";"))
      .flatMap((point) => {
        const [longitude, latitude] = point.split(",").map(Number);
        return Number.isFinite(latitude) && Number.isFinite(longitude)
          ? [{ latitude, longitude }]
          : [];
      });
    return {
      distance: Number(path.distance) || 0,
      duration: Number(path.cost?.duration) || 0,
      points,
    };
  }
}

interface CardIdentification {
  network: "visa" | "mastercard" | "unionpay" | "amex" | "jcb" | "unknown";
  valid: boolean;
  maskedNumber: string;
}

function cardNetwork(number: string): CardIdentification["network"] {
  if (/^4/.test(number)) return "visa";
  if (/^(5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]))/.test(number)) return "mastercard";
  if (/^62/.test(number)) return "unionpay";
  if (/^(34|37)/.test(number)) return "amex";
  if (/^(352[89]|35[3-8]\d)/.test(number)) return "jcb";
  return "unknown";
}

function passesLuhn(number: string) {
  let sum = 0;
  let alternate = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

@Controller("payment-cards")
class PaymentCardsController {
  @Post("identify") identify(@Body() body: { cardNumber?: string }) {
    const number = body.cardNumber?.replace(/\D/g, "") || "";
    const validLength = number.length >= 12 && number.length <= 19;
    const valid = validLength && passesLuhn(number);
    return {
      network: valid ? cardNetwork(number) : "unknown",
      valid,
      maskedNumber:
        number.length > 4
          ? `${"*".repeat(number.length - 4)}${number.slice(-4)}`
          : "",
    };
  }
}

@Controller("wallet")
class WalletController {
  @Get("me")
  async getMe(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: {
        walletTransactions: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!user) throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    return {
      id: user.id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      countryCode: user.countryCode,
      cashBalance: user.cashBalance,
      fareBalance: user.fareBalance,
      walletCurrency: "RMB",
      transactions: user.walletTransactions,
    };
  }

  @Post("top-up")
  async topUp(
    @Req() req: RequestLike,
    @Body() body: { amount?: number; method?: string },
  ) {
    const session = await clientSessionFrom(req);
    const amount = roundMoney(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpException(
        "Valid positive top up amount is required",
        HttpStatus.BAD_REQUEST,
      );
    }
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const userTarget = await prisma.user.findUnique({
      where: { id: session.sub },
    });
    if (!userTarget)
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userTarget.id },
      });
      const balanceAfter = roundMoney(user.fareBalance + amount);
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { fareBalance: balanceAfter },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: user.id,
          wallet: "FARE",
          type: "TOP_UP",
          amount,
          balanceAfter,
          reason: `車費增值 (${body.method || "在線支付"})${settings.sandboxMode ? " [測試模式]" : ""}`,
        },
      });
      return { user: userResponse(updated), transaction };
    });
    return { ok: true, ...result };
  }
}

@Controller("payments")
class PaymentsController {
  @Post("trip-pending")
  async tripPending(
    @Req() req: RequestLike,
    @Body()
    body: {
      quoteId?: string;
      origin?: string;
      destination?: string;
      originAddress?: {
        region?: string;
        city?: string;
        district?: string;
        place?: string;
        detail?: string;
        latitude?: number;
        longitude?: number;
      };
      destinationAddress?: {
        region?: string;
        city?: string;
        district?: string;
        place?: string;
        detail?: string;
        latitude?: number;
        longitude?: number;
      };
      originLatitude?: number;
      originLongitude?: number;
      destinationLatitude?: number;
      destinationLongitude?: number;
      routePoints?: Array<{ latitude?: number; longitude?: number }>;
      scheduledAt?: string;
      durationSeconds?: number;
      passenger?: {
        name?: string;
        phone?: string;
        phoneRegion?: string;
        gender?: string;
        documentType?: string;
        passportCountry?: string | null;
      };
    },
  ) {
    const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim() : "";
    if (!quoteId)
      throw new HttpException("quoteId is required", HttpStatus.BAD_REQUEST);

    const session = await clientSessionFrom(req);
    const quote = await prisma.fareQuote.findUnique({
      where: { id: quoteId },
      include: { pricing: true },
    });
    if (!quote)
      throw new HttpException("Quote not found", HttpStatus.NOT_FOUND);
    if (quote.expiresAt && quote.expiresAt.getTime() <= Date.now())
      throw new HttpException("Quote has expired", HttpStatus.GONE);

    const existingTrip = await prisma.trip.findUnique({ where: { quoteId } });
    const pendingExpiresAt = quoteExpiryDate();
    const mapData = routeMapData({
      originLatitude: body.originLatitude ?? body.originAddress?.latitude,
      originLongitude: body.originLongitude ?? body.originAddress?.longitude,
      destinationLatitude: body.destinationLatitude ?? body.destinationAddress?.latitude,
      destinationLongitude: body.destinationLongitude ?? body.destinationAddress?.longitude,
      routePoints: body.routePoints,
    });
    if (existingTrip) {
      if (existingTrip.userId !== session.sub)
        throw new ForbiddenException("Quote belongs to another user");
      if (existingTrip.status !== "PENDING")
        throw new HttpException(
          "Quote already has a paid trip",
          HttpStatus.CONFLICT,
        );
      await prisma.fareQuote.update({
        where: { id: quoteId },
        data: { expiresAt: pendingExpiresAt },
      });
      await prisma.trip.update({
        where: { id: existingTrip.id },
        data: {
          origin: body.origin?.trim() || existingTrip.origin,
          destination: body.destination?.trim() || existingTrip.destination,
          originRegion: body.originAddress?.region?.trim() || existingTrip.originRegion,
          originCity: body.originAddress?.city?.trim() || existingTrip.originCity,
          originDistrict: body.originAddress?.district?.trim() || existingTrip.originDistrict,
          originPlace: body.originAddress?.place?.trim() || existingTrip.originPlace,
          originDetail: body.originAddress?.detail?.trim() || existingTrip.originDetail,
          destinationRegion: body.destinationAddress?.region?.trim() || existingTrip.destinationRegion,
          destinationCity: body.destinationAddress?.city?.trim() || existingTrip.destinationCity,
          destinationDistrict: body.destinationAddress?.district?.trim() || existingTrip.destinationDistrict,
          destinationPlace: body.destinationAddress?.place?.trim() || existingTrip.destinationPlace,
          destinationDetail: body.destinationAddress?.detail?.trim() || existingTrip.destinationDetail,
          ...mapData,
        },
      });
      return {
        ok: true,
        tripId: existingTrip.id,
        quoteId,
        status: existingTrip.status,
      };
    }

    const scheduledAt = body.scheduledAt
      ? parseScheduledAt(body.scheduledAt)
      : new Date(Date.now() + 3600000);
    await prisma.fareQuote.update({
      where: { id: quoteId },
      data: { expiresAt: pendingExpiresAt },
    });
    const passengerData =
      body.passenger?.name?.trim() && body.passenger.phone?.trim()
        ? {
            passengerName: body.passenger.name.trim(),
            passengerPhone: body.passenger.phone.trim(),
            passengerPhoneRegion: body.passenger.phoneRegion?.trim() || null,
            passengerGender: body.passenger.gender?.trim() || null,
            passengerDocumentType: body.passenger.documentType?.trim() || null,
            passengerPassportCountry:
              body.passenger.passportCountry?.trim() || null,
          }
        : {};
    const trip = await prisma.trip.create({
      data: {
        userId: session.sub,
        quoteId,
        origin: body.origin?.trim() || quote.pricing?.routeOriginCity || "香港",
        originRegion: body.originAddress?.region?.trim() || null,
        originCity: body.originAddress?.city?.trim() || null,
        originDistrict: body.originAddress?.district?.trim() || null,
        originPlace: body.originAddress?.place?.trim() || null,
        originDetail: body.originAddress?.detail?.trim() || null,
        destination:
          body.destination?.trim() ||
          quote.pricing?.routeDestinationCity ||
          "深圳",
        destinationRegion: body.destinationAddress?.region?.trim() || null,
        destinationCity: body.destinationAddress?.city?.trim() || null,
        destinationDistrict: body.destinationAddress?.district?.trim() || null,
        destinationPlace: body.destinationAddress?.place?.trim() || null,
        destinationDetail: body.destinationAddress?.detail?.trim() || null,
        ...mapData,
        region: "GUANGDONG",
        scheduledAt: Number.isNaN(scheduledAt.getTime())
          ? new Date(Date.now() + 3600000)
          : scheduledAt,
        estimatedArrivalAt: new Date(
          (Number.isNaN(scheduledAt.getTime())
            ? new Date(Date.now() + 3600000)
            : scheduledAt
          ).getTime() +
            (quote.durationSeconds || 0) * 1000,
        ),
        status: "PENDING",
        ...passengerData,
      },
    });
    return { ok: true, tripId: trip.id, quoteId, status: trip.status };
  }

  @Post("trip-pay")
  async tripPay(
    @Req() req: RequestLike,
    @Body()
    body: {
      quoteId?: string;
      userId?: string;
      useFareBalance?: boolean;
      useCashBalance?: boolean;
      externalPaymentMethod?: string;
      origin?: string;
      destination?: string;
      originAddress?: {
        region?: string;
        city?: string;
        district?: string;
        place?: string;
        detail?: string;
        latitude?: number;
        longitude?: number;
      };
      destinationAddress?: {
        region?: string;
        city?: string;
        district?: string;
        place?: string;
        detail?: string;
        latitude?: number;
        longitude?: number;
      };
      originLatitude?: number;
      originLongitude?: number;
      destinationLatitude?: number;
      destinationLongitude?: number;
      routePoints?: Array<{ latitude?: number; longitude?: number }>;
      scheduledAt?: string;
      passenger?: {
        name?: string;
        phone?: string;
        phoneRegion?: string;
        gender?: string;
        documentType?: string;
        passportCountry?: string | null;
      };
    },
  ) {
    const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim() : "";
    if (!quoteId)
      throw new HttpException("quoteId is required", HttpStatus.BAD_REQUEST);

    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    let session: ClientSession;
    try {
      session = await clientSessionFrom(req);
    } catch {
      const adminSession = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
      if (!body.userId)
        throw new HttpException(
          "userId is required for administrator payments",
          HttpStatus.BAD_REQUEST,
        );
      session = {
        sub: body.userId,
        exp: adminSession.exp,
        jti: adminSession.jti,
      };
    }
    if (body.userId && body.userId !== session.sub) {
      try {
        const adminSession = requireRole(req, ["SUPER_ADMIN", "OPERATOR"]);
        session = {
          sub: body.userId,
          exp: adminSession.exp,
          jti: adminSession.jti,
        };
      } catch {
        throw new ForbiddenException("Cannot pay for another user");
      }
    }
    const userTarget = await prisma.user.findUnique({
      where: { id: session.sub },
    });
    if (!userTarget)
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);

    const result = await prisma.$transaction(
      async (tx) => {
        const existingPayment = await tx.payment.findUnique({
          where: { quoteId },
        });
        if (existingPayment) {
          if (existingPayment.userId !== userTarget.id)
            throw new ForbiddenException("Quote belongs to another user");
          const existingUser = await tx.user.findUniqueOrThrow({
            where: { id: existingPayment.userId },
          });
          if (settings.dispatchSchedulingEnabled) {
            await openEligibleTripsForDispatch(
              tx,
              settings.driverPayoutPercentage,
              existingPayment.tripId,
            );
          }
          return {
            ok: true,
            tripId: existingPayment.tripId,
            quoteId: existingPayment.quoteId,
            total: existingPayment.total,
            currency: existingPayment.currency,
            paidSummary: {
              fareBalance: existingPayment.fareAmount,
              cashBalance: existingPayment.cashAmount,
              external: existingPayment.externalAmount,
              externalMethod: existingPayment.externalPaymentMethod,
            },
            user: {
              id: existingUser.id,
              fareBalance: existingUser.fareBalance,
              cashBalance: existingUser.cashBalance,
            },
          };
        }
        const existingPendingTrip = await tx.trip.findUnique({
          where: { quoteId },
        });
        if (existingPendingTrip) {
          if (existingPendingTrip.userId !== userTarget.id)
            throw new ForbiddenException("Quote belongs to another user");
          if (existingPendingTrip.status !== "PENDING")
            throw new HttpException(
              "Trip is not awaiting payment",
              HttpStatus.CONFLICT,
            );
        }
        const quote = await tx.fareQuote.findUnique({
          where: { id: quoteId },
          include: {
            pricing: true,
            vehicle: true,
            promotionUsages: true,
            lines: { orderBy: { order: "asc" } },
          },
        });
        if (!quote)
          throw new HttpException("Quote not found", HttpStatus.NOT_FOUND);
        if (quote.expiresAt && quote.expiresAt.getTime() <= Date.now()) {
          throw new HttpException("Quote has expired", HttpStatus.GONE);
        }

        const totalAmount = roundMoney(quote.total);
        const paymentCurrency = currencyCode(quote.currency);
        if (!paymentCurrency)
          throw new HttpException(
            "Quote currency must be RMB or HKD",
            HttpStatus.BAD_REQUEST,
          );
        const useFare =
          body.useFareBalance !== false && settings.fareBalancePayEnabled;
        const useCash =
          body.useCashBalance !== false && settings.cashBalancePayEnabled;

        const user = await tx.user.findUniqueOrThrow({
          where: { id: userTarget.id },
        });

        let farePaid = 0;
        let fareApplied = 0;
        let cashPaid = 0;
        let cashApplied = 0;

        if (useFare && user.fareBalance > 0) {
          const availableFare = convertCurrency(
            user.fareBalance,
            "RMB",
            paymentCurrency,
            settings.exchangeRate,
          );
          fareApplied = roundMoney(Math.min(availableFare, totalAmount));
          farePaid = roundMoney(
            Math.min(
              user.fareBalance,
              convertCurrency(
                fareApplied,
                paymentCurrency,
                "RMB",
                settings.exchangeRate,
              ),
            ),
          );
        }
        const remainingAfterFare = roundMoney(totalAmount - fareApplied);

        if (useCash && remainingAfterFare > 0 && user.cashBalance > 0) {
          const availableCash = convertCurrency(
            user.cashBalance,
            "RMB",
            paymentCurrency,
            settings.exchangeRate,
          );
          cashApplied = roundMoney(Math.min(availableCash, remainingAfterFare));
          cashPaid = roundMoney(
            Math.min(
              user.cashBalance,
              convertCurrency(
                cashApplied,
                paymentCurrency,
                "RMB",
                settings.exchangeRate,
              ),
            ),
          );
        }
        const externalPaid = roundMoney(
          totalAmount - fareApplied - cashApplied,
        );

        if (externalPaid > 0) {
          throw new HttpException(
            {
              code: "EXTERNAL_PAYMENT_REQUIRED",
              message: `錢包餘額不足，仍需支付 ${externalPaid.toFixed(2)} ${quote.currency}`,
              outstandingAmount: externalPaid,
              currency: quote.currency,
            },
            HttpStatus.PAYMENT_REQUIRED,
          );
        }

        let currentFare = user.fareBalance;
        let currentCash = user.cashBalance;

        if (farePaid > 0) {
          currentFare = roundMoney(currentFare - farePaid);
          await tx.user.update({
            where: { id: user.id },
            data: { fareBalance: currentFare },
          });
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              wallet: "FARE",
              type: "TRIP_PAYMENT",
              amount: farePaid,
              balanceAfter: currentFare,
              reason: `出行支付 - 車費餘額抵扣 (報價: ${quote.id.slice(-8)})`,
            },
          });
        }

        if (cashPaid > 0) {
          currentCash = roundMoney(currentCash - cashPaid);
          await tx.user.update({
            where: { id: user.id },
            data: { cashBalance: currentCash },
          });
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              wallet: "CASH",
              type: "TRIP_PAYMENT",
              amount: cashPaid,
              balanceAfter: currentCash,
              reason: `出行支付 - 現金餘額抵扣 (報價: ${quote.id.slice(-8)})`,
            },
          });
        }

        // Consume promotions attached to quote
        const now = new Date();
        for (const usage of quote.promotionUsages.filter(
          (item) => item.status === "RESERVED",
        )) {
          await tx.promotionUsage.update({
            where: { id: usage.id },
            data: { status: "USED", usedAt: now },
          });
          await tx.promotion.update({
            where: { id: usage.promotionId },
            data: { usageCount: { increment: 1 } },
          });
        }

        // Create or confirm Trip record
        const origin = body.origin || quote.pricing?.routeOriginCity || "香港";
        const destination =
          body.destination || quote.pricing?.routeDestinationCity || "深圳";
        const mapData = routeMapData({
          originLatitude: body.originLatitude ?? body.originAddress?.latitude,
          originLongitude: body.originLongitude ?? body.originAddress?.longitude,
          destinationLatitude: body.destinationLatitude ?? body.destinationAddress?.latitude,
          destinationLongitude: body.destinationLongitude ?? body.destinationAddress?.longitude,
          routePoints: body.routePoints,
        });
        const addressData = {
          ...(body.originAddress
            ? {
                originRegion: body.originAddress.region?.trim() || null,
                originCity: body.originAddress.city?.trim() || null,
                originDistrict: body.originAddress.district?.trim() || null,
                originPlace: body.originAddress.place?.trim() || null,
                originDetail: body.originAddress.detail?.trim() || null,
              }
            : {}),
          ...(body.destinationAddress
            ? {
                destinationRegion:
                  body.destinationAddress.region?.trim() || null,
                destinationCity: body.destinationAddress.city?.trim() || null,
                destinationDistrict:
                  body.destinationAddress.district?.trim() || null,
                destinationPlace: body.destinationAddress.place?.trim() || null,
                destinationDetail:
                  body.destinationAddress.detail?.trim() || null,
              }
            : {}),
        };
        const scheduledAt = body.scheduledAt
          ? parseScheduledAt(body.scheduledAt)
          : new Date(Date.now() + 3600000);
        const passengerData =
          body.passenger?.name?.trim() && body.passenger.phone?.trim()
            ? {
                passengerName: body.passenger.name.trim(),
                passengerPhone: body.passenger.phone.trim(),
                passengerPhoneRegion:
                  body.passenger.phoneRegion?.trim() || null,
                passengerGender: body.passenger.gender?.trim() || null,
                passengerDocumentType:
                  body.passenger.documentType?.trim() || null,
                passengerPassportCountry:
                  body.passenger.passportCountry?.trim() || null,
              }
            : {};

        const trip = existingPendingTrip
          ? await tx.trip.update({
              where: { id: existingPendingTrip.id },
              data: {
                origin,
                destination,
                ...addressData,
                ...mapData,
                scheduledAt: Number.isNaN(scheduledAt.getTime())
                  ? existingPendingTrip.scheduledAt
                  : scheduledAt,
                estimatedArrivalAt: new Date(
                  (Number.isNaN(scheduledAt.getTime())
                    ? existingPendingTrip.scheduledAt
                    : scheduledAt
                  ).getTime() +
                    (quote.durationSeconds || 0) * 1000,
                ),
                status: "CONFIRMED",
                ...passengerData,
                fareBalancePaid: farePaid,
                cashBalancePaid: cashPaid,
                externalPaid: 0,
                externalPaymentMethod: null,
              },
            })
          : await tx.trip.create({
              data: {
                userId: user.id,
                quoteId: quote.id,
                origin,
                destination,
                ...addressData,
                ...mapData,
                region: "GUANGDONG",
                scheduledAt: Number.isNaN(scheduledAt.getTime())
                  ? new Date()
                  : scheduledAt,
                estimatedArrivalAt: new Date(
                  (Number.isNaN(scheduledAt.getTime())
                    ? new Date()
                    : scheduledAt
                  ).getTime() +
                    (quote.durationSeconds || 0) * 1000,
                ),
                status: "CONFIRMED",
                ...passengerData,
                fareBalancePaid: farePaid,
                cashBalancePaid: cashPaid,
                externalPaid: 0,
                externalPaymentMethod: null,
              },
            });
        const payment = await tx.payment.create({
          data: {
            tripId: trip.id,
            quoteId: quote.id,
            userId: user.id,
            total: totalAmount,
            currency: quote.currency,
            fareAmount: farePaid,
            cashAmount: cashPaid,
            externalAmount: 0,
            externalPaymentMethod: null,
            externalReference: null,
          },
        });
        if (settings.dispatchSchedulingEnabled) {
          await openEligibleTripsForDispatch(
            tx,
            settings.driverPayoutPercentage,
            trip.id,
          );
        }
        await tx.walletTransaction.updateMany({
          where: {
            userId: user.id,
            paymentId: null,
            reason: { contains: quote.id.slice(-8) },
          },
          data: { paymentId: payment.id },
        });

        return {
          ok: true,
          tripId: trip.id,
          quoteId: quote.id,
          total: totalAmount,
          currency: quote.currency,
          paidSummary: {
            fareBalance: farePaid,
            cashBalance: cashPaid,
            external: 0,
            externalMethod: null,
          },
          user: {
            id: user.id,
            fareBalance: currentFare,
            cashBalance: currentCash,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await publishDriverOrderEvent({ reason: "available", tripId: result.tripId });
    return result;
  }
}

function clientTripResponse(
  trip: Prisma.TripGetPayload<{
    include: {
      user: {
        select: {
          name: true;
          displayName: true;
          gender: true;
          countryCode: true;
          phoneNumber: true;
        };
      };
      payment: true;
      quote: {
        select: {
          expiresAt: true;
          total: true;
          currency: true;
          lines: true;
          vehicle: true;
          pricing: { select: { categoryName: true } };
        };
      };
    };
  }>,
) {
  const paymentExpiresAt =
    trip.status === "PENDING" ? trip.quote?.expiresAt || null : null;
  const assignmentStartedAt = trip.payment?.createdAt || trip.createdAt;
  const assignmentExpiresAt = new Date(
    assignmentStartedAt.getTime() + 3 * 60 * 60 * 1000,
  );
  const assignmentExpired = assignmentExpiresAt.getTime() <= Date.now();
  const vehicle = trip.quote?.vehicle;
  const vehicleCategoryName = trip.quote?.pricing?.categoryName || null;
  const rawName = (
    trip.passengerName ||
    trip.user.displayName ||
    trip.user.name ||
    ""
  ).trim();
  const passengerName = rawName || "—";
  const passengerPhone = trip.passengerPhone || trip.user.phoneNumber;
  return {
    id: trip.id,
    quoteId: trip.quoteId,
    origin: trip.origin,
    destination: trip.destination,
    originAddress:
      trip.originRegion ||
      trip.originCity ||
      trip.originDistrict ||
      trip.originPlace ||
      trip.originDetail
        ? {
            region: trip.originRegion,
            city: trip.originCity,
            district: trip.originDistrict,
            place: trip.originPlace,
            detail: trip.originDetail,
            latitude: trip.originLatitude,
            longitude: trip.originLongitude,
          }
        : null,
    destinationAddress:
      trip.destinationRegion ||
      trip.destinationCity ||
      trip.destinationDistrict ||
      trip.destinationPlace ||
      trip.destinationDetail
        ? {
            region: trip.destinationRegion,
            city: trip.destinationCity,
            district: trip.destinationDistrict,
            place: trip.destinationPlace,
            detail: trip.destinationDetail,
            latitude: trip.destinationLatitude,
            longitude: trip.destinationLongitude,
          }
        : null,
    originLatitude: trip.originLatitude,
    originLongitude: trip.originLongitude,
    destinationLatitude: trip.destinationLatitude,
    destinationLongitude: trip.destinationLongitude,
    routePoints: normalizeRoutePoints(trip.routePoints) || [],
    region: trip.region,
    scheduledAt: trip.scheduledAt.toISOString(),
    estimatedArrivalAt: trip.estimatedArrivalAt?.toISOString() || null,
    passenger: {
      name: passengerName,
      gender: trip.passengerGender || trip.user.gender || null,
      countryCode: trip.passengerPhoneRegion || trip.user.countryCode,
      phoneNumber: passengerPhone,
    },
    paymentExpiresAt: paymentExpiresAt?.toISOString() || null,
    assignmentExpiresAt: assignmentExpiresAt.toISOString(),
    assignmentExpired,
    quote: trip.quote
      ? {
          total: trip.quote.total,
          currency: trip.quote.currency,
          lines: trip.quote.lines,
        }
      : null,
    vehicle: vehicle
      ? {
          id: vehicle.vehicleId,
          categoryId: vehicle.categoryId,
          categoryName: vehicleCategoryName,
          brand: vehicle.brand,
          model: vehicle.model,
          series: vehicle.series,
          seats: vehicle.seats,
          modelChoiceLabel: vehicle.modelChoiceLabel,
          logo:
            vehicle.logo ||
            `/vehicles/${encodeURIComponent(vehicle.vehicleId)}/logo`,
        }
      : null,
    executionPhase: trip.executionPhase || null,
    driver:
      trip.driverName ||
      trip.driverPhone ||
      trip.vehiclePlate ||
      trip.vehicleHkPlate ||
      trip.vehicleMacauPlate ||
      trip.vehicleMainlandPlate
        ? {
            name: trip.driverName || "—",
            phone: trip.driverPhone || "—",
            vehiclePlate: trip.vehiclePlate || trip.vehicleHkPlate || null,
            hkPlate: trip.vehicleHkPlate || trip.vehiclePlate || null,
            macauPlate: trip.vehicleMacauPlate || null,
            mainlandPlate: trip.vehicleMainlandPlate || null,
          }
        : null,
    assignedAt: trip.assignedAt?.toISOString() || null,
    acceptedAt: trip.acceptedAt?.toISOString() || null,
    arrivedAt: trip.arrivedAt?.toISOString() || null,
    startedAt: trip.startedAt?.toISOString() || null,
    completedAt: trip.completedAt?.toISOString() || null,
    status: trip.status,
    createdAt: trip.createdAt.toISOString(),
    payment: trip.payment
      ? {
          id: trip.payment.id,
          total: trip.payment.total,
          currency: trip.payment.currency,
          status: trip.payment.status,
          fareAmount: trip.payment.fareAmount,
          cashAmount: trip.payment.cashAmount,
          externalAmount: trip.payment.externalAmount,
          externalPaymentMethod: trip.payment.externalPaymentMethod,
          createdAt: trip.payment.createdAt.toISOString(),
        }
      : null,
  };
}

@Controller("client/mileage")
class ClientMileageController {
  private async account(userId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.mileageAccount.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  @Get("summary")
  async summary(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const [account, ledger, rewards] = await Promise.all([
      this.account(session.sub),
      prisma.mileageLedger.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.mileageReward.findMany({
        where: { enabled: true },
        orderBy: { cost: "asc" },
      }),
    ]);
    const now = new Date();
    const expiring = ledger
      .filter(
        (item) => item.amount > 0 && item.expiresAt && item.expiresAt > now,
      )
      .sort((a, b) => a.expiresAt!.getTime() - b.expiresAt!.getTime())[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return {
      balance: account.balance,
      lifetimeEarned: account.lifetimeEarned,
      lifetimeRedeemed: account.lifetimeRedeemed,
      monthlyEarned: ledger
        .filter((item) => item.amount > 0 && item.createdAt >= monthStart)
        .reduce((sum, item) => sum + item.amount, 0),
      yearlyEarned: ledger
        .filter((item) => item.amount > 0 && item.createdAt >= yearStart)
        .reduce((sum, item) => sum + item.amount, 0),
      expiringAmount: expiring?.amount || 0,
      expiringAt: expiring?.expiresAt?.toISOString() || null,
      ledger,
      rewards,
    };
  }

  @Get("ledger")
  async listLedger(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const items = await prisma.mileageLedger.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { data: items };
  }

  @Get("rewards")
  async listRewards() {
    return {
      data: await prisma.mileageReward.findMany({
        where: { enabled: true },
        orderBy: { cost: "asc" },
      }),
    };
  }

  @Post("redeem")
  async redeem(@Req() req: RequestLike, @Body() body: { rewardId?: unknown }) {
    const session = await clientSessionFrom(req);
    const rewardId =
      typeof body.rewardId === "string" ? body.rewardId.trim() : "";
    if (!rewardId)
      throw new HttpException("請選擇兌換項目", HttpStatus.BAD_REQUEST);
    return prisma.$transaction(async (tx) => {
      const reward = await tx.mileageReward.findUnique({
        where: { id: rewardId },
        include: { promotion: true },
      });
      if (!reward || !reward.enabled)
        throw new HttpException("兌換項目不存在或已下架", HttpStatus.NOT_FOUND);
      if (reward.stock !== null && reward.stock <= 0)
        throw new HttpException("兌換項目已換罄", HttpStatus.CONFLICT);
      const account = await this.account(session.sub, tx);
      if (account.balance < reward.cost)
        throw new HttpException("可用里程不足", HttpStatus.CONFLICT);
      const updated = await tx.mileageAccount.update({
        where: { userId: session.sub },
        data: {
          balance: { decrement: reward.cost },
          lifetimeRedeemed: { increment: reward.cost },
        },
      });
      const redemption = await tx.mileageRedemption.create({
        data: {
          userId: session.sub,
          rewardId: reward.id,
          cost: reward.cost,
          couponCode:
            reward.promotion?.enabled && reward.promotion.couponCode
              ? reward.promotion.couponCode
              : null,
        },
      });
      await tx.mileageLedger.create({
        data: {
          userId: session.sub,
          amount: -reward.cost,
          balanceAfter: updated.balance,
          type: "REDEEM",
          reason: `兌換：${reward.name}`,
          redemptionId: redemption.id,
        },
      });
      if (reward.stock !== null)
        await tx.mileageReward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } },
        });
      return { data: redemption, message: "兌換成功" };
    });
  }
}

@Controller("client")
class ClientOrdersController {
  @Get("invitations/me")
  async invitationDashboard(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const code = await invitationCodeFor(session.sub);
    const settings = await prisma.appSetting.findUniqueOrThrow({
      where: { id: appSettingsDefaults.id },
    });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const invitations = await prisma.invitation.findMany({
      where: { inviterId: session.sub },
      include: { invitee: { select: { name: true, displayName: true, phoneNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    await prisma.invitation.updateMany({
      where: { inviterId: session.sub, status: "REGISTERED", expiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    });
    const normalizedInvitations = invitations.map((item) =>
      item.status === "REGISTERED" && item.expiresAt < now ? { ...item, status: "EXPIRED" as const } : item,
    );
    const monthly = normalizedInvitations.filter((item) => item.createdAt >= monthStart);
    const maskName = (name: string) => {
      if (!name) return "好友";
      if (name.length === 1) return `${name}**`;
      return `${name.slice(0, 1)}${"*".repeat(Math.min(2, name.length - 1))}`;
    };
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const requestBase = req.headers.origin || (req.headers.host ? `${protocol}://${req.headers.host}` : "");
    const shareBase = (process.env.INVITE_BASE_URL || requestBase).replace(/\/$/, "");
    return {
      code,
      enabled: settings.invitationEnabled,
      shareUrl: `${shareBase}/#/pages/login/login?invite=${encodeURIComponent(code)}`,
      rewards: {
        inviterMileage: settings.invitationInviterMileage,
        inviteeFare: settings.invitationInviteeFare,
        currency: settings.walletCurrency,
      },
      qualificationDays: settings.invitationQualificationDays,
      mileageValidityMonths: settings.invitationMileageValidityMonths,
      summary: {
        month: now.getMonth() + 1,
        invited: monthly.length,
        rewarded: monthly.filter((item) => item.status === "REWARDED").length,
        pending: monthly.filter((item) => item.status === "REGISTERED").length,
        mileageEarned: monthly.filter((item) => item.status === "REWARDED").reduce((total, item) => total + item.inviterMileageReward, 0),
      },
      records: normalizedInvitations.map((item) => ({
        id: item.id,
        name: maskName(item.invitee.displayName || item.invitee.name || item.invitee.phoneNumber),
        status: item.status,
        reward: item.status === "REWARDED" ? item.inviterMileageReward : 0,
        registeredAt: item.createdAt.toISOString(),
        rewardedAt: item.rewardedAt?.toISOString() || null,
      })),
    };
  }

  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\/(png|jpeg|webp|gif)$/.test(file.mimetype)),
    }),
  )
  async uploadAvatar(
    @Req() req: RequestLike,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const session = await clientSessionFrom(req);
    if (!file)
      throw new HttpException("只接受圖片檔案", HttpStatus.BAD_REQUEST);
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: {
        avatarUrl: null,
        avatarData: new Uint8Array(file.buffer),
        avatarMimeType: file.mimetype,
      },
    });
    return userResponse(user);
  }

  @Get("avatar/:userId")
  async getAvatar(
    @Param("userId") userId: string,
    @Req() req: RequestLike,
    @Res() response: Response,
  ) {
    const expires = Number(req.query?.expires);
    const signature = req.query?.signature || "";
    if (!validAvatarSignature(userId, expires, signature))
      throw new UnauthorizedException("Valid avatar URL required");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarData: true, avatarMimeType: true },
    });
    if (!user?.avatarData || !user.avatarMimeType)
      throw new HttpException("Avatar not found", HttpStatus.NOT_FOUND);
    response.setHeader("Cache-Control", "private, no-store");
    response.type(user.avatarMimeType).send(Buffer.from(user.avatarData));
  }

  @Get("me")
  async getProfile(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    return userResponse(user);
  }

  @Patch("me")
  async updateProfile(
    @Req() req: RequestLike,
    @Body()
    body: {
      name?: string;
      displayName?: string;
      avatarUrl?: string;
      email?: string;
      password?: string;
      gender?: string;
      region?: string;
      birthday?: string;
    },
  ) {
    const session = await clientSessionFrom(req);
    const name = body.name?.trim() || null;
    const displayName = body.displayName?.trim() || null;
    const avatarUrl = body.avatarUrl?.trim() || null;
    const email = parseProfileEmail(body.email);
    const birthday = parseBirthday(body.birthday);
    const password = body.password?.trim() || "";
    const gender = body.gender?.trim() || null;
    const region = body.region?.trim() || null;
    if (
      (name && name.length > 100) ||
      (displayName && displayName.length > 100) ||
      (password && (password.length < 8 || password.length > 200)) ||
      (gender && gender.length > 30) ||
      (region && region.length > 100)
    )
      throw new HttpException("Invalid profile fields", HttpStatus.BAD_REQUEST);
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: {
        name,
        displayName,
        avatarUrl,
        email,
        ...(password ? { passwordHash: hashPassword(password) } : {}),
        gender,
        region,
        birthday,
      },
    });
    return userResponse(user);
  }

  @Get("common-passengers")
  async listCommonPassengers(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    return {
      data: await prisma.commonPassenger.findMany({
        where: { userId: session.sub },
        orderBy: [
          { isDefault: "desc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      }),
    };
  }

  @Post("common-passengers")
  async createCommonPassenger(
    @Req() req: RequestLike,
    @Body()
    body: {
      name?: string;
      phone?: string;
      phoneRegion?: string;
      gender?: string;
      documentType?: string;
      passportCountry?: string;
      isDefault?: boolean;
    },
  ) {
    const session = await clientSessionFrom(req);
    const value = validateCommonPassenger(body);
    const count = await prisma.commonPassenger.count({
      where: { userId: session.sub },
    });
    if (value.isDefault || count === 0)
      await prisma.commonPassenger.updateMany({
        where: { userId: session.sub },
        data: { isDefault: false },
      });
    return prisma.commonPassenger.create({
      data: {
        ...value,
        userId: session.sub,
        isDefault: value.isDefault || count === 0,
        sortOrder: count,
      },
    });
  }

  @Patch("common-passengers/:id")
  async updateCommonPassenger(
    @Req() req: RequestLike,
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      phone?: string;
      phoneRegion?: string;
      gender?: string;
      documentType?: string;
      passportCountry?: string;
      isDefault?: boolean;
    },
  ) {
    const session = await clientSessionFrom(req);
    const existing = await prisma.commonPassenger.findFirst({
      where: { id, userId: session.sub },
    });
    if (!existing)
      throw new HttpException(
        "Common passenger not found",
        HttpStatus.NOT_FOUND,
      );
    const value = validateCommonPassenger(body, existing);
    if (value.isDefault)
      await prisma.commonPassenger.updateMany({
        where: { userId: session.sub, id: { not: id } },
        data: { isDefault: false },
      });
    return prisma.commonPassenger.update({ where: { id }, data: value });
  }

  @Delete("common-passengers/:id")
  async deleteCommonPassenger(
    @Req() req: RequestLike,
    @Param("id") id: string,
  ) {
    const session = await clientSessionFrom(req);
    const existing = await prisma.commonPassenger.findFirst({
      where: { id, userId: session.sub },
    });
    if (!existing)
      throw new HttpException(
        "Common passenger not found",
        HttpStatus.NOT_FOUND,
      );
    await prisma.commonPassenger.delete({ where: { id } });
    if (existing.isDefault) {
      const replacement = await prisma.commonPassenger.findFirst({
        where: { userId: session.sub },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (replacement)
        await prisma.commonPassenger.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
    }
    return { ok: true };
  }

  async getSecurity(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    return clientSecurityResponse(
      await prisma.user.findUniqueOrThrow({
        where: { id: session.sub },
        include: { authIdentities: true },
      }),
    );
  }

  @Post("security/phone/request")
  async requestPhoneChange(
    @Req() req: RequestLike,
    @Body() body: { countryCode?: string; phoneNumber?: string },
  ) {
    const session = await clientSessionFrom(req);
    const identity = parsePhoneIdentity(body);
    const duplicate = await prisma.user.findFirst({
      where: {
        countryCode: identity.countryCode,
        phoneNumber: identity.phoneNumber,
        id: { not: session.sub },
      },
      select: { id: true },
    });
    if (duplicate)
      throw new HttpException(
        "Phone number is already connected",
        HttpStatus.CONFLICT,
      );
    const code = "00000";
    const challengeId = randomBytes(18).toString("hex");
    const exp = Date.now() + PHONE_CODE_TTL_MS;
    clientPhoneChangeChallenges.set(challengeId, {
      ...identity,
      code,
      exp,
      attempts: 0,
      userId: session.sub,
    });
    await prisma.verificationCode.create({
      data: {
        id: challengeId,
        userId: session.sub,
        countryCode: identity.countryCode,
        phoneNumber: identity.phoneNumber,
        codeHash: createHash("sha256").update(code).digest("hex"),
        expiresAt: new Date(exp),
        purpose: "PHONE_CHANGE",
      },
    });
    return {
      challengeId,
      expiresAt: new Date(exp).toISOString(),
      ...(process.env.NODE_ENV !== "production"
        ? { developmentCode: code }
        : {}),
    };
  }

  @Post("security/phone/verify")
  async verifyPhoneChange(
    @Req() req: RequestLike,
    @Body() body: { challengeId?: string; code?: string },
  ) {
    const session = await clientSessionFrom(req);
    const challengeId = body.challengeId?.trim() || "";
    const memoryChallenge = clientPhoneChangeChallenges.get(challengeId);
    const storedChallenge = await prisma.verificationCode.findUnique({
      where: { id: challengeId },
    });
    const now = Date.now();
    if (
      !storedChallenge ||
      storedChallenge.purpose !== "PHONE_CHANGE" ||
      storedChallenge.userId !== session.sub ||
      storedChallenge.consumedAt ||
      !["ISSUED", "FAILED"].includes(storedChallenge.status) ||
      storedChallenge.expiresAt.getTime() <= now
    ) {
      clientPhoneChangeChallenges.delete(challengeId);
      if (
        storedChallenge?.purpose === "PHONE_CHANGE" &&
        storedChallenge.userId === session.sub &&
        ["ISSUED", "FAILED"].includes(storedChallenge.status) &&
        storedChallenge.expiresAt.getTime() <= now
      )
        await prisma.verificationCode.update({
          where: { id: challengeId },
          data: { status: "EXPIRED" },
        });
      throw new UnauthorizedException("Verification code expired");
    }
    const challenge = memoryChallenge || {
      countryCode: storedChallenge.countryCode,
      phoneNumber: storedChallenge.phoneNumber,
      code: "",
      exp: storedChallenge.expiresAt.getTime(),
      attempts: storedChallenge.attempts,
      userId: session.sub,
    };
    const submittedCode = body.code?.trim() || "";
    if (
      createHash("sha256").update(submittedCode).digest("hex") !==
      storedChallenge.codeHash
    ) {
      const attempts = storedChallenge.attempts + 1;
      await prisma.verificationCode.update({
        where: { id: challengeId },
        data: {
          attempts,
          status: attempts >= PHONE_CODE_MAX_ATTEMPTS ? "LOCKED" : "FAILED",
        },
      });
      if (attempts >= PHONE_CODE_MAX_ATTEMPTS)
        clientPhoneChangeChallenges.delete(challengeId);
      throw new UnauthorizedException("Invalid verification code");
    }
    const duplicate = await prisma.user.findFirst({
      where: {
        countryCode: challenge.countryCode,
        phoneNumber: challenge.phoneNumber,
        id: { not: session.sub },
      },
    });
    if (duplicate)
      throw new HttpException(
        "Phone number is already connected",
        HttpStatus.CONFLICT,
      );
    clientPhoneChangeChallenges.delete(challengeId);
    await prisma.verificationCode.update({
      where: { id: challengeId },
      data: { status: "VERIFIED", consumedAt: new Date() },
    });
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: {
        countryCode: challenge.countryCode,
        phoneNumber: challenge.phoneNumber,
      },
      include: { authIdentities: true },
    });
    return clientSecurityResponse(user);
  }
  @Patch("security")
  async updateSecurity(
    @Req() req: RequestLike,
    @Body() body: { email?: string; password?: string },
  ) {
    const session = await clientSessionFrom(req);
    const email = parseProfileEmail(body.email);
    const password = body.password?.trim() || "";
    if (password && (password.length < 8 || password.length > 200))
      throw new HttpException(
        "Invalid security fields",
        HttpStatus.BAD_REQUEST,
      );
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: {
        email,
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
      include: { authIdentities: true },
    });
    return clientSecurityResponse(user);
  }

  @Post("security/providers")
  async linkProvider(
    @Req() req: RequestLike,
    @Body() body: { provider?: string; providerToken?: string },
  ) {
    const session = await clientSessionFrom(req);
    const provider = body.provider?.trim().toLowerCase();
    const providerToken = body.providerToken?.trim();
    if ((provider !== "wechat" && provider !== "apple") || !providerToken)
      throw new HttpException(
        "Valid third-party provider credentials are required",
        HttpStatus.BAD_REQUEST,
      );
    if (process.env.NODE_ENV === "production")
      throw new HttpException(
        "Third-party provider verification is not configured",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    const existing = await prisma.authIdentity.findUnique({
      where: { provider_providerId: { provider, providerId: providerToken } },
    });
    if (existing && existing.userId !== session.sub)
      throw new HttpException(
        "Third-party account is already connected",
        HttpStatus.CONFLICT,
      );
    if (!existing)
      await prisma.authIdentity.create({
        data: { provider, providerId: providerToken, userId: session.sub },
      });
    return clientSecurityResponse(
      await prisma.user.findUniqueOrThrow({
        where: { id: session.sub },
        include: { authIdentities: true },
      }),
    );
  }

  @Delete("security/providers/:provider")
  async unlinkProvider(
    @Req() req: RequestLike,
    @Param("provider") provider: string,
  ) {
    const session = await clientSessionFrom(req);
    if (provider !== "wechat" && provider !== "apple")
      throw new HttpException(
        "Unsupported third-party provider",
        HttpStatus.BAD_REQUEST,
      );
    const count = await prisma.authIdentity.count({
      where: { userId: session.sub },
    });
    if (count <= 1)
      throw new HttpException(
        "At least one sign-in method must remain connected",
        HttpStatus.CONFLICT,
      );
    await prisma.authIdentity.deleteMany({
      where: { userId: session.sub, provider },
    });
    return clientSecurityResponse(
      await prisma.user.findUniqueOrThrow({
        where: { id: session.sub },
        include: { authIdentities: true },
      }),
    );
  }
  @Get("trips")
  async listTrips(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const trips = await prisma.trip.findMany({
      where: { userId: session.sub },
      include: {
        user: {
          select: {
            name: true,
            displayName: true,
            gender: true,
            countryCode: true,
            phoneNumber: true,
          },
        },
        payment: true,
        quote: {
          select: {
            expiresAt: true,
            total: true,
            currency: true,
            lines: true,
            vehicle: true,
            pricing: { select: { categoryName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { data: trips.map(clientTripResponse) };
  }

  @Get("trips/:id")
  async getTrip(@Req() req: RequestLike, @Param("id") id: string) {
    const session = await clientSessionFrom(req);
    await prisma.trip.updateMany({
      where: {
        id,
        userId: session.sub,
        status: "PENDING",
        quote: { is: { expiresAt: { lte: new Date() } } },
      },
      data: { status: "CANCELLED" },
    });
    const trip = await prisma.trip.findFirst({
      where: { id, userId: session.sub },
      include: {
        user: {
          select: {
            name: true,
            displayName: true,
            gender: true,
            countryCode: true,
            phoneNumber: true,
          },
        },
        payment: true,
        quote: {
          select: {
            expiresAt: true,
            total: true,
            currency: true,
            lines: true,
            vehicle: true,
            pricing: { select: { categoryName: true } },
          },
        },
      },
    });
    if (!trip) throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
    return clientTripResponse(trip);
  }

  @Post("trips/:id/cancel")
  async cancelTrip(@Req() req: RequestLike, @Param("id") id: string) {
    const session = await clientSessionFrom(req);
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findFirst({
        where: { id, userId: session.sub },
        include: {
          user: {
            select: {
              name: true,
              displayName: true,
              gender: true,
              countryCode: true,
              phoneNumber: true,
            },
          },
          payment: true,
          quote: {
            select: {
              expiresAt: true,
              total: true,
              currency: true,
              lines: true,
              vehicle: true,
              pricing: { select: { categoryName: true } },
            },
          },
        },
      });
      if (!trip)
        throw new HttpException("Trip not found", HttpStatus.NOT_FOUND);
      if (trip.status === "CANCELLED")
        return {
          response: clientTripResponse(trip),
          cancelledDriverId: null,
        };
      if (trip.status === "COMPLETED" || trip.executionPhase === "IN_PROGRESS")
        throw new HttpException(
          "Completed or in-progress trips cannot be cancelled",
          HttpStatus.CONFLICT,
        );

      const payment = trip.payment;
      if (payment && payment.status === "PAID") {
        const refundClaim = await tx.payment.updateMany({
          where: { id: payment.id, status: "PAID" },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
        if (refundClaim.count === 1) {
          const user = await tx.user.findUniqueOrThrow({
            where: { id: session.sub },
          });
          const fareBalance = roundMoney(user.fareBalance + payment.fareAmount);
          const cashBalance = roundMoney(user.cashBalance + payment.cashAmount);
          await tx.user.update({
            where: { id: user.id },
            data: { fareBalance, cashBalance },
          });
          if (payment.fareAmount > 0)
            await tx.walletTransaction.create({
              data: {
                userId: user.id,
                wallet: "FARE",
                type: "REFUND",
                amount: payment.fareAmount,
                balanceAfter: fareBalance,
                reason: `訂單退款 - 車費餘額 (訂單: ${trip.id.slice(-8)})`,
                paymentId: payment.id,
              },
            });
          if (payment.cashAmount > 0)
            await tx.walletTransaction.create({
              data: {
                userId: user.id,
                wallet: "CASH",
                type: "REFUND",
                amount: payment.cashAmount,
                balanceAfter: cashBalance,
                reason: `訂單退款 - 現金餘額 (訂單: ${trip.id.slice(-8)})`,
                paymentId: payment.id,
              },
            });
        }
      }
      const cancelledAt = new Date();
      const updated = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: "CANCELLED",
          executionPhase: null,
          cancelledAt,
          cancellationSource: "PASSENGER",
        },
        include: {
          user: {
            select: {
              name: true,
              displayName: true,
              gender: true,
              countryCode: true,
              phoneNumber: true,
            },
          },
          payment: true,
          quote: {
            select: {
              expiresAt: true,
              total: true,
              currency: true,
              lines: true,
              vehicle: true,
              pricing: { select: { categoryName: true } },
            },
          },
        },
      });
      await tx.tripOrderUrl.updateMany({
        where: { tripId: trip.id, revokedAt: null },
        data: { revokedAt: cancelledAt },
      });
      if (trip.driverId && trip.acceptedAt) {
        await tx.notification.create({
          data: {
            title: "客戶已取消行程",
            content: "客戶已取消此行程，請停止前往。",
            audience: "driver",
            templateType: "trip_cancelled",
            important: true,
            driverId: trip.driverId,
            tripId: trip.id,
          },
        });
      }
      return {
        response: clientTripResponse(updated),
        cancelledDriverId: trip.driverId && trip.acceptedAt ? trip.driverId : null,
      };
    });
    if (result.cancelledDriverId) {
      await publishDriverOrderEvent({
        reason: "cancelled",
        tripId: id,
        driverId: result.cancelledDriverId,
      });
    }
    return result.response;
  }

  @Get("transactions")
  async listTransactions(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req);
    const data = await prisma.payment.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      include: { trip: true },
    });
    return {
      data: data.map((payment) => ({
        id: payment.id,
        tripId: payment.tripId,
        total: payment.total,
        currency: payment.currency,
        status: payment.status,
        fareAmount: payment.fareAmount,
        cashAmount: payment.cashAmount,
        externalAmount: payment.externalAmount,
        externalPaymentMethod: payment.externalPaymentMethod,
        createdAt: payment.createdAt.toISOString(),
        refundedAt: payment.refundedAt?.toISOString() || null,
        trip: {
          origin: payment.trip.origin,
          destination: payment.trip.destination,
          status: payment.trip.status,
        },
      })),
    };
  }
}

@Controller("health")
class HealthController {
  @Get("live")
  live() {
    return { status: "ok", service: "master-travel-project-api" };
  }

  @Get(["", "ready"])
  async ready() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        service: "master-travel-project-api",
        dependencies: { database: "ok" },
      };
    } catch {
      throw new HttpException(
        { status: "unavailable", dependencies: { database: "unavailable" } },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
@Module({
  controllers: [
    HealthController,
    LocationController,
    SettingsController,
    RecommendedAddressesController,
    NotificationsController,
    PublicVehiclesController,
    PublicQuotesController,
    PublicMembershipPlansController,
    ClientMembershipController,
    PublicPromotionsController,
    PaymentCardsController,
    WalletController,
    PaymentsController,
    ClientMileageController,
    ClientOrdersController,
    ClientAuthController,
    DriverAuthController,
    DriverOrderInviteShareController,
    DriverOrderInviteController,
    DriverOrderUrlController,
    AdminAuthController,
    AdminController,
    SupportController,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AdminAccessInterceptor }],
})
class AppModule {}
async function bootstrap() {
  assertProductionConfiguration();
  await prisma.$connect();
  await startDriverEventNotifier();
  await hydrateAdminSecurityState();
  await ensurePricingDefaults();
  await ensureMembershipPlanDefaults();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useBodyParser("json", { limit: "2mb" });
  const notificationWebSocketServer = startNotificationWebSocketServer(
    app.getHttpServer(),
  );
  const configuredOrigins = [
    process.env.APP_CORS_ORIGINS,
    process.env.ADMIN_CORS_ORIGIN,
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);
  const developmentOrigins =
    process.env.NODE_ENV === "production"
      ? []
      : [
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          "http://localhost:5174",
          "http://127.0.0.1:5174",
          "http://localhost:5181",
          "http://127.0.0.1:5181",
          "http://localhost:8080",
          "http://127.0.0.1:8080",
          "http://localhost:8081",
          "http://127.0.0.1:8081",
          "http://localhost:8082",
          "http://127.0.0.1:8082",
          "http://localhost:8085",
          "http://127.0.0.1:8085",
          "http://localhost:8090",
          "http://127.0.0.1:8090",
          "http://localhost:8091",
          "http://127.0.0.1:8091",
          "http://localhost:9099",
          "http://127.0.0.1:9099",
        ];
  const allowedOrigins = new Set([...configuredOrigins, ...developmentOrigins]);
  app.enableCors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.has(origin)),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
  });
  app.enableShutdownHooks();
  const shutdown = async () => {
    notificationWebSocketServer.close();
    await stopDriverEventNotifier();
    await prisma.$disconnect();
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());
  await app.listen(
    Number(process.env.PORT) || 3010,
    process.env.API_HOST || "0.0.0.0",
  );
}
bootstrap();
