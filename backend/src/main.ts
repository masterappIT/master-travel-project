import { NestFactory } from '@nestjs/core'
import { Body, CallHandler, Controller, Delete, ExecutionContext, ForbiddenException, Get, HttpException, HttpStatus, Injectable, Module, NestInterceptor, Param, Patch, Post, Req, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { NestExpressApplication } from '@nestjs/platform-express'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { Observable, tap } from 'rxjs'
import { loadEnvFile } from 'node:process'
import { Prisma, PrismaClient, PromotionKind, DiscountType, PromotionStackingMode } from '@prisma/client'

try {
  loadEnvFile('../.env')
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    try { loadEnvFile() } catch (fallbackError) {
      if ((fallbackError as NodeJS.ErrnoException).code !== 'ENOENT') throw fallbackError
    }
  } else throw error
}

type RequestLike = { headers: { authorization?: string; ['user-agent']?: string; host?: string; ['x-forwarded-proto']?: string }; query?: Record<string, string | undefined>; method?: string; url?: string; ip?: string; protocol?: string }
type AdminRole = 'SUPER_ADMIN' | 'OPERATOR' | 'VIEWER'
interface Administrator { id: string; username: string; displayName: string; role: AdminRole; enabled: boolean; passwordHash: string; createdAt: string; updatedAt: string; lastLoginAt: string | null }
interface AdminSession { sub: string; role: AdminRole; exp: number; jti: string }
interface AdminAuditLog { id: string; administratorId: string | null; username: string; action: string; resource: string; method: string; status: 'SUCCESS' | 'FAILED'; ip: string; createdAt: string }
type MasterBoxConversation = { id: string; messages?: MasterBoxMessage[] }
type MasterBoxMessage = { id: string; direction: string; content: unknown; createdAt: string }
type SupportSession = { conversationId: string; riderId: string; exp: number }
type ClientSession = { sub: string; exp: number; jti: string }
type DriverSessionToken = { sub: string; exp: number; jti: string }
type PhoneChallenge = { countryCode: string; phoneNumber: string; code: string; exp: number; attempts: number }
type ClientPhoneChangeChallenge = PhoneChallenge & { userId: string }

type User = { id: string; countryCode: string; phoneNumber: string; name: string | null; cashBalance: number; fareBalance: number; createdAt: string; lastLoginAt: string | null; lastLogoutAt: string | null }
interface Trip { id: string; userId: string; origin: string; destination: string; region: string; scheduledAt: string; status: string; createdAt: string }
type AddressRegion = '大陸' | '香港' | '澳門'
interface RecommendedAddress { id: string; region: AddressRegion; city: string | null; name: string; address: string; latitude: number | null; longitude: number | null; enabled: boolean; order: number }
interface MainlandCity { id: string; name: string; enabled: boolean; order: number }
interface CharterOrder { id: string; userId: string; originRegion: string; origin: string; destinationRegion: string; destination: string; scheduledAt: string; durationHours: number; status: string; createdAt: string }
interface FlightAirport { iata: string; name: string; city: string; latitude: number | null; longitude: number | null }
interface FlightLookupResult { flightNumber: string; direction: 'arrival' | 'departure'; status: string; scheduledTime: string; origin: FlightAirport; destination: FlightAirport }
interface VehicleCategory { id: string; name: string; tabLabel: string; order: number; enabled: boolean }
interface VehicleCatalogItem { id: string; categoryId: string | null; brand: string; model: string; series: string; seats: number; image: string; colorLabel: string; modelChoiceLabel: string; enabled: boolean; order: number }
type VehicleExtraTriggerType = 'NONE' | 'IMMEDIATE' | 'NIGHT' | 'WEATHER'
interface VehicleExtraOption { id: string; name: string; label: string; price: number; currency: string; enabled: boolean; order: number; requiredForImmediate: boolean; requiredWithinMinutes: number | null; triggerType: string; triggerEnabled: boolean; nightStartTime: string | null; nightEndTime: string | null }
interface DistancePricingTier { id: string; fromKm: number; toKm: number | null; pricePerKm: number; order: number }
interface DistancePricingSettings { categoryId: string; minimumFare: number; currency: string; tiers: DistancePricingTier[] }
interface RouteMinimumFareSettings { id: string; originRegion: string; originCity: string | null; destinationRegion: string; destinationCity: string | null; categoryId: string | null; minimumFare: number; currency: string; enabled: boolean }
interface QuoteExtraRequest { id?: unknown; quantity?: unknown }
interface CreateQuoteRequest { categoryId?: unknown; vehicleId?: unknown; distanceMeters?: unknown; durationSeconds?: unknown; extraIds?: unknown; extras?: unknown; displayCurrency?: unknown; currency?: unknown; couponCode?: unknown; userId?: unknown; membershipLevel?: unknown; originRegion?: unknown; originCity?: unknown; destinationRegion?: unknown; destinationCity?: unknown; scheduledAt?: unknown }
interface QuoteExtraSelection { id: string; quantity: number }
interface PromotionInput { id?: unknown; name?: unknown; kind?: unknown; discountType?: unknown; stackingMode?: unknown; discountValue?: unknown; currency?: unknown; minimumSpend?: unknown; maximumDiscount?: unknown; priority?: unknown; startsAt?: unknown; endsAt?: unknown; enabled?: unknown; couponCode?: unknown; usageLimit?: unknown; membershipLevel?: unknown; originRegion?: unknown; originCity?: unknown; destinationRegion?: unknown; destinationCity?: unknown; weekdays?: unknown; timeStart?: unknown; timeEnd?: unknown }
interface MembershipPlan { id: string; level: string; name: string; monthly: number; yearly: number; recommended: boolean; benefits: string[]; enabled: boolean; order: number }
const prisma = new PrismaClient()
const appSettingsDefaults = {
  id: 'default',
  language: '繁體中文',
  region: '香港',
  currency: 'HKD',
  pricingCurrency: 'RMB',
  exchangeRate: 0.92,
  adminLogo: null as string | null,
  severeWeatherEnabled: false,
  driverRaceEnabled: false,
  fareBalancePayEnabled: true,
  cashBalancePayEnabled: true,
  wechatPayEnabled: true,
  alipayPayEnabled: true,
  bankCardPayEnabled: true,
  sandboxMode: false
}
const currencyLabels = { RMB: 'RMB', HKD: 'HKD' } as const
const configuredCurrencyLabel = (settings: { pricingCurrency: string }) => currencyLabels[settings.pricingCurrency as keyof typeof currencyLabels] || currencyLabels.RMB
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const normalizeRuleText = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const normalizeWeekdays = (value: unknown) => Array.isArray(value) ? value.map(Number).filter(day => Number.isInteger(day) && day >= 1 && day <= 7) : []
const timeToMinutes = (value: string | null | undefined) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null
}
const normalizeTriggerType = (value: unknown, legacyImmediate = false): VehicleExtraTriggerType => {
  if (value === 'IMMEDIATE' || value === 'NIGHT' || value === 'WEATHER') return value
  return legacyImmediate ? 'IMMEDIATE' : 'NONE'
}
const hongKongMinutes = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(value)
  const hour = Number(parts.find(part => part.type === 'hour')?.value)
  const minute = Number(parts.find(part => part.type === 'minute')?.value)
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null
}
const extraTriggerMatches = (
  extra: Pick<VehicleExtraOption, 'triggerType' | 'triggerEnabled' | 'requiredForImmediate' | 'requiredWithinMinutes' | 'nightStartTime' | 'nightEndTime'>,
  scheduledAt: Date,
  now: Date,
  severeWeatherEnabled: boolean
) => {
  const triggerType = normalizeTriggerType(extra.triggerType, extra.requiredForImmediate)
  if (!extra.triggerEnabled) return false
  if (triggerType === 'IMMEDIATE') {
    const window = extra.requiredWithinMinutes
    if (window === null) return false
    const minutesUntilDeparture = (scheduledAt.getTime() - now.getTime()) / 60000
    return minutesUntilDeparture <= window
  }
  if (triggerType === 'WEATHER') return severeWeatherEnabled
  if (triggerType !== 'NIGHT') return false
  const start = timeToMinutes(extra.nightStartTime)
  const end = timeToMinutes(extra.nightEndTime)
  const current = hongKongMinutes(scheduledAt)
  if (start === null || end === null || current === null) return false
  return start <= end ? current >= start && current <= end : current >= start || current <= end
}
const promotionMatchesContext = (
  promotion: {
    originRegion: string | null
    originCity: string | null
    destinationRegion: string | null
    destinationCity: string | null
    weekdays: unknown
    timeStart: string | null
    timeEnd: string | null
  },
  context: { originRegion: string; originCity: string; destinationRegion: string; destinationCity: string; scheduledAt: Date }
) => {
  if (promotion.originRegion && promotion.originRegion !== context.originRegion) return false
  if (promotion.originCity && promotion.originCity !== context.originCity) return false
  if (promotion.destinationRegion && promotion.destinationRegion !== context.destinationRegion) return false
  if (promotion.destinationCity && promotion.destinationCity !== context.destinationCity) return false
  const weekdays = normalizeWeekdays(promotion.weekdays)
  if (weekdays.length && !weekdays.includes(context.scheduledAt.getDay() || 7)) return false
  const start = timeToMinutes(promotion.timeStart)
  const end = timeToMinutes(promotion.timeEnd)
  if (start !== null && end !== null) {
    const current = context.scheduledAt.getHours() * 60 + context.scheduledAt.getMinutes()
    const inRange = start <= end ? current >= start && current <= end : current >= start || current <= end
    if (!inRange) return false
  }
  return true
}
const membershipPlans: MembershipPlan[] = [
  { id: 'silver', level: 'SILVER', name: '銀卡會員', monthly: 68, yearly: 688, recommended: false, benefits: ['每月 2 張乘車券', '優先客服通道', '免費等候 10 分鐘'], enabled: true, order: 1 },
  { id: 'black', level: 'BLACK GOLD', name: '黑金會員', monthly: 128, yearly: 1288, recommended: true, benefits: ['每月 4 張乘車券', '專屬行程管家', '免費等候 20 分鐘'], enabled: true, order: 2 },
  { id: 'diamond', level: 'DIAMOND', name: '鑽石會員', monthly: 228, yearly: 2288, recommended: false, benefits: ['專屬車型升級', '機場快速接送', '全年專屬客服'], enabled: true, order: 3 },
]
const generateUserId = async () => {
  while (true) {
    const id = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0')
    if (!(await prisma.user.findUnique({ where: { id }, select: { id: true } }))) return id
  }
}
const users: User[] = [
  { id: '483271', countryCode: '+852', phoneNumber: '55550101', name: 'Demo Rider', cashBalance: 120, fareBalance: 80, createdAt: '2026-08-22T09:30:00.000Z', lastLoginAt: null, lastLogoutAt: null },
  { id: '719604', countryCode: '+86', phoneNumber: '13800000202', name: 'Alex Chen', cashBalance: 0, fareBalance: 200, createdAt: '2026-08-27T14:10:00.000Z', lastLoginAt: null, lastLogoutAt: null },
]
const phoneChallenges = new Map<string, PhoneChallenge>()
const clientPhoneChangeChallenges = new Map<string, ClientPhoneChangeChallenge>()
const phoneChallengeRequests = new Map<string, { count: number; windowStartedAt: number }>()
const PHONE_CODE_TTL_MS = 5 * 60 * 1000
const PHONE_CODE_MAX_ATTEMPTS = 5
const PHONE_CODE_REQUEST_WINDOW_MS = 15 * 60 * 1000
const PHONE_CODE_MAX_REQUESTS = 3
const trips: Trip[] = [
  { id: 'trip_demo_001', userId: '483271', origin: 'Hong Kong Airport', destination: 'Shenzhen Bay Port', region: 'GUANGDONG', scheduledAt: '2026-09-02T10:00:00.000Z', status: 'CONFIRMED', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'trip_demo_002', userId: '719604', origin: 'Macau Ferry Terminal', destination: 'Zhuhai Gongbei', region: 'MACAU', scheduledAt: '2026-09-03T03:30:00.000Z', status: 'PENDING', createdAt: '2026-09-01T11:00:00.000Z' },
]
const charterOrders: CharterOrder[] = [
  { id: 'charter_demo_001', userId: '483271', originRegion: '香港', origin: '離島區 · 香港國際機場', destinationRegion: '澳門', destination: '嘉模堂區 · 偉龍馬路', scheduledAt: '2026-09-05T01:00:00.000Z', durationHours: 4, status: 'PENDING', createdAt: '2026-09-03T02:00:00.000Z' },
]
const vehicleCategoryDefaults: VehicleCategory[] = [
  { id: 'standard-mpv', name: '普通跨境商務車', tabLabel: '普通MPV', order: 1, enabled: true },
  { id: 'premium-mpv', name: '高級跨境商務車', tabLabel: '高級MPV', order: 2, enabled: true },
  { id: 'standard-car', name: '普通跨境轎車', tabLabel: '普通轎車', order: 3, enabled: true },
  { id: 'premium-car', name: '頂級跨境轎車', tabLabel: '頂級轎車', order: 4, enabled: true },
]
const vehicleExtraDefaults: VehicleExtraOption[] = [
  { id: 'instant-order', name: 'instant-order', label: '即時訂單', price: 0, currency: 'RMB', enabled: true, order: 0, requiredForImmediate: true, requiredWithinMinutes: 60, triggerType: 'IMMEDIATE', triggerEnabled: true, nightStartTime: null, nightEndTime: null },
  { id: 'night-surcharge', name: 'night-surcharge', label: '深夜加班費', price: 100, currency: 'RMB', enabled: true, order: 1, requiredForImmediate: false, requiredWithinMinutes: null, triggerType: 'NIGHT', triggerEnabled: true, nightStartTime: '22:00', nightEndTime: '06:00' },
  { id: 'severe-weather', name: 'severe-weather', label: '惡劣天氣費', price: 100, currency: 'RMB', enabled: true, order: 2, requiredForImmediate: false, requiredWithinMinutes: null, triggerType: 'WEATHER', triggerEnabled: true, nightStartTime: null, nightEndTime: null },
  { id: 'child-seat', name: 'child-seat', label: '兒童安全座椅', price: 50, currency: 'RMB', enabled: true, order: 3, requiredForImmediate: false, requiredWithinMinutes: null, triggerType: 'NONE', triggerEnabled: true, nightStartTime: null, nightEndTime: null },
  { id: 'additional-stop', name: 'additional-stop', label: '額外停靠點', price: 100, currency: 'RMB', enabled: true, order: 4, requiredForImmediate: false, requiredWithinMinutes: null, triggerType: 'NONE', triggerEnabled: true, nightStartTime: null, nightEndTime: null },
]
const defaultDistancePricing = (categoryId: string): DistancePricingSettings => ({
  categoryId,
  minimumFare: 800,
  currency: 'RMB',
  tiers: [
    { id: `${categoryId}-tier-0-20`, fromKm: 0, toKm: 20, pricePerKm: 40, order: 1 },
    { id: `${categoryId}-tier-20-120`, fromKm: 20, toKm: 120, pricePerKm: 15, order: 2 },
    { id: `${categoryId}-tier-120-plus`, fromKm: 120, toKm: null, pricePerKm: 12, order: 3 },
  ],
})
const vehicleDefaults: VehicleCatalogItem[] = [
  { id: 'standard-mpv', categoryId: 'standard-mpv', brand: '', model: '跨境商務車', series: '', seats: 6, image: '/static/vehicles/alphard.png', colorLabel: '不限顏色', modelChoiceLabel: '不限車款', enabled: true, order: 1 },
  { id: 'premium-vellfire', categoryId: 'premium-mpv', brand: 'Toyota', model: 'Vellfire', series: '20系', seats: 7, image: '/static/vehicles/vellfire.png', colorLabel: '不限顏色', modelChoiceLabel: '', enabled: true, order: 1 },
  { id: 'premium-alphard', categoryId: 'premium-mpv', brand: 'Toyota', model: 'Alphard', series: '30系', seats: 6, image: '/static/vehicles/alphard.png', colorLabel: '不限顏色', modelChoiceLabel: '', enabled: true, order: 2 },
  { id: 'tesla-s', categoryId: 'standard-car', brand: 'Tesla', model: 'Model', series: 'S', seats: 5, image: '/static/vehicles/tesla-s.png', colorLabel: '不限顏色', modelChoiceLabel: '', enabled: true, order: 1 },
]
const recommendedAddressDefaults: RecommendedAddress[] = ([
  ['hk-airport', '香港', null, '香港國際機場', '香港特別行政區-離島區-香港赤臘角天路1號'],
  ['hk-disney', '香港', null, '香港迪士尼樂園', '香港特別行政區-荃灣區-大嶼山竹篙灣'],
  ['sz-airport', '大陸', '深圳市', '深圳寶安國際機場', '深圳市-寶安區-寶安大道'],
  ['sz-bay', '大陸', '深圳市', '深圳灣口岸', '深圳市-南山區-東濱路'],
  ['macau-airport', '澳門', null, '澳門國際機場', '澳門特別行政區-嘉模堂區-偉龍馬路'],
  ['macau-ruins', '澳門', null, '澳門大三巴牌坊', '澳門特別行政區-花王堂區-炮台山下'],
] as Array<[string, AddressRegion, string | null, string, string]>).map(([id, region, city, name, address], index) => ({ id, region, city: region === '大陸' ? city : null, name, address, latitude: null, longitude: null, enabled: true, order: index + 1 }))
async function ensurePricingDefaults() {
  await prisma.$transaction(async tx => {
    await tx.appSetting.upsert({
      where: { id: appSettingsDefaults.id },
      create: appSettingsDefaults,
      update: {}
    })
    const appSettings = await tx.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    for (const category of vehicleCategoryDefaults) {
      await tx.vehicleCategory.upsert({ where: { id: category.id }, create: category, update: {} })
      const pricing = { ...defaultDistancePricing(category.id), currency: configuredCurrencyLabel(appSettings) }
      await tx.categoryDistancePricing.upsert({
        where: { categoryId: category.id },
        create: {
          categoryId: category.id,
          minimumFare: pricing.minimumFare,
          currency: pricing.currency,
          tiers: { create: pricing.tiers }
        },
        update: {}
      })
    }
    for (const vehicle of vehicleDefaults) {
      await tx.vehicle.upsert({ where: { id: vehicle.id }, create: vehicle, update: {} })
    }
    for (const extra of vehicleExtraDefaults) {
      await tx.vehicleExtra.upsert({ where: { id: extra.id }, create: extra, update: {} })
    }
    if ((await tx.recommendedAddress.count()) === 0) {
      for (const address of recommendedAddressDefaults) {
        await tx.recommendedAddress.upsert({ where: { id: address.id }, create: address, update: {} })
      }
    }
    for (const user of users) {
      await tx.user.upsert({
        where: { countryCode_phoneNumber: { countryCode: user.countryCode, phoneNumber: user.phoneNumber } },
        create: { ...user, createdAt: new Date(user.createdAt) },
        update: {}
      })
    }
  })
}
function appSettingsResponse(settings: typeof appSettingsDefaults) {
  return {
    language: settings.language,
    region: settings.region,
    currency: settings.currency,
    pricingCurrency: settings.pricingCurrency,
    exchangeRate: settings.exchangeRate,
    adminLogo: settings.adminLogo,
    severeWeatherEnabled: settings.severeWeatherEnabled,
    driverRaceEnabled: settings.driverRaceEnabled ?? false,
    fareBalancePayEnabled: settings.fareBalancePayEnabled ?? true,
    cashBalancePayEnabled: settings.cashBalancePayEnabled ?? true,
    wechatPayEnabled: settings.wechatPayEnabled ?? true,
    alipayPayEnabled: settings.alipayPayEnabled ?? true,
    bankCardPayEnabled: settings.bankCardPayEnabled ?? true,
    sandboxMode: settings.sandboxMode ?? false
  }
}
function validateAdminLogo(value: string) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value)
  if (!match) throw new HttpException('Logo must be a PNG, JPEG, or WebP image', HttpStatus.BAD_REQUEST)
  const image = Buffer.from(match[2], 'base64')
  if (!image.length || image.length > 1024 * 1024) throw new HttpException('Logo file must not exceed 1 MB', HttpStatus.BAD_REQUEST)
  const mime = match[1]
  let dimensions: [number, number] | null = null
  if (mime === 'image/png' && image.length >= 24 && image.subarray(1, 4).toString() === 'PNG') dimensions = [image.readUInt32BE(16), image.readUInt32BE(20)]
  if (mime === 'image/jpeg' && image[0] === 0xff && image[1] === 0xd8) {
    for (let offset = 2; offset + 8 < image.length;) { if (image[offset] !== 0xff) { offset++; continue } const marker = image[offset + 1]; const length = image.readUInt16BE(offset + 2); if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) { dimensions = [image.readUInt16BE(offset + 7), image.readUInt16BE(offset + 5)]; break } if (length < 2) break; offset += 2 + length }
  }
  if (mime === 'image/webp' && image.length >= 30 && image.subarray(0, 4).toString() === 'RIFF' && image.subarray(8, 12).toString() === 'WEBP') {
    const kind = image.subarray(12, 16).toString()
    if (kind === 'VP8X') dimensions = [1 + image.readUIntLE(24, 3), 1 + image.readUIntLE(27, 3)]
    if (kind === 'VP8 ' && image[23] === 0x9d && image[24] === 0x01 && image[25] === 0x2a) dimensions = [image.readUInt16LE(26) & 0x3fff, image.readUInt16LE(28) & 0x3fff]
    if (kind === 'VP8L' && image[20] === 0x2f) { const bits = image.readUInt32LE(21); dimensions = [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1] }
  }
  if (!dimensions) throw new HttpException('Invalid or unsupported logo image', HttpStatus.BAD_REQUEST)
  return value
}
function vehicleCategoryResponse(category: VehicleCategory) {
  return { id: category.id, name: category.name, tabLabel: category.tabLabel, order: category.order, enabled: category.enabled }
}
function vehicleResponse(vehicle: VehicleCatalogItem) {
  return { id: vehicle.id, categoryId: vehicle.categoryId, brand: vehicle.brand, model: vehicle.model, series: vehicle.series, seats: vehicle.seats, image: vehicle.image, colorLabel: vehicle.colorLabel, modelChoiceLabel: vehicle.modelChoiceLabel, enabled: vehicle.enabled, order: vehicle.order }
}
function vehicleExtraResponse(extra: VehicleExtraOption) {
  return { id: extra.id, name: extra.name, label: extra.label, price: extra.price, currency: extra.currency, enabled: extra.enabled, order: extra.order, requiredForImmediate: extra.requiredForImmediate, requiredWithinMinutes: extra.requiredWithinMinutes, triggerType: extra.triggerType, triggerEnabled: extra.triggerEnabled, nightStartTime: extra.nightStartTime, nightEndTime: extra.nightEndTime }
}
function pricingResponse(pricing: DistancePricingSettings) {
  return {
    categoryId: pricing.categoryId,
    minimumFare: pricing.minimumFare,
    currency: pricing.currency,
    tiers: pricing.tiers.map(tier => ({ id: tier.id, fromKm: tier.fromKm, toKm: tier.toKm, pricePerKm: tier.pricePerKm, order: tier.order }))
  }
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
    enabled: item.enabled
  }
}
function parseRouteMinimumFare(body: Partial<RouteMinimumFareSettings>) {
  const originRegion = body.originRegion?.trim()
  const destinationRegion = body.destinationRegion?.trim()
  const originCity = body.originCity?.trim() || null
  const destinationCity = body.destinationCity?.trim() || null
  const minimumFare = Number(body.minimumFare)
  const currency = body.currency?.trim()
  if (!originRegion || !destinationRegion || !Number.isFinite(minimumFare) || minimumFare < 0 || !currency || !currencyCode(currency)) {
    throw new HttpException('Valid route minimum fare fields are required', HttpStatus.BAD_REQUEST)
  }
  return { originRegion, originCity, destinationRegion, destinationCity, categoryId: body.categoryId?.trim() || null, minimumFare, currency, enabled: body.enabled ?? true }
}
function validVehicleCategory(body: Partial<VehicleCategory>) { return body.id && body.name?.trim() && body.tabLabel?.trim() }
type ManagedUser = { id: string; countryCode: string; phoneNumber: string; name: string | null; displayName: string | null; avatarUrl: string | null; email: string | null; passwordHash: string | null; gender: string | null; region: string | null; birthday: Date | null; cashBalance: number; fareBalance: number; membershipLevel: string | null; enabled: boolean; createdAt: Date; lastLoginAt: Date | null; lastLogoutAt: Date | null; authIdentities?: Array<{ provider: string }>; verificationCodes?: Array<{ id: string; purpose: string; status: string; attempts: number; expiresAt: Date; consumedAt: Date | null; createdAt: Date }> }
function loginMethods(user: ManagedUser) {
  const methods = ['SMS 驗證碼']
  if (user.passwordHash) methods.push('密碼')
  for (const identity of user.authIdentities || []) if (identity.provider === 'wechat') methods.push('WeChat')
  for (const identity of user.authIdentities || []) if (identity.provider === 'apple') methods.push('Apple')
  return [...new Set(methods)]
}
function userResponse(user: ManagedUser) {
  return {
    id: user.id,
    countryCode: user.countryCode,
    phoneNumber: user.phoneNumber,
    phone: `${user.countryCode} ${user.phoneNumber}`,
    name: user.name,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
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
    verificationCodeCount: user.verificationCodes?.length || 0
  }
}
function clientSecurityResponse(user: ManagedUser & { authIdentities?: Array<{ provider: string }> }) {
  return { countryCode: user.countryCode, phoneNumber: user.phoneNumber, email: user.email, passwordSet: !!user.passwordHash, linkedProviders: (user.authIdentities || []).map(identity => identity.provider).filter((provider): provider is 'apple' | 'wechat' => provider === 'apple' || provider === 'wechat') }
}
function parsePhoneIdentity(body: { countryCode?: string; phoneNumber?: string }) {
  const countryCode = body.countryCode?.trim() || ''
  const phoneNumber = body.phoneNumber?.replace(/[\s-]/g, '') || ''
  const expectedLength = countryCode === '+852' || countryCode === '+853' ? 8 : countryCode === '+86' ? 11 : null
  const validLength = expectedLength ? phoneNumber.length === expectedLength : phoneNumber.length >= 4 && phoneNumber.length <= 15
  if (!/^\+\d{1,4}$/.test(countryCode) || !/^\d+$/.test(phoneNumber) || !validLength) {
    throw new HttpException(expectedLength ? `Phone number must contain ${expectedLength} digits for ${countryCode}` : 'A valid country code and phone number are required', HttpStatus.BAD_REQUEST)
  }
  return { countryCode, phoneNumber }
}
function validateCommonPassenger(body: { name?: string; phone?: string; phoneRegion?: string; gender?: string; documentType?: string; passportCountry?: string; isDefault?: boolean }, fallback?: { name: string; phone: string; phoneRegion: string; gender: string; documentType: string; passportCountry: string | null; isDefault: boolean }) {
  const value = {
    name: body.name?.trim() ?? fallback?.name ?? '', phone: body.phone?.trim() ?? fallback?.phone ?? '', phoneRegion: body.phoneRegion?.trim() ?? fallback?.phoneRegion ?? '+852', gender: body.gender?.trim() ?? fallback?.gender ?? '先生', documentType: body.documentType?.trim() ?? fallback?.documentType ?? '港澳通行證', passportCountry: body.passportCountry?.trim() || fallback?.passportCountry || null, isDefault: body.isDefault ?? fallback?.isDefault ?? false
  }
  if (!value.name || value.name.length > 100 || !value.phone || !/^[0-9\s-]{4,30}$/.test(value.phone) || !['先生', '女士'].includes(value.gender) || !['港澳通行證', '香港身分證', '澳門身分證', '護照'].includes(value.documentType) || value.documentType === '護照' && !value.passportCountry) throw new HttpException('Invalid common passenger fields', HttpStatus.BAD_REQUEST)
  return value
}
function parseProfileEmail(value?: string) {
  const email = value?.trim() || null
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new HttpException('A valid email is required', HttpStatus.BAD_REQUEST)
  return email
}
function parseBirthday(value?: string) {
  if (!value) return null
  const birthday = new Date(value)
  if (Number.isNaN(birthday.getTime())) throw new HttpException('A valid birthday is required', HttpStatus.BAD_REQUEST)
  return birthday
}
function clientSecret() {
  const value = process.env.CLIENT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET
  if (value) return value
  if (process.env.NODE_ENV !== 'production') return 'development-client-secret'
  throw new HttpException('Client session secret is not configured', HttpStatus.SERVICE_UNAVAILABLE)
}
function clientTokenFor(session: ClientSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${createHmac('sha256', clientSecret()).update(payload).digest('base64url')}`
}
function driverSecret() {
  const value = process.env.DRIVER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET
  if (value) return value
  if (process.env.NODE_ENV !== 'production') return 'development-driver-secret'
  throw new HttpException('Driver session secret is not configured', HttpStatus.SERVICE_UNAVAILABLE)
}
function driverTokenFor(session: DriverSessionToken) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${createHmac('sha256', driverSecret()).update(payload).digest('base64url')}`
}
function orderUrlTokenHash(token: string) { return createHash('sha256').update(token).digest('hex') }
function orderUrlValue(token: string) { return `${process.env.DRIVER_ORDER_URL_BASE || '/driver/order'}?token=${encodeURIComponent(token)}` }
async function driverAuthResponse(driver: any) {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000
  const session: DriverSessionToken = { sub: driver.id, exp, jti: randomBytes(16).toString('hex') }
  await prisma.driverSession.create({ data: { jti: session.jti, driverId: driver.id, expiresAt: new Date(exp) } })
  return { token: driverTokenFor(session), expiresAt: new Date(exp).toISOString(), driver: driverResponse(driver) }
}
async function driverSessionFrom(req: RequestLike): Promise<DriverSessionToken> {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const [payload, signature] = value?.split('.') || []
  if (!payload || !signature) throw new UnauthorizedException('Valid driver session required')
  const expected = createHmac('sha256', driverSecret()).update(payload).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('signature mismatch')
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as DriverSessionToken
    if (!session.sub || !session.jti || session.exp <= Date.now()) throw new Error('invalid session')
    const stored = await prisma.driverSession.findUnique({ where: { jti: session.jti }, include: { driver: true } })
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now() || stored.driverId !== session.sub) throw new Error('revoked session')
    return session
  } catch {
    throw new UnauthorizedException('Valid driver session required')
  }
}
function requireReviewedDriver(driver: { reviewStatus: string }) {
  if (!['已完成審核', '已審核', '已通過'].includes(driver.reviewStatus)) throw new ForbiddenException('Driver review is required before direct order acceptance')
}
async function clientAuthResponse(user: ManagedUser) {
  if (!user.enabled) throw new ForbiddenException('User account is disabled')
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000
  const session: ClientSession = { sub: user.id, exp, jti: randomBytes(16).toString('hex') }
  await prisma.clientSession.create({ data: { jti: session.jti, userId: user.id, expiresAt: new Date(exp) } })
  return { token: clientTokenFor(session), expiresAt: new Date(exp).toISOString(), user: userResponse(user) }
}
async function clientSessionFrom(req: RequestLike): Promise<ClientSession> {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const [payload, signature] = value?.split('.') || []
  if (!payload || !signature) throw new UnauthorizedException('Valid client session required')
  const expected = createHmac('sha256', clientSecret()).update(payload).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('signature mismatch')
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as ClientSession
    if (!session.sub || !session.jti || session.exp <= Date.now()) throw new Error('invalid session')
    const stored = await prisma.clientSession.findUnique({ where: { jti: session.jti }, include: { user: { select: { enabled: true } } } })
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now() || stored.userId !== session.sub || !stored.user.enabled) throw new Error('revoked session')
    return session
  } catch {
    throw new UnauthorizedException('Valid client session required')
  }
}
function calculateDistanceFare(distanceKm: number, pricing: DistancePricingSettings) {
  const subtotal = [...pricing.tiers]
    .sort((a, b) => a.order - b.order)
    .reduce((total, tier) => {
      const upperBound = tier.toKm === null ? distanceKm : Math.min(distanceKm, tier.toKm)
      return total + Math.max(0, upperBound - tier.fromKm) * tier.pricePerKm
    }, 0)
  return Math.max(pricing.minimumFare, subtotal)
}
function currencyCode(currency: string) {
  if (currency === 'RMB' || currency === 'RMB¥' || currency === 'CNY' || currency === currencyLabels.RMB) return 'RMB'
  if (currency === 'HKD' || currency === 'HKD$' || currency === currencyLabels.HKD) return 'HKD'
  return null
}
function displayCurrency(value: unknown, fallback: string) {
  if (value !== undefined && typeof value !== 'string') throw new HttpException('Currency must be RMB or HKD', HttpStatus.BAD_REQUEST)
  const code = currencyCode(typeof value === 'string' ? value.trim() : fallback)
  if (!code) throw new HttpException('Currency must be RMB or HKD', HttpStatus.BAD_REQUEST)
  return code
}
function convertCurrency(amount: number, sourceCurrency: string, targetCurrency: 'RMB' | 'HKD', exchangeRate: number) {
  const source = currencyCode(sourceCurrency)
  if (!source) throw new HttpException('Pricing currency must be RMB or HKD', HttpStatus.BAD_REQUEST)
  if (source === targetCurrency) return roundMoney(amount)
  return roundMoney(source === 'RMB' ? amount / exchangeRate : amount * exchangeRate)
}
function parseQuoteExtras(body: CreateQuoteRequest): QuoteExtraSelection[] {
  const source = body.extras === undefined ? body.extraIds : body.extras
  if (source === undefined) return []
  if (!Array.isArray(source)) throw new HttpException('Extras must be an array', HttpStatus.BAD_REQUEST)
  const selections = new Map<string, number>()
  for (const item of source) {
    const option = typeof item === 'string' ? { id: item, quantity: 1 } : item as QuoteExtraRequest
    const id = typeof option?.id === 'string' ? option.id.trim() : ''
    const quantity = option?.quantity === undefined ? 1 : Number(option.quantity)
    if (!id || !Number.isInteger(quantity) || quantity <= 0) throw new HttpException('Quote extras must have valid ids and quantities', HttpStatus.BAD_REQUEST)
    selections.set(id, (selections.get(id) || 0) + quantity)
  }
  return [...selections].map(([id, quantity]) => ({ id, quantity }))
}
function quoteDistanceLines(distanceKm: number, pricing: DistancePricingSettings) {
  const tierLines = [...pricing.tiers]
    .sort((a, b) => a.order - b.order)
    .flatMap(tier => {
      const upperBound = tier.toKm === null ? distanceKm : Math.min(distanceKm, tier.toKm)
      const quantity = Math.max(0, upperBound - tier.fromKm)
      return quantity > 0 ? [{ type: 'DISTANCE_TIER' as const, sourceId: tier.id, label: `距離費用 ${tier.fromKm}–${tier.toKm ?? '以上'} 公里`, quantity, unitAmount: tier.pricePerKm, totalAmount: quantity * tier.pricePerKm }] : []
    })
  const tierSubtotal = tierLines.reduce((total, line) => total + line.totalAmount, 0)
  if (tierSubtotal <= pricing.minimumFare) {
    return [{ type: 'MINIMUM_FARE' as const, sourceId: null, label: '最低車資', quantity: 1, unitAmount: pricing.minimumFare, totalAmount: pricing.minimumFare }]
  }

  return tierLines
}
function routeMinimumFareLine(routeMinimumFare: RouteMinimumFareSettings | null, distanceFare: number, exchangeRate: number) {
  if (!routeMinimumFare) return []
  const minimumFare = convertCurrency(routeMinimumFare.minimumFare, routeMinimumFare.currency, 'RMB', exchangeRate)
  if (minimumFare <= distanceFare) return []
  return [{ type: 'ADJUSTMENT' as const, sourceId: routeMinimumFare.id, label: '路線最低車資', quantity: 1, unitAmount: minimumFare, totalAmount: minimumFare - distanceFare }]
}
function quoteExpiryDate() {
  const configuredMinutes = Number(process.env.QUOTE_TTL_MINUTES)
  const minutes = Number.isInteger(configuredMinutes) && configuredMinutes > 0 && configuredMinutes <= 24 * 60 ? configuredMinutes : 15
  return new Date(Date.now() + minutes * 60 * 1000)
}
type PersistedQuote = {
  id: string
  distanceKm: number
  durationSeconds: number | null
  currency: string
  subtotal: number
  total: number
  expiresAt: Date | null
  createdAt: Date
  pricing: {
    categoryId: string
    categoryName: string
    tabLabel: string
    minimumFare: number
    currency: string
    tiers: Array<{ sourceTierId: string; fromKm: number; toKm: number | null; pricePerKm: number; order: number }>
  } | null
  vehicle: {
    vehicleId: string
    categoryId: string | null
    brand: string
    model: string
    series: string
    seats: number
    image: string
    colorLabel: string
    modelChoiceLabel: string
  } | null
  lines: Array<{ type: string; sourceId: string | null; label: string; quantity: number; unitAmount: number; totalAmount: number; currency: string; order: number }>
  promotionUsages?: Array<{
   id: string
   promotionId: string
    status: string
    createdAt: Date
    usedAt: Date | null
    releasedAt: Date | null
    promotion: {
      id: string
      name: string
      kind: string
      discountType: string
      discountValue: number
      currency: string
      minimumSpend: number
      maximumDiscount: number | null
      couponCode: string | null
    }
  }>
}
function quoteResponse(quote: PersistedQuote) {
  const discountLines = quote.lines.filter(line => line.type === 'DISCOUNT' && line.totalAmount < 0)
  return {
    id: quote.id,
    distanceMeters: quote.distanceKm * 1000,
    distanceKm: quote.distanceKm,
    durationSeconds: quote.durationSeconds || 0,
    currency: quote.currency,
    subtotal: quote.subtotal,
    total: quote.total,
    createdAt: quote.createdAt.toISOString(),
    expiresAt: quote.expiresAt?.toISOString() || null,
    pricing: quote.pricing && {
      categoryId: quote.pricing.categoryId,
      categoryName: quote.pricing.categoryName,
      tabLabel: quote.pricing.tabLabel,
      minimumFare: quote.pricing.minimumFare,
      currency: quote.pricing.currency,
      tiers: quote.pricing.tiers.map(tier => ({ id: tier.sourceTierId, fromKm: tier.fromKm, toKm: tier.toKm, pricePerKm: tier.pricePerKm, order: tier.order }))
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
      modelChoiceLabel: quote.vehicle.modelChoiceLabel
    },
    appliedPromotion: discountLines.length
      ? {
          id: discountLines[0].sourceId,
          label: discountLines.map(line => line.label).join(' + '),
          discount: roundMoney(discountLines.reduce((sum, line) => sum + Math.abs(line.totalAmount), 0)),
          currency: discountLines[0].currency
        }
      : null,
    promotions: (quote.promotionUsages || []).map(usage => ({
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
      createdAt: usage.createdAt.toISOString(),
      usedAt: usage.usedAt?.toISOString() || null,
      releasedAt: usage.releasedAt?.toISOString() || null,
      discount: roundMoney(discountLines.filter(line => line.sourceId === usage.promotionId).reduce((sum, line) => sum + Math.abs(line.totalAmount), 0))
    })),
    lines: quote.lines.map(line => ({ type: line.type, sourceId: line.sourceId, label: line.label, quantity: line.quantity, unitAmount: line.unitAmount, totalAmount: line.totalAmount, currency: line.currency, order: line.order }))
  }
}
function driverResponse(driver: {
  id: string
  driverType: string
  name: string
  affiliation: string
  plateType: string
  hkPlate: string
  mainlandPlate: string | null
  phoneCountryCode: string
  phone: string
  vehicleCategory: string
  vehicleColor: string
  vehiclePhotos: unknown
  reviewStatus: string
  settlementMethod: string | null
  settlementAccount: string | null
  isOnline?: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return { ...driver, isOnline: driver.isOnline ?? false, vehiclePhotos: Array.isArray(driver.vehiclePhotos) ? driver.vehiclePhotos : [], createdAt: driver.createdAt.toISOString(), updatedAt: driver.updatedAt.toISOString() }
}

function validDriverPayload(body: Partial<Prisma.DriverCreateInput>) {
  const required = ['name', 'affiliation', 'plateType', 'hkPlate', 'phone', 'vehicleCategory', 'vehicleColor'] as const
  if (required.some(field => typeof body[field] !== 'string' || !body[field]!.trim())) return false
  if (body.plateType !== '單牌' && body.plateType !== '兩地牌' && body.plateType !== '三地牌') return false
  if ((body.plateType === '兩地牌' || body.plateType === '三地牌') && !body.mainlandPlate?.trim()) return false
  return true
}

function tripResponse(trip: {
  scheduledAt: Date
  createdAt: Date
  updatedAt: Date
  user: Parameters<typeof userResponse>[0]
  quote?: PersistedQuote | null
  payment?: {
    id: string
    total: number
    currency: string
    fareAmount: number
    cashAmount: number
    externalAmount: number
    externalPaymentMethod: string | null
    externalReference: string | null
    status: string
    refundedAt: Date | null
    createdAt: Date
    updatedAt: Date
  } | null
  settlement?: {
    id: string
    driverId: string
    method: string
    settledAt: Date
  } | null
  [key: string]: unknown
}) {
  const { quote, ...data } = trip
  return {
    ...data,
    scheduledAt: trip.scheduledAt.toISOString(),
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    user: userResponse(trip.user),
    payment: trip.payment ? {
      id: trip.payment.id,
      total: trip.payment.total,
      currency: trip.payment.currency,
      fareAmount: trip.payment.fareAmount,
      cashAmount: trip.payment.cashAmount,
      externalAmount: trip.payment.externalAmount,
      externalPaymentMethod: trip.payment.externalPaymentMethod,
      externalReference: trip.payment.externalReference,
      status: trip.payment.status,
      refundedAt: trip.payment.refundedAt?.toISOString() || null,
      createdAt: trip.payment.createdAt.toISOString(),
      updatedAt: trip.payment.updatedAt.toISOString()
    } : null,
    settlement: trip.settlement ? {
      id: trip.settlement.id,
      driverId: trip.settlement.driverId,
      method: trip.settlement.method,
      settledAt: trip.settlement.settledAt.toISOString()
    } : null,
    quote: quote ? quoteResponse(quote) : null
  }
}
function parseDistancePricing(categoryId: string, body: Partial<DistancePricingSettings>): DistancePricingSettings {
  const minimumFare = Number(body.minimumFare)
  const currency = body.currency?.trim()
  const tiers = Array.isArray(body.tiers)
    ? body.tiers.map((tier, index) => ({
        id: String(tier.id || `tier-${index + 1}`).trim(),
        fromKm: Number(tier.fromKm),
        toKm: tier.toKm === null ? null : Number(tier.toKm),
        pricePerKm: Number(tier.pricePerKm),
        order: index + 1,
      }))
    : []
  const validNumbers = Number.isFinite(minimumFare) && minimumFare >= 0 && tiers.every(tier =>
    tier.id && Number.isFinite(tier.fromKm) && tier.fromKm >= 0 &&
    (tier.toKm === null || (Number.isFinite(tier.toKm) && tier.toKm > tier.fromKm)) &&
    Number.isFinite(tier.pricePerKm) && tier.pricePerKm >= 0)
  const contiguous = tiers.length > 0 && tiers.every((tier, index) =>
    index === tiers.length - 1 ? tier.toKm === null : tier.toKm === tiers[index + 1].fromKm)
  if (!currency || !validNumbers || !contiguous) throw new HttpException('Pricing tiers must be valid, contiguous, and end with an unlimited tier', HttpStatus.BAD_REQUEST)
  return { categoryId, minimumFare, currency, tiers }
}
function normalizeRegionalAddress(region: string, value: string) {
  if (region === '香港') return value.replace(/香港(?:特別行政區|特别行政区)?/g, '').replace(/^[\s·\-]+/, '')
  if (region === '澳門') return value.replace(/澳(?:門|门)(?:特別行政區|特别行政区)?/g, '').replace(/^[\s·\-]+/, '')
  return value
}
function formattedAddress(region: string, address: string) {
  let detail = normalizeRegionalAddress(region, address)
    .replace(/\s*[·\/-]\s*/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if ((region === '香港' || region === '澳門') && !detail.includes('-')) {
    const districtMatch = detail.match(/^(.+?(?:區|区|堂區|堂区|半島|半岛|路氹城))(.+)$/)
    if (districtMatch) detail = `${districtMatch[1]}-${districtMatch[2]}`
  }
  return [region === '大陸' ? '' : region, detail].filter(Boolean).join('-')
}
function recommendedAddressResponse(address: Omit<RecommendedAddress, 'region'> & { region: string }) {
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
  }
}
function parseRecommendedAddress(body: { region?: unknown; city?: unknown; name?: unknown; address?: unknown; latitude?: unknown; longitude?: unknown; enabled?: unknown; order?: unknown }, fallbackOrder: number): Omit<RecommendedAddress, 'id'> {
  const region = body.region
  const city = typeof body.city === 'string' ? body.city.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const address = typeof body.address === 'string' ? normalizeRegionalAddress(typeof region === 'string' ? region : '', body.address.trim()) : ''
  const parseCoordinate = (value: unknown, field: string) => {
    if (value === undefined || value === null || value === '') return null
    const coordinate = Number(value)
    if (!Number.isFinite(coordinate)) throw new HttpException(`${field} must be a valid number`, HttpStatus.BAD_REQUEST)
    return coordinate
  }
  const latitude = parseCoordinate(body.latitude, 'Latitude')
  const longitude = parseCoordinate(body.longitude, 'Longitude')
  const incomingOrder = body.order
  const order = incomingOrder === undefined || incomingOrder === null || incomingOrder === '' ? fallbackOrder : Number(incomingOrder)
  if (typeof region !== 'string' || !['大陸', '香港', '澳門'].includes(region) || (region === '大陸' && city.length > 100) || !name || name.length > 200 || !address || address.length > 500) {
    throw new HttpException('Region, name and address are required', HttpStatus.BAD_REQUEST)
  }
  if ((latitude === null) !== (longitude === null) || (latitude !== null && (Math.abs(latitude) > 90 || Math.abs(longitude!) > 180))) {
    throw new HttpException('Latitude and longitude must be supplied together and be in range', HttpStatus.BAD_REQUEST)
  }
  if (!Number.isInteger(order) || order < 0) throw new HttpException('Order must be a non-negative integer', HttpStatus.BAD_REQUEST)
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') throw new HttpException('Enabled must be a boolean', HttpStatus.BAD_REQUEST)
  return { region: region as AddressRegion, city: region === '大陸' ? city || null : null, name, address, latitude, longitude, enabled: body.enabled ?? true, order }
}
function parseMainlandCity(body: { name?: unknown; enabled?: unknown; order?: unknown }, fallbackOrder: number): Omit<MainlandCity, 'id'> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const order = body.order === undefined || body.order === null || body.order === '' ? fallbackOrder : Number(body.order)
  if (!name || name.length > 100) throw new HttpException('City name is required', HttpStatus.BAD_REQUEST)
  if (!/市$/.test(name)) throw new HttpException('City name must be a city-level unit ending with 市', HttpStatus.BAD_REQUEST)
  if (!Number.isInteger(order) || order < 0) throw new HttpException('Order must be a non-negative integer', HttpStatus.BAD_REQUEST)
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') throw new HttpException('Enabled must be a boolean', HttpStatus.BAD_REQUEST)
  return { name, enabled: body.enabled ?? true, order }
}
function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}` }
function verifyPassword(password: string, stored: string) { const [salt, hash] = stored.split(':'); if (!salt || !hash) return false; const actual = scryptSync(password, salt, 64); const expected = Buffer.from(hash, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected) }
const now = new Date().toISOString()
const administrators: Administrator[] = [{ id: 'admin-super', username: process.env.ADMIN_USERNAME || 'admin', displayName: 'Super Administrator', role: 'SUPER_ADMIN', enabled: true, passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'admin12345'), createdAt: now, updatedAt: now, lastLoginAt: null }]
const revokedAdminSessions = new Set<string>()
const adminAuditLogs: AdminAuditLog[] = []
function publicAdministrator(admin: Administrator) { const { passwordHash: _, ...safe } = admin; return safe }
function secret() { return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'development-admin-secret' }
function tokenFor(admin: Administrator) { const session: AdminSession = { sub: admin.id, role: admin.role, exp: Date.now() + 8 * 60 * 60 * 1000, jti: randomBytes(16).toString('hex') }; const payload = Buffer.from(JSON.stringify(session)).toString('base64url'); return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}` }
function adminSessionFrom(req: RequestLike): AdminSession { const value = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (process.env.NODE_ENV !== 'production' && value === 'dev-bypass') return { sub: 'admin-super', role: 'SUPER_ADMIN', exp: Date.now() + 60000, jti: 'dev-bypass' }; const [payload, signature] = value?.split('.') || []; if (!payload || !signature || !secret()) throw new UnauthorizedException('Valid admin session required'); const expected = createHmac('sha256', secret()).update(payload).digest('base64url'); try { if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('signature mismatch'); const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AdminSession; const admin = administrators.find(item => item.id === session.sub); if (!admin || !admin.enabled || session.exp <= Date.now() || revokedAdminSessions.has(session.jti)) throw new Error('invalid session'); return { ...session, role: admin.role } } catch { throw new UnauthorizedException('Valid admin session required') } }
function requireAuth(req: RequestLike) { return adminSessionFrom(req) }
function requireRole(req: RequestLike, roles: AdminRole[]) { const session = requireAuth(req); if (!roles.includes(session.role)) throw new ForbiddenException('Insufficient administrator permission'); return session }
function addAudit(req: RequestLike, status: 'SUCCESS' | 'FAILED', authenticatedSession?: AdminSession) { let session: AdminSession | null = authenticatedSession || null; if (!session) { try { session = adminSessionFrom(req) } catch {} } const admin = session ? administrators.find(item => item.id === session!.sub) : null; adminAuditLogs.unshift({ id: `audit-${Date.now()}-${randomBytes(3).toString('hex')}`, administratorId: admin?.id || null, username: admin?.username || 'anonymous', action: `${req.method || 'UNKNOWN'} ${req.url || ''}`, resource: req.url || '', method: req.method || 'UNKNOWN', status, ip: req.ip || '', createdAt: new Date().toISOString() }); if (adminAuditLogs.length > 1000) adminAuditLogs.length = 1000 }

@Injectable()
class AdminAccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestLike>()
    if (!req.url?.startsWith('/admin/') || req.url === '/admin/auth/login') return next.handle()
    const session = requireAuth(req)
    if (req.method !== 'GET' && session.role === 'VIEWER') { addAudit(req, 'FAILED'); throw new ForbiddenException('Viewer accounts are read-only') }
    return next.handle().pipe(tap({ next: () => { if (req.method !== 'GET') addAudit(req, 'SUCCESS') }, error: () => { if (req.method !== 'GET') addAudit(req, 'FAILED') } }))
  }
}

function supportSecret() { return process.env.SUPPORT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || '' }
function supportTokenFor(session: SupportSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${createHmac('sha256', supportSecret()).update(payload).digest('base64url')}`
}
function supportSessionFrom(req: RequestLike): SupportSession {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const [payload, signature] = value?.split('.') || []
  if (!payload || !signature || !supportSecret()) throw new UnauthorizedException('Valid support session required')
  const expected = createHmac('sha256', supportSecret()).update(payload).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('signature mismatch')
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SupportSession
    if (!session.conversationId || !session.riderId || session.exp <= Date.now()) throw new Error('expired session')
    return session
  } catch {
    throw new UnauthorizedException('Valid support session required')
  }
}
async function masterBoxRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.MASTERBOX_BASE_URL?.replace(/\/$/, '')
  const appId = process.env.MASTERBOX_APP_ID
  const apiKey = process.env.MASTERBOX_API_KEY
  if (!baseUrl || !appId || !apiKey) throw new HttpException('Master Box is not configured', HttpStatus.SERVICE_UNAVAILABLE)
  const response = await fetch(`${baseUrl}/api/integrations${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-app-id': appId, 'x-api-key': apiKey, ...init.headers }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new HttpException((data as { error?: string }).error || 'Master Box request failed', response.status)
  return data as T
}

@Controller('auth')
class ClientAuthController {
  @Post('phone/request')
  async requestPhoneCode(@Body() body: { countryCode?: string; phoneNumber?: string }) {
    const identity = parsePhoneIdentity(body)
    const requestKey = `${identity.countryCode}:${identity.phoneNumber}`
    const now = Date.now()
    const requestState = phoneChallengeRequests.get(requestKey)
    const shouldRateLimit = process.env.NODE_ENV === 'production'
    if (shouldRateLimit && requestState && now - requestState.windowStartedAt < PHONE_CODE_REQUEST_WINDOW_MS && requestState.count >= PHONE_CODE_MAX_REQUESTS) {
      throw new HttpException('Too many verification code requests', HttpStatus.TOO_MANY_REQUESTS)
    }
    if (shouldRateLimit && (!requestState || now - requestState.windowStartedAt >= PHONE_CODE_REQUEST_WINDOW_MS)) phoneChallengeRequests.set(requestKey, { count: 1, windowStartedAt: now })
    else if (shouldRateLimit && requestState) requestState.count += 1
    const code = '00000'
    const challengeId = randomBytes(18).toString('hex')
    const exp = now + PHONE_CODE_TTL_MS
    phoneChallenges.set(challengeId, { ...identity, code, exp, attempts: 0 })
    const requestedUser = await prisma.user.findUnique({ where: { countryCode_phoneNumber: identity }, select: { id: true } })
    await prisma.verificationCode.create({ data: { id: challengeId, userId: requestedUser?.id, countryCode: identity.countryCode, phoneNumber: identity.phoneNumber, codeHash: createHash('sha256').update(code).digest('hex'), expiresAt: new Date(exp) } })
    for (const [id, challenge] of phoneChallenges) {
      if (challenge.exp <= Date.now()) phoneChallenges.delete(id)
    }
    return {
      challengeId,
      expiresAt: new Date(exp).toISOString(),
      ...(process.env.NODE_ENV !== 'production' ? { developmentCode: code } : {})
    }
  }

  @Post('phone/verify')
  async verifyPhoneCode(@Body() body: { challengeId?: string; code?: string }) {
    const challengeId = body.challengeId?.trim() || ''
    const challenge = phoneChallenges.get(challengeId)
    if (!challenge || challenge.exp <= Date.now()) {
      phoneChallenges.delete(challengeId)
      await prisma.verificationCode.updateMany({ where: { id: challengeId, status: 'ISSUED' }, data: { status: 'EXPIRED' } })
      throw new UnauthorizedException('Verification code expired')
    }
    const submittedCode = body.code?.trim() || ''
    if (submittedCode !== challenge.code) {
      challenge.attempts += 1
      await prisma.verificationCode.updateMany({ where: { id: challengeId }, data: { attempts: challenge.attempts, status: challenge.attempts >= PHONE_CODE_MAX_ATTEMPTS ? 'LOCKED' : 'FAILED' } })
      if (challenge.attempts >= PHONE_CODE_MAX_ATTEMPTS) phoneChallenges.delete(challengeId)
      throw new UnauthorizedException('Invalid verification code')
    }
    phoneChallenges.delete(challengeId)
    const existing = await prisma.user.findUnique({ where: { countryCode_phoneNumber: { countryCode: challenge.countryCode, phoneNumber: challenge.phoneNumber } } })
    const user = existing || await prisma.user.create({ data: { id: await generateUserId(), countryCode: challenge.countryCode, phoneNumber: challenge.phoneNumber } })
    await prisma.verificationCode.updateMany({ where: { id: challengeId }, data: { userId: user.id, status: 'VERIFIED', consumedAt: new Date() } })
    const loggedInUser = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    return clientAuthResponse(loggedInUser)
  }

  @Post('third-party')
  async thirdParty(@Body() body: { provider?: string; providerToken?: string }) {
    const provider = body.provider?.trim().toLowerCase()
    const providerToken = body.providerToken?.trim()
    if (provider !== 'wechat' && provider !== 'apple') throw new HttpException('Unsupported third-party provider', HttpStatus.BAD_REQUEST)
    if (!providerToken) throw new HttpException('Third-party provider token is required', HttpStatus.BAD_REQUEST)
    if (process.env.NODE_ENV === 'production') throw new HttpException('Third-party provider verification is not configured', HttpStatus.SERVICE_UNAVAILABLE)

    const identity = await prisma.authIdentity.findUnique({
      where: { provider_providerId: { provider, providerId: providerToken } },
      include: { user: true }
    })
    if (identity) {
      const loggedInUser = await prisma.user.update({ where: { id: identity.user.id }, data: { lastLoginAt: new Date() } })
      return clientAuthResponse(loggedInUser)
    }

    const phoneNumber = `${Date.now()}${randomBytes(2).toString('hex')}`.replace(/\D/g, '').slice(-15)
    const user = await prisma.user.create({ data: { id: await generateUserId(), countryCode: '+852', phoneNumber, name: provider === 'wechat' ? 'WeChat User' : 'Apple User', lastLoginAt: new Date(), authIdentities: { create: { provider, providerId: providerToken } } } })
    return clientAuthResponse(user)
  }

  @Post('logout')
  async logout(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req)
    await prisma.clientSession.updateMany({ where: { jti: session.jti, revokedAt: null }, data: { revokedAt: new Date() } })
    const user = await prisma.user.update({ where: { id: session.sub }, data: { lastLogoutAt: new Date() }, select: { id: true } })
    return { ok: Boolean(user.id) }
  }
}

@Controller('driver/auth')
class DriverAuthController {
  @Post('phone/request')
  async requestPhoneCode(@Body() body: { countryCode?: string; phoneNumber?: string }) {
    const identity = parsePhoneIdentity(body)
    const driver = await prisma.driver.findFirst({ where: { phoneCountryCode: identity.countryCode, phone: identity.phoneNumber } })
    if (!driver) throw new HttpException('Driver not found', HttpStatus.NOT_FOUND)
    const code = '00000'
    const challengeId = randomBytes(18).toString('hex')
    const expiresAt = new Date(Date.now() + PHONE_CODE_TTL_MS)
    await prisma.driverOtpChallenge.create({ data: { id: challengeId, driverId: driver.id, countryCode: identity.countryCode, phone: identity.phoneNumber, codeHash: hashPassword(code), expiresAt } })
    return { challengeId, expiresAt: expiresAt.toISOString(), ...(process.env.NODE_ENV !== 'production' ? { developmentCode: code } : {}) }
  }

  @Post('phone/verify')
  async verifyPhoneCode(@Body() body: { challengeId?: string; code?: string; developmentCode?: string }) {
    const challenge = await prisma.driverOtpChallenge.findUnique({ where: { id: body.challengeId?.trim() || '' }, include: { driver: true } })
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now() || !challenge.driver) throw new UnauthorizedException('Verification code expired')
    const code = body.code?.trim() || ''
    if (code.length !== 5) throw new UnauthorizedException('Invalid verification code')
    if (!verifyPassword(code, challenge.codeHash)) throw new UnauthorizedException('Invalid verification code')
    await prisma.driverOtpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } })
    return driverAuthResponse(challenge.driver)
  }

  @Post('third-party')
  async thirdParty(@Body() body: { provider?: string; providerToken?: string }) {
    const provider = body.provider?.trim().toLowerCase()
    if (provider !== 'wechat' && provider !== 'apple') throw new HttpException('Unsupported third-party provider', HttpStatus.BAD_REQUEST)
    if (!body.providerToken?.trim()) throw new HttpException('Third-party provider token is required', HttpStatus.BAD_REQUEST)
    throw new HttpException('Third-party provider verification is not configured', HttpStatus.SERVICE_UNAVAILABLE)
  }

  @Get('me')
  async me(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req)
    const driver = await prisma.driver.findUnique({ where: { id: session.sub } })
    if (!driver) throw new UnauthorizedException('Driver not found')
    return driverResponse(driver)
  }

  @Post('logout')
  async logout(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req)
    await prisma.driverSession.updateMany({ where: { jti: session.jti, revokedAt: null }, data: { revokedAt: new Date() } })
    return { ok: true }
  }

  @Post('submit-review')
  async submitReview(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req)
    const driver = await prisma.driver.update({ where: { id: session.sub }, data: { reviewStatus: '待審核' } })
    return driverResponse(driver)
  }

  @Patch('me')
  async updateMe(@Req() req: RequestLike, @Body() body: { name?: unknown; phoneCountryCode?: unknown; phone?: unknown; vehicleCategory?: unknown; vehicleColor?: unknown; hkPlate?: unknown; mainlandPlate?: unknown; plateType?: unknown; vehiclePhotos?: unknown; settlementMethod?: unknown; settlementAccount?: unknown }) {
    const session = await driverSessionFrom(req)
    const data: Prisma.DriverUpdateInput = {}
    const textFields = ['name', 'phoneCountryCode', 'phone', 'vehicleCategory', 'vehicleColor', 'hkPlate', 'mainlandPlate', 'plateType', 'settlementMethod', 'settlementAccount'] as const
    for (const field of textFields) {
      if (body[field] !== undefined) {
        if (body[field] !== null && typeof body[field] !== 'string') throw new HttpException(`${field} must be a string`, HttpStatus.BAD_REQUEST)
        if (body[field] === null && field !== 'mainlandPlate' && field !== 'settlementMethod' && field !== 'settlementAccount') throw new HttpException(`${field} cannot be null`, HttpStatus.BAD_REQUEST)
        ;(data as Record<string, unknown>)[field] = body[field] === null ? null : body[field].trim()
      }
    }
    if (body.vehiclePhotos !== undefined) {
      if (!Array.isArray(body.vehiclePhotos) || body.vehiclePhotos.some(item => typeof item !== 'string')) throw new HttpException('vehiclePhotos must be an array of strings', HttpStatus.BAD_REQUEST)
      data.vehiclePhotos = body.vehiclePhotos
    }
    if (Object.keys(data).length === 0) throw new HttpException('No profile fields supplied', HttpStatus.BAD_REQUEST)
    const driver = await prisma.driver.update({ where: { id: session.sub }, data })
    return driverResponse(driver)
  }

  @Post('status')
  async updateStatus(@Req() req: RequestLike, @Body() body: { isOnline?: unknown }) {
    const session = await driverSessionFrom(req)
    if (typeof body.isOnline !== 'boolean') throw new HttpException('isOnline must be a boolean', HttpStatus.BAD_REQUEST)
    const now = new Date()
    const current = await prisma.driver.findUnique({ where: { id: session.sub }, select: { isOnline: true } })
    if (!current) throw new UnauthorizedException('Driver not found')
    if (current.isOnline !== body.isOnline) {
      if (body.isOnline) {
        await prisma.driverOnlineSession.create({ data: { driverId: session.sub, startedAt: now } })
      } else {
        await prisma.driverOnlineSession.updateMany({ where: { driverId: session.sub, endedAt: null }, data: { endedAt: now } })
      }
    }
    const driver = await prisma.driver.update({ where: { id: session.sub }, data: { isOnline: body.isOnline } })
    return driverResponse(driver)
  }

  @Get('statistics')
  async statistics(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const trips = await prisma.trip.findMany({
      where: { driverId: session.sub, status: 'COMPLETED', completedAt: { not: null } },
      include: { payment: true, settlement: true },
      orderBy: { completedAt: 'desc' }
    })
    const onlineSessions = await prisma.driverOnlineSession.findMany({ where: { driverId: session.sub, startedAt: { lt: now } } })
    const durationMs = onlineSessions.reduce((total, item) => {
      const start = item.startedAt > todayStart ? item.startedAt : todayStart
      const end = item.endedAt && item.endedAt < now ? item.endedAt : now
      return total + Math.max(0, end.getTime() - start.getTime())
    }, 0)
    const todayTrips = trips.filter(item => item.completedAt! >= todayStart)
    const monthTrips = trips.filter(item => item.completedAt! >= monthStart)
    const settledTrips = trips.filter(item => item.settlement != null)
    const unsettledTrips = trips.filter(item => item.settlement == null)
    const sum = (items: typeof trips) => items.reduce((total, item) => total + (item.payment?.total ?? item.fareBalancePaid + item.cashBalancePaid + item.externalPaid), 0)
    const ratings = await prisma.driverRating.findMany({ where: { driverId: session.sub }, select: { score: true } })
    const ratingTotal = ratings.reduce((total, item) => total + item.score, 0)
    const recentOrders = trips.slice(0, 3).map(item => ({
      id: item.id,
      completedAt: item.completedAt!.toISOString(),
      price: item.payment?.total ?? item.fareBalancePaid + item.cashBalancePaid + item.externalPaid,
      currency: item.payment?.currency ?? 'HKD',
      origin: item.origin,
      destination: item.destination,
      passenger: item.passengerName,
      settlementStatus: item.settlement ? 'SETTLED' : 'UNSETTLED',
      settlementMethod: item.settlement?.method ?? null,
      settledAt: item.settlement?.settledAt.toISOString() ?? null
    }))
    return {
      today: { earnings: sum(todayTrips), completedTrips: todayTrips.length, onlineHours: durationMs / 3600000 },
      month: { earnings: sum(monthTrips) },
      settlement: {
        settledEarnings: sum(settledTrips),
        unsettledEarnings: sum(unsettledTrips),
        currency: trips.find(item => item.payment?.currency)?.payment?.currency ?? 'HKD'
      },
      rating: { average: ratings.length ? ratingTotal / ratings.length : null, count: ratings.length },
      recentOrders
    }
  }

  @Get('trips')
  async history(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req)
    const trips = await prisma.trip.findMany({ where: { driverId: session.sub }, include: { user: true, payment: true, settlement: true }, orderBy: { scheduledAt: 'desc' } })
    return trips.map(trip => tripResponse(trip))
  }

  @Post('trips/:id/arrive')
  async arrive(@Req() req: RequestLike, @Param('id') id: string) {
    const session = await driverSessionFrom(req)
    const trip = await prisma.trip.findUnique({ where: { id }, include: { user: true } })
    if (!trip || trip.driverId !== session.sub) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
    if (!trip.acceptedAt || trip.startedAt || trip.completedAt || trip.status === 'CANCELLED') throw new HttpException('Trip cannot be marked arrived', HttpStatus.CONFLICT)
    const updated = await prisma.trip.update({ where: { id }, data: { arrivedAt: new Date() }, include: { user: true } })
    return tripResponse(updated)
  }

  @Post('trips/:id/start')
  async start(@Req() req: RequestLike, @Param('id') id: string) {
    const session = await driverSessionFrom(req)
    const trip = await prisma.trip.findUnique({ where: { id }, include: { user: true } })
    if (!trip || trip.driverId !== session.sub) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
    if (!trip.arrivedAt || trip.startedAt || trip.completedAt || trip.status === 'CANCELLED') throw new HttpException('Trip cannot be started', HttpStatus.CONFLICT)
    const updated = await prisma.trip.update({ where: { id }, data: { startedAt: new Date(), executionPhase: 'IN_PROGRESS' }, include: { user: true } })
    return tripResponse(updated)
  }

  @Post('trips/:id/complete')
  async complete(@Req() req: RequestLike, @Param('id') id: string) {
    const session = await driverSessionFrom(req)
    const trip = await prisma.trip.findUnique({ where: { id }, include: { user: true } })
    if (!trip || trip.driverId !== session.sub) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
    if (!trip.startedAt || trip.completedAt || trip.status === 'CANCELLED') throw new HttpException('Trip cannot be completed', HttpStatus.CONFLICT)
    const updated = await prisma.trip.update({ where: { id }, data: { completedAt: new Date(), status: 'COMPLETED', executionPhase: null }, include: { user: true } })
    return tripResponse(updated)
  }

  @Get('notifications')
  async notifications(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req)
    const items = await prisma.notification.findMany({ where: { driverId: session.sub }, orderBy: { createdAt: 'desc' } })
    return items.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() || null }))
  }

  @Post('notifications/:id/read')
  async readNotification(@Req() req: RequestLike, @Param('id') id: string) {
    const session = await driverSessionFrom(req)
    const result = await prisma.notification.updateMany({ where: { id, driverId: session.sub }, data: { readAt: new Date() } })
    if (result.count !== 1) throw new HttpException('Notification not found', HttpStatus.NOT_FOUND)
    const item = await prisma.notification.findUniqueOrThrow({ where: { id } })
    return { ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() || null }
  }
  @Get('trips/available')
  async available(@Req() req: RequestLike) {
    const session = await driverSessionFrom(req)
    const driver = await prisma.driver.findUnique({ where: { id: session.sub } })
    if (!driver) throw new UnauthorizedException('Driver not found')
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    if (!settings.driverRaceEnabled) throw new ForbiddenException('Driver race acceptance is disabled')
    requireReviewedDriver(driver)
    return prisma.trip.findMany({ where: { driverId: null, status: { not: 'COMPLETED' }, executionPhase: { not: 'IN_PROGRESS' } }, orderBy: { scheduledAt: 'asc' } })
  }

  @Post('trips/:id/accept')
  async accept(@Req() req: RequestLike, @Param('id') id: string) {
    const session = await driverSessionFrom(req)
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    if (!settings.driverRaceEnabled) throw new ForbiddenException('Driver race acceptance is disabled')
    const driver = await prisma.driver.findUnique({ where: { id: session.sub } })
    if (!driver) throw new UnauthorizedException('Driver not found')
    requireReviewedDriver(driver)
    const result = await prisma.trip.updateMany({ where: { id, driverId: null, status: { not: 'COMPLETED' }, executionPhase: { not: 'IN_PROGRESS' } }, data: { driverId: driver.id, driverName: driver.name, driverPhone: `${driver.phoneCountryCode} ${driver.phone}`, vehiclePlate: driver.hkPlate, acceptedAt: new Date() } })
    if (result.count !== 1) throw new HttpException('Trip is no longer available', HttpStatus.CONFLICT)
    return prisma.trip.findUnique({ where: { id }, include: { driver: true } })
  }
}

@Controller('driver/order-urls')
class DriverOrderUrlController {
  @Get(':token')
  async details(@Req() req: RequestLike, @Param('token') token: string) {
    const session = await driverSessionFrom(req)
    const item = await prisma.tripOrderUrl.findUnique({ where: { tokenHash: orderUrlTokenHash(token) }, include: { trip: { include: { user: true, driver: true } }, driver: true } })
    if (!item) throw new HttpException('Order URL not found', HttpStatus.NOT_FOUND)
    const now = new Date()
    if (item.revokedAt || item.usedAt || now < item.validFrom || now > item.validUntil) throw new HttpException('Order URL has expired', HttpStatus.GONE)
    if (item.driverId && item.driverId !== session.sub) throw new ForbiddenException('Order URL is assigned to another driver')
    if (item.trip.driverId && item.trip.driverId !== session.sub) throw new HttpException('Trip has been accepted by another driver', HttpStatus.CONFLICT)
    return { token, validFrom: item.validFrom.toISOString(), validUntil: item.validUntil.toISOString(), driverId: item.driverId, trip: tripResponse(item.trip) }
  }

  @Post(':token/accept')
  async accept(@Req() req: RequestLike, @Param('token') token: string) {
    const session = await driverSessionFrom(req)
    const now = new Date()
    const result = await prisma.$transaction(async tx => {
      const item = await tx.tripOrderUrl.findUnique({ where: { tokenHash: orderUrlTokenHash(token) } })
      if (!item) throw new HttpException('Order URL not found', HttpStatus.NOT_FOUND)
      if (item.revokedAt || item.usedAt || now < item.validFrom || now > item.validUntil) throw new HttpException('Order URL has expired', HttpStatus.GONE)
      if (item.driverId && item.driverId !== session.sub) throw new ForbiddenException('Order URL is assigned to another driver')
      const driver = await tx.driver.findUnique({ where: { id: session.sub } })
      if (!driver) throw new UnauthorizedException('Driver not found')
      const trip = await tx.trip.findUnique({ where: { id: item.tripId } })
      if (!trip || trip.status === 'COMPLETED' || trip.status === 'CANCELLED') throw new HttpException('Trip is not available', HttpStatus.CONFLICT)
      if (!item.driverId && trip.driverId && trip.driverId !== driver.id) throw new HttpException('Trip has been accepted by another driver', HttpStatus.CONFLICT)
      if (item.driverId && trip.driverId && trip.driverId !== driver.id) throw new HttpException('Trip has been accepted by another driver', HttpStatus.CONFLICT)
      const claimed = await tx.tripOrderUrl.updateMany({ where: { id: item.id, usedAt: null, revokedAt: null }, data: { usedAt: now, driverId: driver.id } })
      if (claimed.count !== 1) throw new HttpException('Order URL is no longer available', HttpStatus.CONFLICT)
      return tx.trip.update({ where: { id: trip.id }, data: { driverId: driver.id, driverName: driver.name, driverPhone: `${driver.phoneCountryCode} ${driver.phone}`, vehiclePlate: driver.hkPlate, acceptedAt: now }, include: { user: true, driver: true } })
    })
    return tripResponse(result)
  }
}

@Controller('support')
class SupportController {
  @Post('session')
  async session(@Body() body: { riderId?: string; displayName?: string }) {
    const riderId = body.riderId?.trim()
    if (!riderId || riderId.length > 100) throw new HttpException('Valid riderId is required', HttpStatus.BAD_REQUEST)
    const conversation = await masterBoxRequest<MasterBoxConversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        externalId: `master-travel-project:${riderId}`,
        subject: 'Master Travel Project 客戶服務',
        metadata: { source: 'master-travel-project-service', riderId, displayName: body.displayName?.trim().slice(0, 80) || undefined }
      })
    })
    const exp = Date.now() + 8 * 60 * 60 * 1000
    return { token: supportTokenFor({ conversationId: conversation.id, riderId, exp }), expiresAt: new Date(exp).toISOString() }
  }

  @Get('messages')
  async messages(@Req() req: RequestLike) {
    const { conversationId } = supportSessionFrom(req)
    const conversation = await masterBoxRequest<MasterBoxConversation>(`/conversations/${encodeURIComponent(conversationId)}`)
    return { data: conversation.messages || [] }
  }

  @Post('messages')
  async send(@Req() req: RequestLike, @Body() body: { text?: string; clientId?: string }) {
    const { conversationId } = supportSessionFrom(req)
    const text = body.text?.trim()
    if (!text || text.length > 2000) throw new HttpException('Message must contain 1–2000 characters', HttpStatus.BAD_REQUEST)
    return masterBoxRequest<MasterBoxMessage>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ externalId: body.clientId, direction: 'inbound', content: { type: 'text', text } })
    })
  }
}

@Controller('admin/auth')
class AdminAuthController {
  @Post('login') login(@Req() req: RequestLike, @Body() body: { username?: string; password?: string }) { const username = body.username?.trim(); const admin = administrators.find(item => item.username.toLowerCase() === username?.toLowerCase()); if (!admin || !admin.enabled || !body.password || !verifyPassword(body.password, admin.passwordHash)) { adminAuditLogs.unshift({ id: `audit-${Date.now()}`, administratorId: admin?.id || null, username: username || 'anonymous', action: 'LOGIN', resource: '/admin/auth/login', method: 'POST', status: 'FAILED', ip: req.ip || '', createdAt: new Date().toISOString() }); throw new UnauthorizedException('Invalid admin credentials') } admin.lastLoginAt = new Date().toISOString(); const token = tokenFor(admin); adminAuditLogs.unshift({ id: `audit-${Date.now()}`, administratorId: admin.id, username: admin.username, action: 'LOGIN', resource: '/admin/auth/login', method: 'POST', status: 'SUCCESS', ip: req.ip || '', createdAt: admin.lastLoginAt }); return { token, expiresIn: 28800, administrator: publicAdministrator(admin) } }
  @Get('me') me(@Req() req: RequestLike) { const session = requireAuth(req); const admin = administrators.find(item => item.id === session.sub)!; return publicAdministrator(admin) }
  @Post('logout') logout(@Req() req: RequestLike) { const session = requireAuth(req); addAudit(req, 'SUCCESS', session); revokedAdminSessions.add(session.jti); return { ok: true } }
}
@Controller('admin')
class AdminController {
  @Get('drivers') async listDrivers(@Req() req: RequestLike) {
    requireAuth(req)
    const data = await prisma.driver.findMany({ orderBy: { createdAt: 'desc' } })
    return { data: data.map(driverResponse), total: data.length }
  }
  @Post('drivers') async saveDriver(@Req() req: RequestLike, @Body() body: Partial<Prisma.DriverCreateInput> & { id?: string }) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    if (!validDriverPayload(body)) throw new HttpException('Valid driver fields are required', HttpStatus.BAD_REQUEST)
    const data = {
      driverType: body.driverType?.trim() || '內部司機',
      name: body.name!.trim(), affiliation: body.affiliation!.trim(), plateType: body.plateType!.trim(),
      hkPlate: body.hkPlate!.trim(), mainlandPlate: body.mainlandPlate?.trim() || null,
      phoneCountryCode: body.phoneCountryCode?.trim() || '+852', phone: body.phone!.trim(),
      vehicleCategory: body.vehicleCategory!.trim(), vehicleColor: body.vehicleColor!.trim(),
      vehiclePhotos: Array.isArray(body.vehiclePhotos) ? body.vehiclePhotos : [],
      reviewStatus: body.reviewStatus?.trim() || '待審核',
      settlementMethod: body.settlementMethod?.trim() || null, settlementAccount: body.settlementAccount?.trim() || null
    }
    const driver = body.id
      ? await prisma.driver.update({ where: { id: body.id }, data })
      : await prisma.driver.create({ data: { id: `driver-${Date.now()}-${randomBytes(4).toString('hex')}`, ...data } })
    return driverResponse(driver)
  }
  @Delete('drivers/:id') async deleteDriver(@Req() req: RequestLike, @Param('id') id: string) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.driver.findUnique({ where: { id } })
    if (!existing) throw new HttpException('Driver not found', HttpStatus.NOT_FOUND)
    await prisma.driver.delete({ where: { id } })
    return { ok: true }
  }

 @Get('administrators') listAdministrators(@Req() req: RequestLike) { requireRole(req, ['SUPER_ADMIN']); return { data: administrators.map(publicAdministrator), total: administrators.length } }
  @Post('administrators') saveAdministrator(@Req() req: RequestLike, @Body() body: Partial<Administrator> & { password?: string }) { const session = requireRole(req, ['SUPER_ADMIN']); const username = body.username?.trim(); const displayName = body.displayName?.trim(); const roles: AdminRole[] = ['SUPER_ADMIN', 'OPERATOR', 'VIEWER']; if (!username || !displayName || !body.role || !roles.includes(body.role)) throw new HttpException('Valid administrator fields are required', HttpStatus.BAD_REQUEST); const duplicate = administrators.find(item => item.username.toLowerCase() === username.toLowerCase() && item.id !== body.id); if (duplicate) throw new HttpException('Administrator username already exists', HttpStatus.CONFLICT); const existing = body.id ? administrators.find(item => item.id === body.id) : undefined; if (body.id && !existing) throw new HttpException('Administrator not found', HttpStatus.NOT_FOUND); if (!existing && (!body.password || body.password.length < 8)) throw new HttpException('Password must contain at least 8 characters', HttpStatus.BAD_REQUEST); if (existing) { const removingSuperAccess = existing.role === 'SUPER_ADMIN' && (body.role !== 'SUPER_ADMIN' || body.enabled === false); const enabledSuperAdministrators = administrators.filter(item => item.role === 'SUPER_ADMIN' && item.enabled); if (removingSuperAccess && enabledSuperAdministrators.length === 1) throw new HttpException('At least one enabled super administrator is required', HttpStatus.BAD_REQUEST); if (existing.id === session.sub && (body.role !== 'SUPER_ADMIN' || body.enabled === false)) throw new HttpException('Cannot remove your own super administrator access', HttpStatus.BAD_REQUEST); existing.username = username; existing.displayName = displayName; existing.role = body.role; existing.enabled = body.enabled ?? existing.enabled; existing.updatedAt = new Date().toISOString(); if (body.password) { if (body.password.length < 8) throw new HttpException('Password must contain at least 8 characters', HttpStatus.BAD_REQUEST); existing.passwordHash = hashPassword(body.password) } return publicAdministrator(existing) } const created: Administrator = { id: `admin-${Date.now()}`, username, displayName, role: body.role, enabled: body.enabled ?? true, passwordHash: hashPassword(body.password!), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null }; administrators.push(created); return publicAdministrator(created) }
  @Delete('administrators/:id') disableAdministrator(@Req() req: RequestLike, @Param('id') id: string) { const session = requireRole(req, ['SUPER_ADMIN']); if (session.sub === id) throw new HttpException('Cannot disable the current administrator', HttpStatus.BAD_REQUEST); const admin = administrators.find(item => item.id === id); if (!admin) throw new HttpException('Administrator not found', HttpStatus.NOT_FOUND); if (admin.role === 'SUPER_ADMIN' && admin.enabled && administrators.filter(item => item.role === 'SUPER_ADMIN' && item.enabled).length === 1) throw new HttpException('At least one enabled super administrator is required', HttpStatus.BAD_REQUEST); admin.enabled = false; admin.updatedAt = new Date().toISOString(); return { ok: true } }
  @Get('audit-logs') listAuditLogs(@Req() req: RequestLike) { requireRole(req, ['SUPER_ADMIN']); return { data: adminAuditLogs.slice(0, 300), total: adminAuditLogs.length } }

  @Get('notifications') async listNotifications(@Req() req: RequestLike) {
    requireAuth(req)
    return { data: await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 300 }) }
  }
  @Post('notifications') async createNotification(@Req() req: RequestLike, @Body() body: { title?: string; content?: string; audience?: string; userIds?: string[]; driverIds?: string[] }) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const title = body.title?.trim()
    const content = body.content?.trim()
    const audience = body.audience === 'ALL_USERS' || body.audience === 'ALL_DRIVERS' ? body.audience : 'SELECTED'
    if (!title || !content) throw new HttpException('Title and content are required', HttpStatus.BAD_REQUEST)
    const requestedUserIds = Array.isArray(body.userIds) ? [...new Set(body.userIds.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))] : []
    const requestedDriverIds = Array.isArray(body.driverIds) ? [...new Set(body.driverIds.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))] : []
    const userIds = audience === 'ALL_USERS' ? (await prisma.user.findMany({ where: { enabled: true }, select: { id: true } })).map(item => item.id) : requestedUserIds
    const driverIds = audience === 'ALL_DRIVERS' ? (await prisma.driver.findMany({ select: { id: true } })).map(item => item.id) : requestedDriverIds
    if (!userIds.length && !driverIds.length) throw new HttpException('At least one recipient is required', HttpStatus.BAD_REQUEST)
    if (audience === 'SELECTED') {
      const [users, drivers] = await Promise.all([
        userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } }) : [],
        driverIds.length ? prisma.driver.findMany({ where: { id: { in: driverIds } }, select: { id: true } }) : []
      ])
      if (users.length !== userIds.length || drivers.length !== driverIds.length) throw new HttpException('One or more recipients were not found', HttpStatus.BAD_REQUEST)
    }
    const records: Array<{ title: string; content: string; audience: string; userId?: string; driverId?: string }> = [
      ...[...new Set(userIds)].map(userId => ({ title, content, audience: 'USER', userId })),
      ...[...new Set(driverIds)].map(driverId => ({ title, content, audience: 'DRIVER', driverId }))
    ]
    await prisma.notification.createMany({ data: records })
    return { ok: true, count: records.length }
  }

  @Get('promotions') async listPromotions(@Req() req: RequestLike) {
    requireAuth(req)
    const data = await prisma.promotion.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] })
    return { data, total: data.length }
  }

  @Post('promotions') async savePromotion(@Req() req: RequestLike, @Body() body: PromotionInput) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const kind = body.kind === 'COUPON' || body.kind === 'MEMBER' || body.kind === 'CAMPAIGN' ? body.kind : ''
    const discountType = body.discountType === 'FIXED_AMOUNT' || body.discountType === 'PERCENTAGE' || body.discountType === 'TOTAL_PRICE' ? body.discountType : ''
    const stackingMode = body.stackingMode === 'PERCENTAGE_AND_VOUCHER' || body.stackingMode === 'ALL' ? body.stackingMode : 'NONE'
    const discountValue = Number(body.discountValue)
    const minimumSpend = Number(body.minimumSpend ?? 0)
    const maximumDiscount = body.maximumDiscount === '' || body.maximumDiscount === null || body.maximumDiscount === undefined ? null : Number(body.maximumDiscount)
    const usageLimit = body.usageLimit === '' || body.usageLimit === null || body.usageLimit === undefined ? null : Number(body.usageLimit)
    const priority = Number(body.priority ?? 0)
    const couponCode = typeof body.couponCode === 'string' && body.couponCode.trim() ? body.couponCode.trim().toUpperCase() : null
    const membershipLevel = typeof body.membershipLevel === 'string' && body.membershipLevel.trim() ? body.membershipLevel.trim() : null
    const originRegion = normalizeRuleText(body.originRegion) || null
    const originCity = normalizeRuleText(body.originCity) || null
    const destinationRegion = normalizeRuleText(body.destinationRegion) || null
    const destinationCity = normalizeRuleText(body.destinationCity) || null
    const weekdays = normalizeWeekdays(body.weekdays)
    const timeStart = normalizeRuleText(body.timeStart) || null
    const timeEnd = normalizeRuleText(body.timeEnd) || null
    const startsAt = body.startsAt ? new Date(String(body.startsAt)) : null
    const endsAt = body.endsAt ? new Date(String(body.endsAt)) : null
    if (!name || !kind || !discountType || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'PERCENTAGE' && discountValue > 100) || !Number.isFinite(minimumSpend) || minimumSpend < 0 || !Number.isInteger(priority) || (maximumDiscount !== null && (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)) || (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit <= 0)) || (startsAt && Number.isNaN(startsAt.valueOf())) || (endsAt && Number.isNaN(endsAt.valueOf())) || (startsAt && endsAt && startsAt >= endsAt) || (timeStart && timeToMinutes(timeStart) === null) || (timeEnd && timeToMinutes(timeEnd) === null) || (kind === 'COUPON' && !couponCode) || (kind === 'MEMBER' && !membershipLevel)) throw new HttpException('Promotion fields are invalid', HttpStatus.BAD_REQUEST)
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    const data = { name, kind: kind as PromotionKind, discountType: discountType as DiscountType, stackingMode: stackingMode as PromotionStackingMode, discountValue, currency: configuredCurrencyLabel(settings), minimumSpend, maximumDiscount, priority, startsAt, endsAt, enabled: body.enabled !== false, couponCode: kind === 'COUPON' ? couponCode : null, usageLimit, membershipLevel: kind === 'MEMBER' ? membershipLevel : null, originRegion, originCity, destinationRegion, destinationCity, weekdays: weekdays.length ? weekdays : Prisma.JsonNull, timeStart, timeEnd }
    if (id) { const existing = await prisma.promotion.findUnique({ where: { id } }); if (!existing) throw new HttpException('Promotion not found', HttpStatus.NOT_FOUND); return prisma.promotion.update({ where: { id }, data }) }
    return prisma.promotion.create({ data })
  }
  @Delete('promotions/:id') async deletePromotion(@Req() req: RequestLike, @Param('id') id: string) { requireRole(req, ['SUPER_ADMIN', 'OPERATOR']); const existing = await prisma.promotion.findUnique({ where: { id } }); if (!existing) throw new HttpException('Promotion not found', HttpStatus.NOT_FOUND); await prisma.promotion.delete({ where: { id } }); return { ok: true } }

  @Post('users/:id/membership') async updateMembership(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { membershipLevel?: string | null }) { requireRole(req, ['SUPER_ADMIN', 'OPERATOR']); const user = await prisma.user.update({ where: { id }, data: { membershipLevel: body.membershipLevel?.trim() || null } }); return userResponse(user) }

  @Get('dashboard') async dashboard(@Req() req: RequestLike) {
    requireAuth(req)
    const [users, tripsCount, pendingTrips, completedTrips, recommendedAddresses] = await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.trip.count({ where: { status: 'PENDING' } }),
      prisma.trip.count({ where: { status: 'COMPLETED' } }),
      prisma.recommendedAddress.count({ where: { enabled: true } })
    ])
    return { users, trips: tripsCount, pendingTrips, completedTrips, charterOrders: charterOrders.length, pendingCharters: charterOrders.filter(order => order.status === 'PENDING').length, recommendedAddresses }
  }
  @Get('users') async listUsers(@Req() req: RequestLike) {
    requireAuth(req)
    const [data, total] = await prisma.$transaction([prisma.user.findMany({ orderBy: { createdAt: 'desc' } }), prisma.user.count()])
    return { data: data.map(userResponse), total }
  }
  @Post('users') async createUser(@Req() req: RequestLike, @Body() body: { countryCode?: string; phoneNumber?: string; name?: string; displayName?: string; email?: string; gender?: string; region?: string; birthday?: string }) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const identity = parsePhoneIdentity(body)
    const duplicate = await prisma.user.findUnique({ where: { countryCode_phoneNumber: identity } })
    if (duplicate) throw new HttpException('A user with this phone number already exists', HttpStatus.CONFLICT)
    const email = parseProfileEmail(body.email)
    const birthday = parseBirthday(body.birthday)
    return userResponse(await prisma.user.create({ data: { id: await generateUserId(), ...identity, name: body.name?.trim() || null, displayName: body.displayName?.trim() || null, email, gender: body.gender?.trim() || null, region: body.region?.trim() || null, birthday } }))
  }
  @Get('users/:id') async getUser(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    const user = await prisma.user.findUnique({ where: { id }, include: { authIdentities: { select: { provider: true } }, verificationCodes: { orderBy: { createdAt: 'desc' }, take: 20 }, walletTransactions: { orderBy: { createdAt: 'desc' }, take: 20 } } })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    const [currentTrips, currentCharterOrders] = await Promise.all([
      prisma.trip.findMany({ where: { userId: id, status: { in: ['PENDING', 'CONFIRMED'] } }, orderBy: { scheduledAt: 'asc' } }),
      Promise.resolve(charterOrders.filter(order => order.userId === id && ['PENDING', 'CONFIRMED'].includes(order.status)))
    ])
    return { ...userResponse(user), loginMethods: loginMethods(user), verificationCodes: (user.verificationCodes || []).map(item => ({ id: item.id, purpose: item.purpose, status: item.status, attempts: item.attempts, expiresAt: item.expiresAt.toISOString(), consumedAt: item.consumedAt?.toISOString() || null, createdAt: item.createdAt.toISOString() })), currentTrips: currentTrips.map(trip => ({ ...trip, scheduledAt: trip.scheduledAt.toISOString(), createdAt: trip.createdAt.toISOString(), updatedAt: trip.updatedAt.toISOString() })), currentCharterOrders, walletTransactions: user.walletTransactions }
  }
  @Post('users/:id') async updateUser(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { countryCode?: string; phoneNumber?: string; name?: string; displayName?: string; email?: string; gender?: string; region?: string; birthday?: string }) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    const identity = parsePhoneIdentity({ countryCode: body.countryCode ?? existing.countryCode, phoneNumber: body.phoneNumber ?? existing.phoneNumber })
    const duplicate = await prisma.user.findUnique({ where: { countryCode_phoneNumber: identity } })
    if (duplicate && duplicate.id !== id) throw new HttpException('A user with this phone number already exists', HttpStatus.CONFLICT)
    const email = parseProfileEmail(body.email)
    const birthday = parseBirthday(body.birthday)
    return userResponse(await prisma.user.update({ where: { id }, data: { ...identity, name: body.name?.trim() || null, displayName: body.displayName?.trim() || null, email, gender: body.gender?.trim() || null, region: body.region?.trim() || null, birthday } }))
  }
  @Post('users/:id/status') async updateUserStatus(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { enabled?: boolean }) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    if (typeof body.enabled !== 'boolean') throw new HttpException('Enabled status is required', HttpStatus.BAD_REQUEST)
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.user.update({ where: { id }, data: { enabled: body.enabled } })
      if (!body.enabled) await tx.clientSession.updateMany({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } })
      return result
    })
    return userResponse(updated)
  }
  @Post('users/:id/wallet-adjustments') async adjustWallet(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { wallet?: 'CASH' | 'FARE'; direction?: 'INCREASE' | 'DECREASE'; amount?: number; reason?: string }) {
    const session = requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const amount = roundMoney(Number(body.amount))
    const reason = body.reason?.trim()
    if ((body.wallet !== 'CASH' && body.wallet !== 'FARE') || (body.direction !== 'INCREASE' && body.direction !== 'DECREASE') || !Number.isFinite(amount) || amount <= 0 || !reason || reason.length > 500) {
      throw new HttpException('Wallet, direction, positive amount, and reason are required', HttpStatus.BAD_REQUEST)
    }
    const wallet = body.wallet
    const direction = body.direction
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id } })
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
      const balanceField = wallet === 'CASH' ? 'cashBalance' : 'fareBalance'
      const balance = user[balanceField]
      if (direction === 'DECREASE' && balance < amount) throw new HttpException('Insufficient wallet balance', HttpStatus.BAD_REQUEST)
      const balanceAfter = roundMoney(direction === 'INCREASE' ? balance + amount : balance - amount)
      const updated = await tx.user.update({ where: { id }, data: { [balanceField]: balanceAfter } })
      const transaction = await tx.walletTransaction.create({ data: { userId: id, wallet, type: direction === 'INCREASE' ? 'ADMIN_INCREASE' : 'ADMIN_DECREASE', amount, balanceAfter, reason, administratorId: session.sub } })
      return { user: userResponse(updated), transaction }
    })
    return result
  }
  @Get('users/:id/wallet-transactions') async listWalletTransactions(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    if (!await prisma.user.findUnique({ where: { id }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    return { data: await prisma.walletTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }) }
  }
  @Get('users/:id/top-up-withdrawal-history') async listTopUpWithdrawalHistory(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    if (!await prisma.user.findUnique({ where: { id }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    return { data: await prisma.walletTransaction.findMany({ where: { userId: id, type: { in: ['TOP_UP', 'WITHDRAWAL'] } }, orderBy: { createdAt: 'desc' } }) }
  }
  @Get('trips') async listTrips(@Req() req: RequestLike) {
   requireAuth(req)
   await prisma.trip.updateMany({ where: { status: 'PENDING', quote: { is: { expiresAt: { lte: new Date() } } } }, data: { status: 'CANCELLED' } })
   const data = await prisma.trip.findMany({
     include: {
       user: true,
       quote: {
         include: {
           pricing: { include: { tiers: { orderBy: { order: 'asc' } } } },
           vehicle: true,
           promotionUsages: { include: { promotion: true } },
           lines: { orderBy: { order: 'asc' } }
         }
       },
       payment: true,
       settlement: true,
       driver: true,
     },
     orderBy: { scheduledAt: 'asc' }
   })
   return { data: data.map(tripResponse), total: data.length }
  }
  @Post('trips') async createTrip(@Req() req: RequestLike, @Body() body: Partial<Prisma.TripUncheckedCreateInput>) {
   requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
   const userId = body.userId?.trim()
   const origin = body.origin?.trim()
   const destination = body.destination?.trim()
   const scheduledAt = new Date(body.scheduledAt || '')
   const allowedStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const
   const allowedExecutionPhases = ['WAITING_DRIVER', 'DRIVER_ASSIGNED', 'IN_PROGRESS'] as const
   const allowedRegions = ['HK', 'MACAU', 'GUANGDONG'] as const
   if (!userId || !origin || !destination || !body.region || !allowedRegions.includes(body.region as typeof allowedRegions[number]) || Number.isNaN(scheduledAt.getTime()) || !body.status || !allowedStatuses.includes(body.status as typeof allowedStatuses[number]) || (body.executionPhase !== undefined && body.executionPhase !== null && !allowedExecutionPhases.includes(body.executionPhase as typeof allowedExecutionPhases[number]))) throw new HttpException('Valid trip fields are required', HttpStatus.BAD_REQUEST)
   if (body.driverId && !await prisma.driver.findUnique({ where: { id: body.driverId }, select: { id: true } })) throw new HttpException('Driver not found', HttpStatus.BAD_REQUEST)
   if (!await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.BAD_REQUEST)
   const trip = await prisma.trip.create({ data: { userId, origin, destination, region: body.region as any, scheduledAt, status: body.status as any, executionPhase: body.status === 'CONFIRMED' ? (body.executionPhase as any || 'WAITING_DRIVER') : null,    driverId: body.driverId?.trim() || null, driverName: body.driverName || null, driverPhone: body.driverPhone || null, vehiclePlate: body.vehiclePlate || null }, include: { user: true } })
   return { ...trip, scheduledAt: trip.scheduledAt.toISOString(), createdAt: trip.createdAt.toISOString(), updatedAt: trip.updatedAt.toISOString(), user: userResponse(trip.user) }
  }
   @Post('trips/:id') async updateTrip(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<Prisma.TripUncheckedCreateInput>) {
   requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
   const existing = await prisma.trip.findUnique({ where: { id } })
   if (!existing) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
   const origin = body.origin?.trim()
   const destination = body.destination?.trim()
   const scheduledAt = new Date(body.scheduledAt || existing.scheduledAt)
   const allowedStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const
   const allowedExecutionPhases = ['WAITING_DRIVER', 'DRIVER_ASSIGNED', 'IN_PROGRESS'] as const
   if (!origin || !destination || !body.region?.trim() || Number.isNaN(scheduledAt.getTime()) || !body.status || !allowedStatuses.includes(body.status as typeof allowedStatuses[number]) || (body.executionPhase !== undefined && body.executionPhase !== null && !allowedExecutionPhases.includes(body.executionPhase as typeof allowedExecutionPhases[number]))) throw new HttpException('Valid trip fields are required', HttpStatus.BAD_REQUEST)
   if (body.userId && !await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.BAD_REQUEST)
   if (body.driverId && !await prisma.driver.findUnique({ where: { id: body.driverId }, select: { id: true } })) throw new HttpException('Driver not found', HttpStatus.BAD_REQUEST)
   if (body.status === 'CANCELLED' && (existing.status === 'COMPLETED' || existing.executionPhase === 'IN_PROGRESS')) throw new HttpException('Completed or in-progress trips cannot be cancelled', HttpStatus.CONFLICT)
   const region = body.region.trim()
   const trip = await prisma.$transaction(async tx => {
     const currentTrip = await tx.trip.findUniqueOrThrow({ where: { id }, select: { status: true, userId: true } })
     const payment = await tx.payment.findUnique({ where: { tripId: id } })
     if (body.status === 'CANCELLED' && currentTrip.status !== 'CANCELLED' && payment?.status === 'PAID') {
       const user = await tx.user.findUniqueOrThrow({ where: { id: currentTrip.userId } })
       const fareBalance = roundMoney(user.fareBalance + payment.fareAmount)
       const cashBalance = roundMoney(user.cashBalance + payment.cashAmount)
       await tx.user.update({ where: { id: user.id }, data: { fareBalance, cashBalance } })
       await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', refundedAt: new Date() } })
       if (payment.fareAmount > 0) await tx.walletTransaction.create({ data: { userId: user.id, wallet: 'FARE', type: 'REFUND', amount: payment.fareAmount, balanceAfter: fareBalance, reason: `訂單退款 - 車費餘額 (訂單: ${id.slice(-8)})`, paymentId: payment.id } })
       if (payment.cashAmount > 0) await tx.walletTransaction.create({ data: { userId: user.id, wallet: 'CASH', type: 'REFUND', amount: payment.cashAmount, balanceAfter: cashBalance, reason: `訂單退款 - 現金餘額 (訂單: ${id.slice(-8)})`, paymentId: payment.id } })
     }
     return tx.trip.update({ where: { id }, data: { userId: body.userId || existing.userId, origin, destination, region: region as any, scheduledAt, status: body.status as any, executionPhase: body.status === 'CONFIRMED' ? (body.executionPhase as any || existing.executionPhase || 'WAITING_DRIVER') : null, driverId: body.driverId ?? existing.driverId, driverName: body.driverName ?? existing.driverName, driverPhone: body.driverPhone ?? existing.driverPhone, vehiclePlate: body.vehiclePlate ?? existing.vehiclePlate }, include: { user: true } })
   })
   return { ...trip, scheduledAt: trip.scheduledAt.toISOString(), createdAt: trip.createdAt.toISOString(), updatedAt: trip.updatedAt.toISOString(), user: userResponse(trip.user) }
  }
  @Post('trips/:id/settlement') async settleTrip(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { method?: string }) {
   requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
   const method = body.method?.trim()
   if (!method) throw new HttpException('Settlement method is required', HttpStatus.BAD_REQUEST)
   const trip = await prisma.trip.findUnique({ where: { id }, select: { id: true, driverId: true, status: true } })
   if (!trip) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
   if (!trip.driverId || trip.status !== 'COMPLETED') throw new HttpException('Only completed trips assigned to a driver can be settled', HttpStatus.CONFLICT)
   const settlement = await prisma.driverSettlement.upsert({ where: { tripId: id }, create: { id: `settlement-${Date.now()}-${randomBytes(4).toString('hex')}`, tripId: id, driverId: trip.driverId, method }, update: { driverId: trip.driverId, method, settledAt: new Date() } })
   return { ...settlement, settledAt: settlement.settledAt.toISOString(), createdAt: settlement.createdAt.toISOString() }
  }
  @Post('trips/:id/settlement/unsettle') async unsettleTrip(@Req() req: RequestLike, @Param('id') id: string) {
   requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
   const settlement = await prisma.driverSettlement.findUnique({ where: { tripId: id } })
   if (!settlement) throw new HttpException('Trip is already unsettled', HttpStatus.NOT_FOUND)
   await prisma.driverSettlement.delete({ where: { tripId: id } })
   return { ok: true }
  }
  @Post('trips/:id/dispatch') async dispatchTrip(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { driverId?: string }) {
   requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
   const driverId = body.driverId?.trim()
   if (!driverId) throw new HttpException('Driver is required', HttpStatus.BAD_REQUEST)
   const [trip, driver] = await Promise.all([prisma.trip.findUnique({ where: { id } }), prisma.driver.findUnique({ where: { id: driverId } })])
   if (!trip) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
   if (!driver) throw new HttpException('Driver not found', HttpStatus.BAD_REQUEST)
   if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED' || trip.executionPhase === 'IN_PROGRESS') throw new HttpException('This trip cannot be dispatched', HttpStatus.CONFLICT)
   const updated = await prisma.trip.update({
     where: { id },
     data: { driverId: driver.id, driverName: driver.name, driverPhone: `${driver.phoneCountryCode} ${driver.phone}`, vehiclePlate: driver.hkPlate, status: 'CONFIRMED', executionPhase: 'DRIVER_ASSIGNED', assignedAt: new Date(), acceptedAt: new Date() },
     include: { user: true, driver: true }
   })
   return { ...updated, scheduledAt: updated.scheduledAt.toISOString(), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), user: userResponse(updated.user) }
  }
  @Post('trips/:id/order-url')
  async createOrderUrl(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { driverId?: string; validFrom?: string; validUntil?: string }) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const validFrom = new Date(body.validFrom || '')
    const validUntil = new Date(body.validUntil || '')
    if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime()) || validFrom >= validUntil) throw new HttpException('Valid URL date range is required', HttpStatus.BAD_REQUEST)
    const [trip, driver] = await Promise.all([prisma.trip.findUnique({ where: { id } }), body.driverId ? prisma.driver.findUnique({ where: { id: body.driverId.trim() } }) : null])
    if (!trip) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') throw new HttpException('This trip cannot create an order URL', HttpStatus.CONFLICT)
    if (body.driverId && !driver) throw new HttpException('Driver not found', HttpStatus.BAD_REQUEST)
    const token = randomBytes(32).toString('base64url')
    const item = await prisma.tripOrderUrl.create({ data: { tokenHash: orderUrlTokenHash(token), tripId: id, driverId: driver?.id || null, validFrom, validUntil } })
    return { id: item.id, token, url: orderUrlValue(token), tripId: id, driverId: item.driverId, validFrom: validFrom.toISOString(), validUntil: validUntil.toISOString(), usedAt: null, revokedAt: null }
  }
  @Get('trips/:id/order-urls')
  async listOrderUrls(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    const data = await prisma.tripOrderUrl.findMany({ where: { tripId: id }, include: { driver: true }, orderBy: { createdAt: 'desc' } })
    return { data: data.map(item => ({ id: item.id, tripId: item.tripId, driver: item.driver ? driverResponse(item.driver) : null, validFrom: item.validFrom.toISOString(), validUntil: item.validUntil.toISOString(), usedAt: item.usedAt?.toISOString() || null, revokedAt: item.revokedAt?.toISOString() || null })), total: data.length }
  }
  @Post('trips/:id/order-urls/:urlId/revoke')
  async revokeOrderUrl(@Req() req: RequestLike, @Param('id') id: string, @Param('urlId') urlId: string) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const item = await prisma.tripOrderUrl.findFirst({ where: { id: urlId, tripId: id } })
    if (!item) throw new HttpException('Order URL not found', HttpStatus.NOT_FOUND)
    const updated = await prisma.tripOrderUrl.update({ where: { id: urlId }, data: { revokedAt: new Date() } })
    return { id: updated.id, revokedAt: updated.revokedAt?.toISOString() || null }
  }
  @Get('charter-orders') async listCharterOrders(@Req() req: RequestLike) { requireAuth(req); const usersById = new Map((await prisma.user.findMany()).map(user => [user.id, userResponse(user)])); return { data: charterOrders.map(order => ({ ...order, user: usersById.get(order.userId) || null })), total: charterOrders.length } }
  @Post('charter-orders/:id') async updateCharterOrder(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<CharterOrder>) { requireRole(req, ['SUPER_ADMIN', 'OPERATOR']); const order = charterOrders.find(item => item.id === id); if (!order) throw new HttpException('Charter order not found', HttpStatus.NOT_FOUND); const origin = body.origin?.trim(); const destination = body.destination?.trim(); const scheduledAt = new Date(body.scheduledAt || order.scheduledAt); const durationHours = Number(body.durationHours); const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']; const regions = ['大陸', '香港', '澳門']; if (!origin || !destination || !body.originRegion || !regions.includes(body.originRegion) || !body.destinationRegion || !regions.includes(body.destinationRegion) || Number.isNaN(scheduledAt.getTime()) || !Number.isFinite(durationHours) || durationHours <= 0 || !body.status || !statuses.includes(body.status)) throw new HttpException('Valid charter order fields are required', HttpStatus.BAD_REQUEST); if (body.userId && !await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } })) throw new HttpException('User not found', HttpStatus.BAD_REQUEST); Object.assign(order, { userId: body.userId || order.userId, originRegion: body.originRegion, origin, destinationRegion: body.destinationRegion, destination, scheduledAt: scheduledAt.toISOString(), durationHours, status: body.status }); return order }
  @Post('charter-orders/:id/status') updateCharterStatus(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { status?: string }) { requireAuth(req); const order = charterOrders.find(item => item.id === id); if (!order) throw new HttpException('Charter order not found', HttpStatus.NOT_FOUND); const allowed = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']; if (!body.status || !allowed.includes(body.status)) throw new HttpException('Valid status is required', HttpStatus.BAD_REQUEST); order.status = body.status; return order }
  @Get('membership-plans') listMembershipPlans(@Req() req: RequestLike) { requireAuth(req); return { data: [...membershipPlans].sort((a, b) => a.order - b.order), total: membershipPlans.length } }
  @Post('membership-plans') saveMembershipPlan(@Req() req: RequestLike, @Body() body: Partial<MembershipPlan>) { requireAuth(req); const id = body.id?.trim(); const name = body.name?.trim(); const monthly = Number(body.monthly); const yearly = Number(body.yearly); if (!id || !name || !body.level?.trim() || !Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0) throw new HttpException('Valid membership plan fields are required', HttpStatus.BAD_REQUEST); const existing = membershipPlans.find(item => item.id === id); const values = { level: body.level.trim(), name, monthly, yearly, recommended: body.recommended ?? false, benefits: Array.isArray(body.benefits) ? body.benefits.map(String).filter(Boolean).slice(0, 6) : existing?.benefits || [], enabled: body.enabled ?? true, order: Number(body.order) || existing?.order || membershipPlans.length + 1 }; if (existing) { Object.assign(existing, values); return existing } const item = { id, ...values }; membershipPlans.push(item); return item }
  @Delete('membership-plans/:id') deleteMembershipPlan(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = membershipPlans.find(plan => plan.id === id); if (!item) throw new HttpException('Membership plan not found', HttpStatus.NOT_FOUND); item.enabled = false; return { ok: true } }
  @Get('vehicle-categories') async listVehicleCategories(@Req() req: RequestLike) { requireAuth(req); const [data, total] = await prisma.$transaction([prisma.vehicleCategory.findMany({ orderBy: { order: 'asc' } }), prisma.vehicleCategory.count()]); return { data: data.map(vehicleCategoryResponse), total } }
  @Post('vehicle-categories') async saveVehicleCategory(@Req() req: RequestLike, @Body() body: Partial<VehicleCategory>) {
    requireAuth(req)
    if (!validVehicleCategory(body)) throw new HttpException('Category id, name and tab label are required', HttpStatus.BAD_REQUEST)
    const existing = await prisma.vehicleCategory.findUnique({ where: { id: body.id } })
    if (existing) return vehicleCategoryResponse(await prisma.vehicleCategory.update({ where: { id: existing.id }, data: { name: body.name!.trim(), tabLabel: body.tabLabel!.trim(), order: Number(body.order) || existing.order, enabled: body.enabled ?? existing.enabled } }))
    const order = Number(body.order) || await prisma.vehicleCategory.count() + 1
    const item = { id: body.id!, name: body.name!.trim(), tabLabel: body.tabLabel!.trim(), order, enabled: body.enabled ?? true }
    const pricing = defaultDistancePricing(item.id)
    return prisma.$transaction(async tx => {
      const category = await tx.vehicleCategory.create({ data: item })
      await tx.categoryDistancePricing.create({ data: { categoryId: item.id, minimumFare: pricing.minimumFare, currency: pricing.currency, tiers: { create: pricing.tiers } } })
      return vehicleCategoryResponse(category)
    })
  }
  @Delete('vehicle-categories/:id') async deleteVehicleCategory(@Req() req: RequestLike, @Param('id') id: string) {
    requireAuth(req)
    const category = await prisma.vehicleCategory.findUnique({ where: { id } })
    if (!category) throw new HttpException('Vehicle category not found', HttpStatus.NOT_FOUND)
    await prisma.$transaction([prisma.vehicle.updateMany({ where: { categoryId: id }, data: { categoryId: null } }), prisma.vehicleCategory.delete({ where: { id } })])
    return { ok: true }
  }
  @Get('vehicles') async listVehicles(@Req() req: RequestLike) { requireAuth(req); const [data, total] = await prisma.$transaction([prisma.vehicle.findMany({ orderBy: { order: 'asc' } }), prisma.vehicle.count()]); return { data: data.map(vehicleResponse), total } }
  @Post('vehicles') async saveVehicle(@Req() req: RequestLike, @Body() body: Partial<VehicleCatalogItem>) {
    requireAuth(req)
    const [category, existing] = await Promise.all([prisma.vehicleCategory.findUnique({ where: { id: body.categoryId || '' } }), body.id ? prisma.vehicle.findUnique({ where: { id: body.id } }) : null])
    const seats = Number(body.seats)
    if (!category || !body.id || !body.model?.trim() || !Number.isInteger(seats) || seats <= 0 || !body.image?.trim()) throw new HttpException('Valid vehicle fields are required', HttpStatus.BAD_REQUEST)
    const values = { categoryId: body.categoryId!, brand: body.brand?.trim() || '', model: body.model.trim(), series: body.series?.trim() || '', seats, image: body.image.trim(), colorLabel: body.colorLabel?.trim() || '不限顏色', modelChoiceLabel: body.modelChoiceLabel?.trim() || '', enabled: body.enabled ?? true, order: Number(body.order) || (existing?.order || await prisma.vehicle.count() + 1) }
    return vehicleResponse(existing ? await prisma.vehicle.update({ where: { id: existing.id }, data: values }) : await prisma.vehicle.create({ data: { id: body.id, ...values } }))
  }
  @Delete('vehicles/:id') async deleteVehicle(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = await prisma.vehicle.findUnique({ where: { id } }); if (!item) throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND); await prisma.vehicle.update({ where: { id }, data: { enabled: false } }); return { ok: true } }

  @Get('vehicle-extras') async listVehicleExtras(@Req() req: RequestLike) { requireAuth(req); const [data, total] = await prisma.$transaction([prisma.vehicleExtra.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] }), prisma.vehicleExtra.count()]); return { data: data.map(vehicleExtraResponse), total } }
  @Post('vehicle-extras') async saveVehicleExtra(@Req() req: RequestLike, @Body() body: Partial<VehicleExtraOption>) {
    requireAuth(req)
    const existing = body.id ? await prisma.vehicleExtra.findUnique({ where: { id: body.id } }) : null
    const price = Number(body.price)
    if (!body.id || !body.label?.trim() || !Number.isFinite(price) || price < 0) throw new HttpException('Valid extra option fields are required', HttpStatus.BAD_REQUEST)
    const rawRequiredWithinMinutes = body.requiredWithinMinutes as unknown
    const requiredWithinMinutes = rawRequiredWithinMinutes === undefined || rawRequiredWithinMinutes === null || rawRequiredWithinMinutes === '' ? null : Number(rawRequiredWithinMinutes)
    if (requiredWithinMinutes !== null && (!Number.isInteger(requiredWithinMinutes) || requiredWithinMinutes <= 0 || requiredWithinMinutes > 24 * 60)) throw new HttpException('Required time window must be between 1 and 1440 minutes', HttpStatus.BAD_REQUEST)
    const triggerType = normalizeTriggerType(body.triggerType, body.requiredForImmediate === true)
    const nightStartTime = body.nightStartTime === null || body.nightStartTime === '' ? null : String(body.nightStartTime)
    const nightEndTime = body.nightEndTime === null || body.nightEndTime === '' ? null : String(body.nightEndTime)
    if (triggerType === 'NIGHT' && (timeToMinutes(nightStartTime) === null || timeToMinutes(nightEndTime) === null)) throw new HttpException('Night trigger requires valid start and end times', HttpStatus.BAD_REQUEST)
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    const values = { name: body.name?.trim() || body.id, label: body.label.trim(), price, currency: configuredCurrencyLabel(settings), enabled: body.enabled ?? true, order: Number(body.order) || existing?.order || await prisma.vehicleExtra.count() + 1, requiredForImmediate: triggerType === 'IMMEDIATE', requiredWithinMinutes: triggerType === 'IMMEDIATE' ? requiredWithinMinutes : null, triggerType, triggerEnabled: body.triggerEnabled ?? true, nightStartTime: triggerType === 'NIGHT' ? nightStartTime : null, nightEndTime: triggerType === 'NIGHT' ? nightEndTime : null }
    return vehicleExtraResponse(existing ? await prisma.vehicleExtra.update({ where: { id: existing.id }, data: values }) : await prisma.vehicleExtra.create({ data: { id: body.id, ...values } }))
  }
  @Delete('vehicle-extras/:id') async deleteVehicleExtra(@Req() req: RequestLike, @Param('id') id: string) { requireAuth(req); const item = await prisma.vehicleExtra.findUnique({ where: { id } }); if (!item) throw new HttpException('Extra option not found', HttpStatus.NOT_FOUND); await prisma.vehicleExtra.update({ where: { id }, data: { enabled: false } }); return { ok: true } }
  @Get('distance-pricing') async getDistancePricing(@Req() req: RequestLike) {
    requireAuth(req)
    const categories = await prisma.vehicleCategory.findMany({ orderBy: { order: 'asc' }, include: { distancePricing: { include: { tiers: { orderBy: { order: 'asc' } } } } } })
    return { data: categories.flatMap(category => category.distancePricing ? [{ ...pricingResponse(category.distancePricing), category: { id: category.id, name: category.name, tabLabel: category.tabLabel, enabled: category.enabled } }] : []) }
  }
  @Post('distance-pricing/currency') async switchDistancePricingCurrency(@Req() req: RequestLike, @Body() body: { currency?: string }) {
    requireAuth(req)
    if (body.currency !== 'RMB' && body.currency !== 'HKD') throw new HttpException('Currency must be RMB or HKD', HttpStatus.BAD_REQUEST)
    const targetLabel = currencyLabels[body.currency]
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    await prisma.$transaction([
      prisma.appSetting.update({ where: { id: settings.id }, data: { pricingCurrency: body.currency } }),
      prisma.categoryDistancePricing.updateMany({ data: { currency: targetLabel } }),
      prisma.vehicleExtra.updateMany({ data: { currency: targetLabel } }),
      prisma.routeMinimumFare.updateMany({ data: { currency: targetLabel } }),
      prisma.promotion.updateMany({ data: { currency: targetLabel } })
    ])
    const data = await prisma.categoryDistancePricing.findMany({ orderBy: { category: { order: 'asc' } }, include: { tiers: { orderBy: { order: 'asc' } } } })
    return { currency: targetLabel, data: data.map(pricingResponse) }
  }
  @Post('distance-pricing/:categoryId') async saveDistancePricing(@Req() req: RequestLike, @Param('categoryId') categoryId: string, @Body() body: Partial<DistancePricingSettings>) {
    requireAuth(req)
    if (!await prisma.vehicleCategory.findUnique({ where: { id: categoryId } })) throw new HttpException('Vehicle category not found', HttpStatus.NOT_FOUND)
    const appSettings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    const settings = { ...parseDistancePricing(categoryId, body), currency: configuredCurrencyLabel(appSettings) }
    const pricing = await prisma.categoryDistancePricing.upsert({
      where: { categoryId },
      create: { categoryId, minimumFare: settings.minimumFare, currency: settings.currency, tiers: { create: settings.tiers } },
      update: { minimumFare: settings.minimumFare, currency: settings.currency, tiers: { deleteMany: {}, create: settings.tiers } },
      include: { tiers: { orderBy: { order: 'asc' } } }
    })
    return pricingResponse(pricing)
  }
  @Post('distance-pricing/:categoryId/calculate') async previewDistancePricing(@Req() req: RequestLike, @Param('categoryId') categoryId: string, @Body() body: { distanceKm?: number }) {
    requireAuth(req)
    const pricing = await prisma.categoryDistancePricing.findUnique({ where: { categoryId }, include: { tiers: { orderBy: { order: 'asc' } } } })
    if (!pricing) throw new HttpException('Vehicle category pricing not found', HttpStatus.NOT_FOUND)
    const distanceKm = Number(body.distanceKm)
    if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new HttpException('Valid distance is required', HttpStatus.BAD_REQUEST)
    return { categoryId, distanceKm, fare: calculateDistanceFare(distanceKm, pricing), currency: pricing.currency }
  }
  @Get('route-minimum-fares') async listRouteMinimumFares(@Req() req: RequestLike) {
    requireAuth(req)
    const data = await prisma.routeMinimumFare.findMany({ orderBy: [{ originRegion: 'asc' }, { destinationRegion: 'asc' }, { createdAt: 'asc' }] })
    return { data: data.map(routeMinimumFareResponse) }
  }
  @Post('route-minimum-fares') async saveRouteMinimumFare(@Req() req: RequestLike, @Body() body: Partial<RouteMinimumFareSettings>) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const appSettings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    const values = { ...parseRouteMinimumFare(body), currency: configuredCurrencyLabel(appSettings) }
    if (values.categoryId && !await prisma.vehicleCategory.findUnique({ where: { id: values.categoryId } })) {
      throw new HttpException('Vehicle category not found', HttpStatus.NOT_FOUND)
    }
    const mirrorWhere = {
      originRegion: values.destinationRegion,
      originCity: values.destinationCity,
      destinationRegion: values.originRegion,
      destinationCity: values.originCity,
      categoryId: values.categoryId
    }
    const item = await prisma.$transaction(async tx => {
      const current = body.id ? await tx.routeMinimumFare.findUnique({ where: { id: body.id } }) : null
      if (body.id && !current) throw new HttpException('Route minimum fare not found', HttpStatus.NOT_FOUND)
      const saved = current
        ? await tx.routeMinimumFare.update({ where: { id: current.id }, data: values })
        : await tx.routeMinimumFare.create({ data: values })
      const mirror = await tx.routeMinimumFare.findFirst({ where: { ...mirrorWhere, id: { not: saved.id } } })
      const mirrorValues = {
        ...values,
        originRegion: mirrorWhere.originRegion,
        originCity: mirrorWhere.originCity,
        destinationRegion: mirrorWhere.destinationRegion,
        destinationCity: mirrorWhere.destinationCity
      }
      if (mirror) {
        await tx.routeMinimumFare.update({ where: { id: mirror.id }, data: mirrorValues })
      } else {
        await tx.routeMinimumFare.create({ data: mirrorValues })
      }
      return saved
    })
    return routeMinimumFareResponse(item)
  }
  @Delete('route-minimum-fares/:id') async deleteRouteMinimumFare(@Req() req: RequestLike, @Param('id') id: string) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    await prisma.$transaction(async tx => {
      const item = await tx.routeMinimumFare.findUnique({ where: { id } })
      if (!item) throw new HttpException('Route minimum fare not found', HttpStatus.NOT_FOUND)
      await tx.routeMinimumFare.deleteMany({
        where: {
          OR: [
            { id: item.id },
            {
              originRegion: item.destinationRegion,
              originCity: item.destinationCity,
              destinationRegion: item.originRegion,
              destinationCity: item.originCity,
              categoryId: item.categoryId
            }
          ]
        },
      })
    })
    return { ok: true }
  }
  @Get('recommended-addresses') async listRecommendedAddresses(@Req() req: RequestLike) {
    requireAuth(req)
    const [data, total] = await prisma.$transaction([
      prisma.recommendedAddress.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
      prisma.recommendedAddress.count(),
    ])
    return { data: data.map(recommendedAddressResponse), total }
  }
  @Get('mainland-cities') async listMainlandCities(@Req() req: RequestLike) {
    requireAuth(req)
    return { data: await prisma.mainlandCity.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }) }
  }
  @Post('mainland-cities') async saveMainlandCity(@Req() req: RequestLike, @Body() body: Partial<MainlandCity>) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const existing = id ? await prisma.mainlandCity.findUnique({ where: { id } }) : null
    if (id && !existing) throw new HttpException('Mainland city not found', HttpStatus.NOT_FOUND)
    const values = parseMainlandCity(body, existing?.order ?? await prisma.mainlandCity.count() + 1)
    try {
      return existing
        ? await prisma.mainlandCity.update({ where: { id: existing.id }, data: values })
        : await prisma.mainlandCity.create({ data: values })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) throw new HttpException('City already exists', HttpStatus.CONFLICT)
      throw error
    }
  }
  @Delete('mainland-cities/:id') async deleteMainlandCity(@Req() req: RequestLike, @Param('id') id: string) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.mainlandCity.findUnique({ where: { id } })
    if (!existing) throw new HttpException('Mainland city not found', HttpStatus.NOT_FOUND)
    await prisma.$transaction([
      prisma.recommendedAddress.updateMany({
        where: { region: '大陸', city: existing.name },
        data: { city: null },
      }),
      prisma.mainlandCity.delete({ where: { id } }),
    ])
    return { ok: true }
  }
  @Post('recommended-addresses') async saveRecommendedAddress(@Req() req: RequestLike, @Body() body: Partial<RecommendedAddress>) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const existing = id ? await prisma.recommendedAddress.findUnique({ where: { id } }) : null
    if (id && !existing) throw new HttpException('Recommended address not found', HttpStatus.NOT_FOUND)
    const values = parseRecommendedAddress(body, existing?.order ?? await prisma.recommendedAddress.count() + 1)
    if (values.region === '大陸' && values.city) {
      const city = await prisma.mainlandCity.findFirst({ where: { name: values.city!, enabled: true } })
      if (!city) throw new HttpException('Please select an enabled mainland city', HttpStatus.BAD_REQUEST)
    }
    const saved = existing
      ? await prisma.recommendedAddress.update({ where: { id: existing.id }, data: values })
      : await prisma.recommendedAddress.create({ data: values })
    return recommendedAddressResponse(saved)
  }
  @Patch('recommended-addresses/:id') async updateRecommendedAddress(@Req() req: RequestLike, @Param('id') id: string, @Body() body: Partial<RecommendedAddress>) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.recommendedAddress.findUnique({ where: { id } })
    if (!existing) throw new HttpException('Recommended address not found', HttpStatus.NOT_FOUND)
    const values = parseRecommendedAddress({ ...existing, ...body }, existing.order)
    if (values.region === '大陸' && values.city) {
      const city = await prisma.mainlandCity.findFirst({ where: { name: values.city!, enabled: true } })
      if (!city) throw new HttpException('Please select an enabled mainland city', HttpStatus.BAD_REQUEST)
    }
    const updated = await prisma.recommendedAddress.update({
      where: { id },
      data: values
    })
    return recommendedAddressResponse(updated)
  }
  @Delete('recommended-addresses/:id') async deleteRecommendedAddress(@Req() req: RequestLike, @Param('id') id: string) {
    requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    const existing = await prisma.recommendedAddress.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new HttpException('Recommended address not found', HttpStatus.NOT_FOUND)
    await prisma.recommendedAddress.delete({ where: { id } })
    return { ok: true }
  }
}
@Controller('notifications')
class NotificationsController {
  @Get('me') async listMine(@Req() req: RequestLike) {
    const auth = req.headers.authorization || ''
    if (!auth) throw new UnauthorizedException('Authentication required')
    const session = await clientSessionFrom(req).catch(() => null)
    if (session) {
      const data = await prisma.notification.findMany({ where: { OR: [{ userId: session.sub }, { audience: 'ALL_USERS' }] }, orderBy: { createdAt: 'desc' }, take: 100 })
      return { data, unread: data.filter(item => !item.readAt).length }
    }
    const driver = await driverSessionFrom(req)
    const data = await prisma.notification.findMany({ where: { OR: [{ driverId: driver.sub }, { audience: 'ALL_DRIVERS' }] }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { data, unread: data.filter(item => !item.readAt).length }
  }
  @Post(':id/read') async markRead(@Req() req: RequestLike, @Param('id') id: string) {
    try { const client = await clientSessionFrom(req); return prisma.notification.updateMany({ where: { id, OR: [{ userId: client.sub }, { audience: 'ALL_USERS' }] }, data: { readAt: new Date() } }) }
    catch { const driver = await driverSessionFrom(req); return prisma.notification.updateMany({ where: { id, OR: [{ driverId: driver.sub }, { audience: 'ALL_DRIVERS' }] }, data: { readAt: new Date() } }) }
  }
}

@Controller('membership-plans')
class PublicMembershipPlansController { @Get() list() { return { data: membershipPlans.filter(item => item.enabled).sort((a, b) => a.order - b.order) } } }

@Controller('promotions')
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
      couponCode: promotion.kind === 'COUPON' ? promotion.couponCode : null
    }
  }

  @Get()
  async list() {
    const now = new Date()
    const promotions = await prisma.promotion.findMany({
      where: {
        enabled: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
        ]
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
    })
    return { data: promotions.map(promotion => this.publicPromotion(promotion)) }
  }

  @Post('redeem')
  async redeem(@Body() body: { couponCode?: unknown }) {
    const couponCode = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : ''
    if (!couponCode) throw new HttpException('請輸入優惠代碼', HttpStatus.BAD_REQUEST)
    const now = new Date()
    const promotion = await prisma.promotion.findFirst({
      where: {
        enabled: true,
        kind: 'COUPON',
        couponCode,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
        ]
      }
    })
    if (!promotion) throw new HttpException('優惠代碼無效或已過期', HttpStatus.NOT_FOUND)
    if (promotion.usageLimit !== null) {
      const reserved = await prisma.promotionUsage.count({ where: { promotionId: promotion.id, status: 'RESERVED' } })
      if (promotion.usageCount + reserved >= promotion.usageLimit) throw new HttpException('優惠代碼已達使用上限', HttpStatus.CONFLICT)
    }
    return { data: this.publicPromotion(promotion), message: '優惠代碼有效，可於預約行程時使用' }
  }
}

@Controller('vehicles')
class PublicVehiclesController {
  @Get() async listPublicVehicles() {
    const [categories, data, extras, settings] = await Promise.all([
      prisma.vehicleCategory.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }),
      prisma.vehicle.findMany({ where: { enabled: true, category: { is: { enabled: true } } }, orderBy: { order: 'asc' } }),
      prisma.vehicleExtra.findMany({
        where: {
          OR: [
            { enabled: true },
            { triggerEnabled: true, triggerType: { in: ['IMMEDIATE', 'NIGHT'] } },
            { triggerEnabled: true, triggerType: 'WEATHER' }
          ]
        },
        orderBy: [{ order: 'asc' }, { id: 'asc' }]
      }),
      prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    ])
    return { categories: categories.map(vehicleCategoryResponse), data: data.map(vehicleResponse), extras: extras.map(vehicleExtraResponse), severeWeatherEnabled: settings.severeWeatherEnabled }
  }
}
@Controller('quotes')
class PublicQuotesController {
  @Post()
  async create(@Body() body: CreateQuoteRequest) {
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : ''
    const vehicleId = typeof body.vehicleId === 'string' ? body.vehicleId.trim() : ''
    const distanceMeters = Number(body.distanceMeters)
    if (!categoryId || !vehicleId || !Number.isFinite(distanceMeters) || distanceMeters < 0) {
      throw new HttpException('Category, vehicle, and a valid distance in meters are required', HttpStatus.BAD_REQUEST)
    }
    const distanceKm = distanceMeters / 1000
    const durationSeconds = Number(body.durationSeconds)
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) throw new HttpException('A valid route duration is required', HttpStatus.BAD_REQUEST)
    const originRegion = typeof body.originRegion === 'string' ? body.originRegion.trim() : ''
    const originCity = typeof body.originCity === 'string' ? body.originCity.trim() : ''
    const destinationRegion = typeof body.destinationRegion === 'string' ? body.destinationRegion.trim() : ''
    const destinationCity = typeof body.destinationCity === 'string' ? body.destinationCity.trim() : ''
    const scheduledAtValue = body.scheduledAt ? new Date(String(body.scheduledAt)) : new Date()
    if (Number.isNaN(scheduledAtValue.valueOf())) throw new HttpException('Scheduled time is invalid', HttpStatus.BAD_REQUEST)
    const requestedExtras = parseQuoteExtras(body)
    const quote = await prisma.$transaction(async tx => {
      const [settings, category, vehicle, extras, routeMinimumFares] = await Promise.all([
        tx.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } }),
        tx.vehicleCategory.findUnique({
          where: { id: categoryId },
          include: { distancePricing: { include: { tiers: { orderBy: { order: 'asc' } } } } }
        }),
        tx.vehicle.findUnique({ where: { id: vehicleId } }),
        tx.vehicleExtra.findMany({
          where: {
            OR: [
              { enabled: true },
              { triggerEnabled: true, triggerType: { in: ['IMMEDIATE', 'NIGHT', 'WEATHER'] } }
            ]
          }
        }),
        originRegion && destinationRegion
          ? tx.routeMinimumFare.findMany({
              where: {
                enabled: true,
                originRegion,
                destinationRegion,
                OR: [{ originCity: null }, ...(originCity ? [{ originCity }] : [])],
                AND: [{ OR: [{ destinationCity: null }, ...(destinationCity ? [{ destinationCity }] : [])] }, { OR: [{ categoryId: null }, { categoryId }] }]
              }
            })
          : Promise.resolve([])
      ])
      if (!category || !category.enabled) throw new HttpException('Vehicle category is unavailable', HttpStatus.NOT_FOUND)
      if (!category.distancePricing) throw new HttpException('Vehicle category pricing is unavailable', HttpStatus.CONFLICT)
      if (!vehicle || !vehicle.enabled || vehicle.categoryId !== category.id) throw new HttpException('Vehicle is unavailable for the selected category', HttpStatus.BAD_REQUEST)
      const requestedExtraIds = new Set(requestedExtras.map(selection => selection.id))
      if (extras.filter(extra => requestedExtraIds.has(extra.id)).length !== requestedExtraIds.size) throw new HttpException('One or more extras are unavailable', HttpStatus.BAD_REQUEST)
      const requiredExtras = extras.filter(extra => extraTriggerMatches(extra, scheduledAtValue, new Date(), settings.severeWeatherEnabled))
      for (const extra of requiredExtras) {
        if (!requestedExtras.some(selection => selection.id === extra.id)) requestedExtras.push({ id: extra.id, quantity: 1 })
      }

      const exchangeRate = Number(settings.exchangeRate)
      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new HttpException('Exchange rate is unavailable', HttpStatus.CONFLICT)
      const currency = displayCurrency(body.displayCurrency ?? body.currency, settings.currency)
      const pricing = category.distancePricing
      const routeMinimumFare = routeMinimumFares
        .sort((a, b) => (Number(Boolean(b.originCity)) + Number(Boolean(b.destinationCity)) + Number(Boolean(b.categoryId))) - (Number(Boolean(a.originCity)) + Number(Boolean(a.destinationCity)) + Number(Boolean(a.categoryId))))[0] || null
      const extraById = new Map(extras.map(extra => [extra.id, extra]))
      const lines = [
        ...quoteDistanceLines(distanceKm, pricing).map(line => ({
          ...line,
          unitAmount: convertCurrency(line.unitAmount, pricing.currency, currency, exchangeRate),
          totalAmount: convertCurrency(line.totalAmount, pricing.currency, currency, exchangeRate),
          currency: currencyLabels[currency]
        })),
        ...routeMinimumFareLine(routeMinimumFare, convertCurrency(calculateDistanceFare(distanceKm, pricing), pricing.currency, 'RMB', exchangeRate), exchangeRate).map(line => ({
          ...line,
          unitAmount: convertCurrency(line.unitAmount, 'RMB', currency, exchangeRate),
          totalAmount: convertCurrency(line.totalAmount, 'RMB', currency, exchangeRate),
          currency: currencyLabels[currency]
        })),
        ...requestedExtras.map(selection => {
          const extra = extraById.get(selection.id)!
          const unitAmount = convertCurrency(extra.price, extra.currency, currency, exchangeRate)
          return {
            type: 'EXTRA' as const,
            sourceId: extra.id,
            label: extra.label,
            quantity: selection.quantity,
            unitAmount,
            totalAmount: roundMoney(unitAmount * selection.quantity),
            currency: currencyLabels[currency]
          }
        })
      ].map((line, index) => ({ ...line, order: index + 1 }))
      const subtotal = roundMoney(lines.reduce((total, line) => total + line.totalAmount, 0))
      const now = new Date()
      const couponCode = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : ''
      let membershipLevel = typeof body.membershipLevel === 'string' ? body.membershipLevel.trim() : ''
      if (typeof body.userId === 'string' && body.userId.trim()) membershipLevel = (await tx.user.findUnique({ where: { id: body.userId.trim() }, select: { membershipLevel: true } }))?.membershipLevel || ''
      const promotions = await tx.promotion.findMany({ where: { enabled: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] } })
      await tx.promotionUsage.updateMany({ where: { status: 'RESERVED', quote: { expiresAt: { lte: now } } }, data: { status: 'RELEASED', releasedAt: now } })
      const reservedCounts = new Map(await Promise.all(promotions.filter(promotion => promotion.kind === 'COUPON').map(async promotion => [
        promotion.id,
        await tx.promotionUsage.count({ where: { promotionId: promotion.id, status: 'RESERVED' } })
      ] as const)))
      const eligiblePromotions = promotions.filter(promotion => {
        if (promotion.kind === 'COUPON' && (!couponCode || promotion.couponCode !== couponCode || (promotion.usageLimit !== null && promotion.usageCount + (reservedCounts.get(promotion.id) || 0) >= promotion.usageLimit))) return false
        if (promotion.kind === 'MEMBER' && (!membershipLevel || promotion.membershipLevel !== membershipLevel)) return false
        if (!promotionMatchesContext(promotion, { originRegion, originCity, destinationRegion, destinationCity, scheduledAt: scheduledAtValue })) return false
        if (promotion.kind === 'CAMPAIGN' || promotion.kind === 'COUPON' || promotion.kind === 'MEMBER') {
          const minimumSpend = convertCurrency(promotion.minimumSpend, promotion.currency, currency, exchangeRate)
          return subtotal >= minimumSpend
        }
        return false
      })
      const promotionDiscounts = eligiblePromotions.map(promotion => {
        const rawDiscount = promotion.discountType === 'PERCENTAGE'
          ? subtotal * promotion.discountValue / 100
          : promotion.discountType === 'TOTAL_PRICE'
            ? Math.max(0, subtotal - convertCurrency(promotion.discountValue, promotion.currency, currency, exchangeRate))
            : convertCurrency(promotion.discountValue, promotion.currency, currency, exchangeRate)
        const maximumDiscount = promotion.maximumDiscount === null ? null : convertCurrency(promotion.maximumDiscount, promotion.currency, currency, exchangeRate)
        const discount = roundMoney(Math.min(subtotal, maximumDiscount === null ? rawDiscount : Math.min(rawDiscount, maximumDiscount)))
        return { promotion, discount, discountItems: [{ promotion, discount }] }
      })
      const combinations = couponCode ? promotionDiscounts.flatMap((first, index) => promotionDiscounts
        .slice(index + 1)
        .map(second => {
          const canStack = first.promotion.stackingMode === 'ALL' || second.promotion.stackingMode === 'ALL'
            || first.promotion.stackingMode === 'PERCENTAGE_AND_VOUCHER' && second.promotion.kind === 'COUPON'
            || second.promotion.stackingMode === 'PERCENTAGE_AND_VOUCHER' && first.promotion.kind === 'COUPON'
          if (!canStack || first.promotion.discountType === 'TOTAL_PRICE' || second.promotion.discountType === 'TOTAL_PRICE') return []
          const ordered = [first, second].sort((a, b) => {
            if (a.promotion.discountType === 'PERCENTAGE' && b.promotion.discountType !== 'PERCENTAGE') return -1
            if (b.promotion.discountType === 'PERCENTAGE' && a.promotion.discountType !== 'PERCENTAGE') return 1
            return 0
          })
          let remaining = subtotal
          let discount = 0
          const discountItems: Array<{ promotion: typeof first.promotion; discount: number }> = []
          for (const item of ordered) {
            const rawDiscount = item.promotion.discountType === 'PERCENTAGE'
              ? remaining * item.promotion.discountValue / 100
              : convertCurrency(item.promotion.discountValue, item.promotion.currency, currency, exchangeRate)
            const maximumDiscount = item.promotion.maximumDiscount === null ? null : convertCurrency(item.promotion.maximumDiscount, item.promotion.currency, currency, exchangeRate)
            const appliedDiscount = roundMoney(Math.min(remaining, maximumDiscount === null ? rawDiscount : Math.min(rawDiscount, maximumDiscount)))
            discount = roundMoney(discount + appliedDiscount)
            remaining = roundMoney(remaining - appliedDiscount)
           discountItems.push({ promotion: item.promotion, discount: appliedDiscount })
          }
          return [{
            promotion: first.promotion,
            secondaryPromotion: second.promotion,
            discount,
            discountItems
          }]
        }).flat()) : []
      const applicableDiscounts = [
        ...promotionDiscounts.map(item => ({ ...item, secondaryPromotion: null })),
        ...combinations
      ]
      const applied = applicableDiscounts
        .sort((a, b) => b.discount - a.discount || (b.promotion.priority - a.promotion.priority))[0]
      const quotedLines = applied && applied.discount > 0
        ? [...lines, ...applied.discountItems.filter(item => item.discount > 0).map((item, index) => ({
            type: 'DISCOUNT' as const,
            sourceId: item.promotion.id,
            label: item.promotion.name,
            quantity: 1,
            unitAmount: -item.discount,
            totalAmount: -item.discount,
            currency: currencyLabels[currency],
            order: lines.length + index + 1
          }))]
        : lines
      const reservedPromotions = [applied?.promotion, applied?.secondaryPromotion].filter((promotion): promotion is NonNullable<typeof applied>['promotion'] => Boolean(promotion && promotion.kind === 'COUPON'))
      const total = roundMoney(subtotal - (applied?.discount || 0))
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
              routeMinimumFare: routeMinimumFare ? convertCurrency(routeMinimumFare.minimumFare, routeMinimumFare.currency, currency, exchangeRate) : null,
              routeOriginRegion: routeMinimumFare ? originRegion : null,
              routeOriginCity: routeMinimumFare ? originCity || null : null,
              routeDestinationRegion: routeMinimumFare ? destinationRegion : null,
              routeDestinationCity: routeMinimumFare ? destinationCity || null : null,
              currency: pricing.currency,
              tiers: {
                create: pricing.tiers.map(tier => ({
                  sourceTierId: tier.id,
                  fromKm: tier.fromKm,
                  toKm: tier.toKm,
                  pricePerKm: tier.pricePerKm,
                  order: tier.order
                }))
              }
            }
          },
          vehicle: {
            create: {
              vehicleId: vehicle.id,
              categoryId: vehicle.categoryId,
              brand: vehicle.brand,
              model: vehicle.model,
              series: vehicle.series,
              seats: vehicle.seats,
              image: vehicle.image,
              colorLabel: vehicle.colorLabel,
              modelChoiceLabel: vehicle.modelChoiceLabel
            }
          },
          lines: { create: quotedLines },
          promotionUsages: { create: reservedPromotions.map(promotion => ({ promotionId: promotion.id })) }
        },
        include: {
          pricing: { include: { tiers: { orderBy: { order: 'asc' } } } },
          vehicle: true,
          lines: { orderBy: { order: 'asc' } }
        }
      })
    })
    return quoteResponse(quote)
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const quote = await prisma.fareQuote.findUnique({
      where: { id },
      include: {
        pricing: { include: { tiers: { orderBy: { order: 'asc' } } } },
        vehicle: true,
        lines: { orderBy: { order: 'asc' } }
      }
    })
    if (!quote) throw new HttpException('Quote not found', HttpStatus.NOT_FOUND)
    if (quote.expiresAt && quote.expiresAt.getTime() <= Date.now()) throw new HttpException('Quote has expired', HttpStatus.GONE)
    return quoteResponse(quote)
  }

  @Post(':id/consume')
  async consume(@Param('id') id: string) {
    const now = new Date()
    return prisma.$transaction(async tx => {
      const quote = await tx.fareQuote.findUnique({ where: { id }, include: { promotionUsages: true } })
      if (!quote) throw new HttpException('Quote not found', HttpStatus.NOT_FOUND)
      if (quote.expiresAt && quote.expiresAt <= now) throw new HttpException('Quote has expired', HttpStatus.GONE)
      for (const usage of quote.promotionUsages.filter(item => item.status === 'RESERVED')) {
        await tx.promotionUsage.update({ where: { id: usage.id }, data: { status: 'USED', usedAt: now } })
        await tx.promotion.update({ where: { id: usage.promotionId }, data: { usageCount: { increment: 1 } } })
      }
      return { ok: true, quoteId: id }
    })
  }

  @Post(':id/release')
  async release(@Param('id') id: string) {
    const result = await prisma.promotionUsage.updateMany({ where: { quoteId: id, status: 'RESERVED' }, data: { status: 'RELEASED', releasedAt: new Date() } })
    return { ok: true, quoteId: id, released: result.count }
  }
}
@Controller('recommended-addresses')
class RecommendedAddressesController {
  @Get('mainland-cities') async listCities() {
    return { data: await prisma.mainlandCity.findMany({ where: { enabled: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }) }
  }
  @Get() async list() {
    const data = await prisma.recommendedAddress.findMany({
      where: { enabled: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    return { data: data.map(recommendedAddressResponse) }
  }
}
@Controller('settings')
class SettingsController {
  @Get() async get() { return appSettingsResponse(await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })) }
  @Post() async update(@Req() req: RequestLike, @Body() body: { language?: string; region?: string; currency?: string; pricingCurrency?: string; exchangeRate?: number; adminLogo?: string | null; severeWeatherEnabled?: boolean; driverRaceEnabled?: boolean; fareBalancePayEnabled?: boolean; cashBalancePayEnabled?: boolean; wechatPayEnabled?: boolean; alipayPayEnabled?: boolean; bankCardPayEnabled?: boolean; sandboxMode?: boolean }) {
    const session = requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
    if (body.adminLogo !== undefined && session.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only super administrators may update the logo')
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    const pricingCurrency = body.pricingCurrency && ['HKD', 'RMB'].includes(body.pricingCurrency) ? body.pricingCurrency : settings.pricingCurrency
    const data = {
        language: body.language || settings.language,
        region: body.region || settings.region,
        currency: body.currency && ['HKD', 'RMB'].includes(body.currency) ? body.currency : settings.currency,
        pricingCurrency,
        exchangeRate: body.exchangeRate !== undefined && Number.isFinite(Number(body.exchangeRate)) && Number(body.exchangeRate) > 0 ? Number(body.exchangeRate) : settings.exchangeRate,
        adminLogo: body.adminLogo === undefined ? settings.adminLogo : body.adminLogo === null ? null : validateAdminLogo(body.adminLogo),
        severeWeatherEnabled: body.severeWeatherEnabled ?? settings.severeWeatherEnabled,
        driverRaceEnabled: body.driverRaceEnabled ?? settings.driverRaceEnabled,
        fareBalancePayEnabled: body.fareBalancePayEnabled ?? settings.fareBalancePayEnabled,
        cashBalancePayEnabled: body.cashBalancePayEnabled ?? settings.cashBalancePayEnabled,
        wechatPayEnabled: body.wechatPayEnabled ?? settings.wechatPayEnabled,
        alipayPayEnabled: body.alipayPayEnabled ?? settings.alipayPayEnabled,
        bankCardPayEnabled: body.bankCardPayEnabled ?? settings.bankCardPayEnabled,
        sandboxMode: body.sandboxMode ?? settings.sandboxMode
      }
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.appSetting.update({ where: { id: settings.id }, data })
      if (pricingCurrency !== settings.pricingCurrency) {
        const label = configuredCurrencyLabel({ pricingCurrency })
        await Promise.all([
          tx.categoryDistancePricing.updateMany({ data: { currency: label } }),
          tx.vehicleExtra.updateMany({ data: { currency: label } }),
          tx.routeMinimumFare.updateMany({ data: { currency: label } }),
          tx.promotion.updateMany({ data: { currency: label } })
        ])
      }
      return result
    })
    addAudit(req, 'SUCCESS')
    return appSettingsResponse(updated)
  }
}
@Controller('location')
class LocationController {
  private getAmapKey() {
    const key = process.env.AMAP_WEB_SERVICE_KEY
    if (!key) throw new HttpException('AMap Web Service is not configured', HttpStatus.SERVICE_UNAVAILABLE)
    return key
  }

  private async requestAmap<T>(path: string, params: URLSearchParams): Promise<T> {
    params.set('key', this.getAmapKey())
    const response = await fetch(`https://restapi.amap.com${path}?${params}`)
    const data = await response.json() as T & { status?: string; info?: string }
    if (!response.ok || data.status !== '1') {
      throw new HttpException(data.info || 'Unable to query AMap', HttpStatus.BAD_GATEWAY)
    }
    return data
  }

  @Get('flight-information')
  async flightInformation(@Req() req: RequestLike) {
    const date = req.query?.date || ''
    const arrival = req.query?.arrival === 'true'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpException('Valid date is required', HttpStatus.BAD_REQUEST)
    }
    const url = `https://www.hongkongairport.com/flightinfo-rest/rest/flights/past?date=${encodeURIComponent(date)}&lang=en&cargo=false&arrival=${arrival}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new HttpException('Unable to query HKIA flight information', HttpStatus.BAD_GATEWAY)
    }
    const payload = await response.json() as Array<{ list?: Array<Record<string, unknown>> }>
    return payload.flatMap(day => (day.list || []).map(item => ({
      time: item.time || '--:--',
      status: item.status || 'Status unavailable',
      flight: item.flight || [],
      destination: item.destination || [],
      origin: item.origin || [],
      baggage: item.baggage || null,
      hall: item.hall || null,
      stand: item.stand || null,
      terminal: item.terminal || '',
      gate: item.gate || ''
    })))
  }

  @Get('flight-information/lookup')
  async lookupFlight(@Req() req: RequestLike) {
    const flightNumber = (req.query?.flightNumber || '').replace(/\s+/g, '').toUpperCase()
    const date = req.query?.date || ''
    if (!/^[A-Z0-9]{2,8}$/.test(flightNumber) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpException('Valid flightNumber and date are required', HttpStatus.BAD_REQUEST)
    }
    const fetchDirection = async (arrival: boolean) => {
      const url = `https://www.hongkongairport.com/flightinfo-rest/rest/flights/past?date=${encodeURIComponent(date)}&lang=en&cargo=false&arrival=${arrival}`
      const response = await fetch(url)
      if (!response.ok) throw new HttpException('Unable to query HKIA flight information', HttpStatus.BAD_GATEWAY)
      return await response.json() as Array<{ date?: string; arrival?: boolean; list?: Array<{ time?: string; status?: string; flight?: Array<{ no?: string }>; origin?: string[]; destination?: string[] }> }>
    }
    const [arrivals, departures] = await Promise.all([fetchDirection(true), fetchDirection(false)])
    const matches: Array<{ direction: 'arrival' | 'departure'; item: NonNullable<typeof arrivals[number]['list']>[number] }> = []
    for (const day of arrivals) for (const item of day.list || []) if ((item.flight || []).some(flight => (flight.no || '').replace(/\s+/g, '').toUpperCase() === flightNumber)) matches.push({ direction: 'arrival', item })
    for (const day of departures) for (const item of day.list || []) if ((item.flight || []).some(flight => (flight.no || '').replace(/\s+/g, '').toUpperCase() === flightNumber)) matches.push({ direction: 'departure', item })
    if (matches.length === 0) throw new HttpException('找不到指定日期的航班', HttpStatus.NOT_FOUND)
    if (matches.length > 1) throw new HttpException('航班資料有多個匹配結果，請確認航班方向', HttpStatus.CONFLICT)
    const match = matches[0]
    const code = match.direction === 'arrival' ? match.item.origin?.[0] : match.item.destination?.[0]
    if (!code) throw new HttpException('航班機場資料不完整', HttpStatus.BAD_GATEWAY)
    const airportMetadata: Record<string, Omit<FlightAirport, 'iata'>> = {
      HKG: { name: '香港國際機場', city: '香港', latitude: 22.308, longitude: 113.9185 },
      SHA: { name: '上海虹橋國際機場', city: '上海', latitude: 31.1979, longitude: 121.3363 },
      PVG: { name: '上海浦東國際機場', city: '上海', latitude: 31.1443, longitude: 121.8083 },
      PKX: { name: '北京大興國際機場', city: '北京', latitude: 39.5098, longitude: 116.4105 },
      CAN: { name: '廣州白雲國際機場', city: '廣州', latitude: 23.3924, longitude: 113.2988 },
      SZX: { name: '深圳寶安國際機場', city: '深圳', latitude: 22.6393, longitude: 113.8107 },
      MFM: { name: '澳門國際機場', city: '澳門', latitude: 22.1496, longitude: 113.5916 },
      TPE: { name: '桃園國際機場', city: '桃園', latitude: 25.0797, longitude: 121.2342 },
      ICN: { name: '仁川國際機場', city: '首爾', latitude: 37.4602, longitude: 126.4407 },
      NRT: { name: '成田國際機場', city: '東京', latitude: 35.772, longitude: 140.3929 },
      KIX: { name: '關西國際機場', city: '大阪', latitude: 34.4347, longitude: 135.244 },
      SIN: { name: '新加坡樟宜機場', city: '新加坡', latitude: 1.3644, longitude: 103.9915 },
      BKK: { name: '蘇凡納布國際機場', city: '曼谷', latitude: 13.6900, longitude: 100.7501 },
      MNL: { name: '尼諾伊·阿基諾國際機場', city: '馬尼拉', latitude: 14.5086, longitude: 121.0198 },
      CDG: { name: '巴黎戴高樂機場', city: '巴黎', latitude: 49.0097, longitude: 2.5479 },
      LAX: { name: '洛杉磯國際機場', city: '洛杉磯', latitude: 33.9416, longitude: -118.4085 },
      SYD: { name: '悉尼機場', city: '悉尼', latitude: -33.9399, longitude: 151.1753 }
    }
    const airport = (iata: string): FlightAirport => ({
      iata,
      ...(airportMetadata[iata] || { name: iata, city: iata, latitude: null, longitude: null })
    })
    const origin = match.direction === 'arrival' ? airport(code) : airport('HKG')
    const destination = match.direction === 'arrival' ? airport('HKG') : airport(code)
    return { flightNumber, direction: match.direction, status: match.item.status || '', scheduledTime: match.item.time || '', origin, destination }
  }

  @Get('reverse-geocode')
  async reverseGeocode(@Req() req: RequestLike) {
    const latitude = Number(req.query?.latitude)
    const longitude = Number(req.query?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new HttpException('Valid latitude and longitude are required', HttpStatus.BAD_REQUEST)
    }
    const params = new URLSearchParams({ location: `${longitude},${latitude}`, extensions: 'all' })
    const data = await this.requestAmap<{ regeocode?: { formatted_address?: string; addressComponent?: { city?: string | string[]; province?: string; district?: string }; pois?: Array<{ name?: string; distance?: string }> } }>('/v3/geocode/regeo', params)
    if (!data.regeocode) throw new HttpException('Unable to resolve location', HttpStatus.BAD_GATEWAY)
    const component = data.regeocode.addressComponent
    const city = typeof component?.city === 'string' ? component.city : component?.province || ''
    return {
      city,
      district: component?.district || '',
      address: data.regeocode.formatted_address || '',
      landmark: data.regeocode.pois?.[0]?.name || ''
    }
  }

  @Get('search')
  async search(@Req() req: RequestLike) {
    const keyword = req.query?.keyword?.trim()
    if (!keyword) throw new HttpException('A search keyword is required', HttpStatus.BAD_REQUEST)
    const params = new URLSearchParams({ keywords: keyword, offset: '20', page: '1', extensions: 'base' })
    const region = req.query?.region
    if (region === '香港') params.set('city', '香港')
    else if (region === '澳門') params.set('city', '澳門')
    else if (region === '大陸' && req.query?.city?.trim()) params.set('city', req.query.city.trim())
    const data = await this.requestAmap<{ pois?: Array<{ id?: string; name?: string; address?: string | string[]; location?: string; pname?: string; cityname?: string; adname?: string }> }>('/v3/place/text', params)
    const pois = data.pois || []
    const mainlandPois = pois.filter((poi) => {
      const area = `${poi.pname || ''}${poi.cityname || ''}`
      return area.includes('广东') || area.includes('廣東')
    })
    const supportedPois = pois.filter((poi) => {
      const area = `${poi.pname || ''}${poi.cityname || ''}`
      return area.includes('广东') || area.includes('廣東') || area.includes('香港') || area.includes('澳門') || area.includes('澳门')
    })
    if (!region && pois.length > 0 && supportedPois.length === 0) {
      throw new HttpException('未開通服務', HttpStatus.FORBIDDEN)
    }
    const results = (region === '大陸' ? mainlandPois : !region ? supportedPois : pois).flatMap((poi, index) => {
      const [longitude, latitude] = (poi.location || '').split(',').map(Number)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
      const area = `${poi.pname || ''}${poi.cityname || ''}`
      const region = area.includes('香港') ? '香港' : area.includes('澳門') || area.includes('澳门') ? '澳門' : '大陸'
      const rawAddress = Array.isArray(poi.address) ? poi.address.join('') : poi.address || ''
      const address = region === '香港'
        ? `${poi.adname || ''}-${rawAddress}`
        : region === '澳門'
          ? `${poi.adname || ''}-${rawAddress}`
          : `${poi.cityname || ''}-${poi.adname || ''}-${rawAddress}`
      return [{
        id: poi.id || `${longitude},${latitude},${index}`,
        name: poi.name || keyword,
        address,
        displayAddress: formattedAddress(region, address),
        region,
        city: poi.cityname || '',
        district: poi.adname || '',
        landmark: poi.name || '',
        latitude,
        longitude
      }]
    })
    if (results.length > 0) return { data: results }

    const geocodeParams = new URLSearchParams({ address: keyword })
    if (region === '香港') geocodeParams.set('city', '香港')
    else if (region === '澳門') geocodeParams.set('city', '澳門')
    else if (region === '大陸' && req.query?.city?.trim()) geocodeParams.set('city', req.query.city.trim())
    const geocode = await this.requestAmap<{ geocodes?: Array<{ formatted_address?: string; location?: string; level?: string; country?: string; province?: string; city?: string | string[]; district?: string }> }>('/v3/geocode/geo', geocodeParams)
    const fallbackResults = (geocode.geocodes || []).flatMap((item, index) => {
      const [longitude, latitude] = (item.location || '').split(',').map(Number)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
      const city = typeof item.city === 'string' ? item.city : item.province || ''
      const area = `${item.province || ''}${city}`
      const resultRegion: AddressRegion = area.includes('香港') ? '香港' : area.includes('澳門') || area.includes('澳门') ? '澳門' : '大陸'
      if (region && resultRegion !== region) return []
      const address = item.formatted_address || keyword
      return [{
        id: `${longitude},${latitude},geocode-${index}`,
        name: keyword,
        address,
        displayAddress: formattedAddress(resultRegion, address),
        region: resultRegion,
        city,
        district: item.district || '',
        landmark: keyword,
        latitude,
        longitude,
      }]
    })
    return { data: fallbackResults }
  }

  @Get('driving-route')
  async drivingRoute(@Req() req: RequestLike) {
    const coordinatePattern = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/
    const origin = req.query?.origin || ''
    const destination = req.query?.destination || ''
    if (!coordinatePattern.test(origin) || !coordinatePattern.test(destination)) {
      throw new HttpException('Valid origin and destination are required', HttpStatus.BAD_REQUEST)
    }
    const params = new URLSearchParams({ origin, destination, show_fields: 'cost,polyline' })
    const data = await this.requestAmap<{ route?: { paths?: Array<{ distance?: string; cost?: { duration?: string }; steps?: Array<{ polyline?: string }> }> } }>('/v5/direction/driving', params)
    const path = data.route?.paths?.[0]
    if (!path) throw new HttpException('No driving route was found', HttpStatus.NOT_FOUND)
    const points = (path.steps || []).flatMap(step => (step.polyline || '').split(';')).flatMap(point => {
      const [longitude, latitude] = point.split(',').map(Number)
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ latitude, longitude }] : []
    })
    return { distance: Number(path.distance) || 0, duration: Number(path.cost?.duration) || 0, points }
  }
}

interface CardIdentification { network: 'visa' | 'mastercard' | 'unionpay' | 'amex' | 'jcb' | 'unknown'; valid: boolean; maskedNumber: string }

function cardNetwork(number: string): CardIdentification['network'] {
  if (/^4/.test(number)) return 'visa'
  if (/^(5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]))/.test(number)) return 'mastercard'
  if (/^62/.test(number)) return 'unionpay'
  if (/^(34|37)/.test(number)) return 'amex'
  if (/^(352[89]|35[3-8]\d)/.test(number)) return 'jcb'
  return 'unknown'
}

function passesLuhn(number: string) {
  let sum = 0
  let alternate = false
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index])
    if (alternate) { digit *= 2; if (digit > 9) digit -= 9 }
    sum += digit
    alternate = !alternate
  }
  return sum % 10 === 0
}

@Controller('payment-cards')
class PaymentCardsController {
  @Post('identify') identify(@Body() body: { cardNumber?: string }) {
    const number = body.cardNumber?.replace(/\D/g, '') || ''
    const validLength = number.length >= 12 && number.length <= 19
    const valid = validLength && passesLuhn(number)
    return { network: valid ? cardNetwork(number) : 'unknown', valid, maskedNumber: number.length > 4 ? `${'*'.repeat(number.length - 4)}${number.slice(-4)}` : '' }
  }
}

@Controller('wallet')
class WalletController {
  @Get('me')
  async getMe(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req)
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { walletTransactions: { orderBy: { createdAt: 'desc' }, take: 50 } }
    })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    return {
      id: user.id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      countryCode: user.countryCode,
      cashBalance: user.cashBalance,
      fareBalance: user.fareBalance,
      transactions: user.walletTransactions
    }
  }

  @Post('top-up')
  async topUp(@Req() req: RequestLike, @Body() body: { amount?: number; method?: string }) {
    const session = await clientSessionFrom(req)
    const amount = roundMoney(Number(body.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpException('Valid positive top up amount is required', HttpStatus.BAD_REQUEST)
    }
    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    const userTarget = await prisma.user.findUnique({ where: { id: session.sub } })
    if (!userTarget) throw new HttpException('User not found', HttpStatus.NOT_FOUND)

    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userTarget.id } })
      const balanceAfter = roundMoney(user.fareBalance + amount)
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { fareBalance: balanceAfter }
      })
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: user.id,
          wallet: 'FARE',
          type: 'TOP_UP',
          amount,
          balanceAfter,
          reason: `車費增值 (${body.method || '在線支付'})${settings.sandboxMode ? ' [測試模式]' : ''}`
        }
      })
      return { user: userResponse(updated), transaction }
    })
    return { ok: true, ...result }
  }
}

@Controller('payments')
class PaymentsController {
  @Post('trip-pending')
  async tripPending(@Req() req: RequestLike, @Body() body: {
    quoteId?: string
    origin?: string
    destination?: string
    scheduledAt?: string
    passenger?: { name?: string; phone?: string; phoneRegion?: string; gender?: string; documentType?: string; passportCountry?: string | null }
  }) {
    const quoteId = typeof body.quoteId === 'string' ? body.quoteId.trim() : ''
    if (!quoteId) throw new HttpException('quoteId is required', HttpStatus.BAD_REQUEST)

    const session = await clientSessionFrom(req)
    const quote = await prisma.fareQuote.findUnique({ where: { id: quoteId }, include: { pricing: true } })
    if (!quote) throw new HttpException('Quote not found', HttpStatus.NOT_FOUND)
    if (quote.expiresAt && quote.expiresAt.getTime() <= Date.now()) throw new HttpException('Quote has expired', HttpStatus.GONE)

    const existingTrip = await prisma.trip.findUnique({ where: { quoteId } })
    const pendingExpiresAt = quoteExpiryDate()
    if (existingTrip) {
      if (existingTrip.userId !== session.sub) throw new ForbiddenException('Quote belongs to another user')
      if (existingTrip.status !== 'PENDING') throw new HttpException('Quote already has a paid trip', HttpStatus.CONFLICT)
      await prisma.fareQuote.update({ where: { id: quoteId }, data: { expiresAt: pendingExpiresAt } })
      return { ok: true, tripId: existingTrip.id, quoteId, status: existingTrip.status }
    }

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date(Date.now() + 3600000)
    await prisma.fareQuote.update({ where: { id: quoteId }, data: { expiresAt: pendingExpiresAt } })
    const passengerData = body.passenger?.name?.trim() && body.passenger.phone?.trim()
      ? { passengerName: body.passenger.name.trim(), passengerPhone: body.passenger.phone.trim(), passengerPhoneRegion: body.passenger.phoneRegion?.trim() || null, passengerGender: body.passenger.gender?.trim() || null, passengerDocumentType: body.passenger.documentType?.trim() || null, passengerPassportCountry: body.passenger.passportCountry?.trim() || null }
      : {}
    const trip = await prisma.trip.create({
      data: {
        userId: session.sub,
        quoteId,
        origin: body.origin?.trim() || quote.pricing?.routeOriginCity || '香港',
        destination: body.destination?.trim() || quote.pricing?.routeDestinationCity || '深圳',
        region: 'GUANGDONG',
        scheduledAt: Number.isNaN(scheduledAt.getTime()) ? new Date(Date.now() + 3600000) : scheduledAt,
        estimatedArrivalAt: new Date((Number.isNaN(scheduledAt.getTime()) ? new Date(Date.now() + 3600000) : scheduledAt).getTime() + (quote.durationSeconds || 0) * 1000),
        status: 'PENDING',
        ...passengerData
      }
    })
    return { ok: true, tripId: trip.id, quoteId, status: trip.status }
  }

  @Post('trip-pay')
  async tripPay(@Req() req: RequestLike, @Body() body: {
    quoteId?: string
    userId?: string
    useFareBalance?: boolean
    useCashBalance?: boolean
    externalPaymentMethod?: string
    origin?: string
    destination?: string
    scheduledAt?: string
    passenger?: { name?: string; phone?: string; phoneRegion?: string; gender?: string; documentType?: string; passportCountry?: string | null }
  }) {
    const quoteId = typeof body.quoteId === 'string' ? body.quoteId.trim() : ''
    if (!quoteId) throw new HttpException('quoteId is required', HttpStatus.BAD_REQUEST)

    const settings = await prisma.appSetting.findUniqueOrThrow({ where: { id: appSettingsDefaults.id } })
    let session: ClientSession
    try {
      session = await clientSessionFrom(req)
    } catch {
      const adminSession = requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
      if (!body.userId) throw new HttpException('userId is required for administrator payments', HttpStatus.BAD_REQUEST)
      session = { sub: body.userId, exp: adminSession.exp, jti: adminSession.jti }
    }
    if (body.userId && body.userId !== session.sub) {
      try {
        const adminSession = requireRole(req, ['SUPER_ADMIN', 'OPERATOR'])
        session = { sub: body.userId, exp: adminSession.exp, jti: adminSession.jti }
      } catch {
        throw new ForbiddenException('Cannot pay for another user')
      }
    }
    const userTarget = await prisma.user.findUnique({ where: { id: session.sub } })
    if (!userTarget) throw new HttpException('User not found', HttpStatus.NOT_FOUND)

    return prisma.$transaction(async tx => {
      const existingPayment = await tx.payment.findUnique({ where: { quoteId } })
      if (existingPayment) {
        if (existingPayment.userId !== userTarget.id) throw new ForbiddenException('Quote belongs to another user')
        const existingUser = await tx.user.findUniqueOrThrow({ where: { id: existingPayment.userId } })
        return {
          ok: true, tripId: existingPayment.tripId, quoteId: existingPayment.quoteId, total: existingPayment.total, currency: existingPayment.currency,
          paidSummary: { fareBalance: existingPayment.fareAmount, cashBalance: existingPayment.cashAmount, external: existingPayment.externalAmount, externalMethod: existingPayment.externalPaymentMethod },
          user: { id: existingUser.id, fareBalance: existingUser.fareBalance, cashBalance: existingUser.cashBalance }
        }
      }
      const existingPendingTrip = await tx.trip.findUnique({ where: { quoteId } })
      if (existingPendingTrip) {
        if (existingPendingTrip.userId !== userTarget.id) throw new ForbiddenException('Quote belongs to another user')
        if (existingPendingTrip.status !== 'PENDING') throw new HttpException('Trip is not awaiting payment', HttpStatus.CONFLICT)
      }
      const quote = await tx.fareQuote.findUnique({
        where: { id: quoteId },
        include: {
          pricing: true,
          vehicle: true,
          promotionUsages: true,
          lines: { orderBy: { order: 'asc' } }
        }
      })
      if (!quote) throw new HttpException('Quote not found', HttpStatus.NOT_FOUND)
      if (quote.expiresAt && quote.expiresAt.getTime() <= Date.now()) {
        throw new HttpException('Quote has expired', HttpStatus.GONE)
      }

      const totalAmount = roundMoney(quote.total)
      const useFare = body.useFareBalance !== false && settings.fareBalancePayEnabled
      const useCash = body.useCashBalance !== false && settings.cashBalancePayEnabled

      const user = await tx.user.findUniqueOrThrow({ where: { id: userTarget.id } })

      let farePaid = 0
      let cashPaid = 0

      if (useFare && user.fareBalance > 0) {
        farePaid = roundMoney(Math.min(user.fareBalance, totalAmount))
      }
      const remainingAfterFare = roundMoney(totalAmount - farePaid)

      if (useCash && remainingAfterFare > 0 && user.cashBalance > 0) {
        cashPaid = roundMoney(Math.min(user.cashBalance, remainingAfterFare))
      }
      const externalPaid = roundMoney(totalAmount - farePaid - cashPaid)

      const internalPaymentMethod = externalPaid > 0 ? 'internal' : null

      let currentFare = user.fareBalance
      let currentCash = user.cashBalance

      if (farePaid > 0) {
        currentFare = roundMoney(currentFare - farePaid)
        await tx.user.update({
          where: { id: user.id },
          data: { fareBalance: currentFare }
        })
        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            wallet: 'FARE',
            type: 'TRIP_PAYMENT',
            amount: farePaid,
            balanceAfter: currentFare,
            reason: `出行支付 - 車費餘額抵扣 (報價: ${quote.id.slice(-8)})`
          }
        })
      }

      if (cashPaid > 0) {
        currentCash = roundMoney(currentCash - cashPaid)
        await tx.user.update({
          where: { id: user.id },
          data: { cashBalance: currentCash }
        })
        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            wallet: 'CASH',
            type: 'TRIP_PAYMENT',
            amount: cashPaid,
            balanceAfter: currentCash,
            reason: `出行支付 - 現金餘額抵扣 (報價: ${quote.id.slice(-8)})`
          }
        })
      }

      // Consume promotions attached to quote
      const now = new Date()
      for (const usage of quote.promotionUsages.filter(item => item.status === 'RESERVED')) {
        await tx.promotionUsage.update({ where: { id: usage.id }, data: { status: 'USED', usedAt: now } })
        await tx.promotion.update({ where: { id: usage.promotionId }, data: { usageCount: { increment: 1 } } })
      }

      // Create or confirm Trip record
      const origin = body.origin || quote.pricing?.routeOriginCity || '香港'
      const destination = body.destination || quote.pricing?.routeDestinationCity || '深圳'
      const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date(Date.now() + 3600000)
      const passengerData = body.passenger?.name?.trim() && body.passenger.phone?.trim()
        ? { passengerName: body.passenger.name.trim(), passengerPhone: body.passenger.phone.trim(), passengerPhoneRegion: body.passenger.phoneRegion?.trim() || null, passengerGender: body.passenger.gender?.trim() || null, passengerDocumentType: body.passenger.documentType?.trim() || null, passengerPassportCountry: body.passenger.passportCountry?.trim() || null }
        : {}

      const trip = existingPendingTrip
        ? await tx.trip.update({
            where: { id: existingPendingTrip.id },
            data: {
              origin,
              destination,
              scheduledAt: Number.isNaN(scheduledAt.getTime()) ? existingPendingTrip.scheduledAt : scheduledAt,
              estimatedArrivalAt: new Date((Number.isNaN(scheduledAt.getTime()) ? existingPendingTrip.scheduledAt : scheduledAt).getTime() + (quote.durationSeconds || 0) * 1000),
              status: 'CONFIRMED',
              ...passengerData,
              fareBalancePaid: farePaid,
              cashBalancePaid: cashPaid,
              externalPaid,
              externalPaymentMethod: internalPaymentMethod
            }
          })
        : await tx.trip.create({
            data: {
              userId: user.id,
              quoteId: quote.id,
              origin,
              destination,
              region: 'GUANGDONG',
              scheduledAt: Number.isNaN(scheduledAt.getTime()) ? new Date() : scheduledAt,
              estimatedArrivalAt: new Date((Number.isNaN(scheduledAt.getTime()) ? new Date() : scheduledAt).getTime() + (quote.durationSeconds || 0) * 1000),
              status: 'CONFIRMED',
              ...passengerData,
              fareBalancePaid: farePaid,
              cashBalancePaid: cashPaid,
              externalPaid,
              externalPaymentMethod: internalPaymentMethod
            }
          })
      const payment = await tx.payment.create({
        data: {
          tripId: trip.id,
          quoteId: quote.id,
          userId: user.id,
          total: totalAmount,
          currency: quote.currency,
          fareAmount: farePaid,
          cashAmount: cashPaid,
          externalAmount: externalPaid,
          externalPaymentMethod: internalPaymentMethod,
          externalReference: externalPaid > 0 ? `internal-${randomBytes(8).toString('hex')}` : null
        }
      })
      await tx.walletTransaction.updateMany({
        where: { userId: user.id, paymentId: null, reason: { contains: quote.id.slice(-8) } },
        data: { paymentId: payment.id }
      })

      return {
        ok: true,
        tripId: trip.id,
        quoteId: quote.id,
        total: totalAmount,
        currency: quote.currency,
        paidSummary: {
          fareBalance: farePaid,
          cashBalance: cashPaid,
          external: externalPaid,
          externalMethod: internalPaymentMethod
        },
        user: {
          id: user.id,
          fareBalance: currentFare,
          cashBalance: currentCash
        }
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }
}

function clientTripResponse(trip: Prisma.TripGetPayload<{ include: { user: { select: { name: true; displayName: true; gender: true; countryCode: true; phoneNumber: true } }; payment: true; quote: { select: { expiresAt: true; total: true; currency: true; lines: true; vehicle: true; pricing: { select: { categoryName: true } } } } } }>) {
  const paymentExpiresAt = trip.status === 'PENDING' ? trip.quote?.expiresAt || null : null
  const vehicle = trip.quote?.vehicle
  const vehicleCategoryName = trip.quote?.pricing?.categoryName || null
  const rawName = (trip.passengerName || trip.user.displayName || trip.user.name || '').trim()
  const passengerName = rawName || '—'
  const passengerPhone = trip.passengerPhone || trip.user.phoneNumber
  return {
    id: trip.id,
    quoteId: trip.quoteId,
    origin: trip.origin,
    destination: trip.destination,
    region: trip.region,
    scheduledAt: trip.scheduledAt.toISOString(),
    estimatedArrivalAt: trip.estimatedArrivalAt?.toISOString() || null,
    passenger: {
      name: passengerName,
      gender: trip.passengerGender || trip.user.gender || null,
      countryCode: trip.passengerPhoneRegion || trip.user.countryCode,
      phoneNumber: passengerPhone
    },
    paymentExpiresAt: paymentExpiresAt?.toISOString() || null,
    quote: trip.quote ? {
      total: trip.quote.total,
      currency: trip.quote.currency,
      lines: trip.quote.lines
    } : null,
    vehicle: vehicle ? {
      id: vehicle.vehicleId,
      categoryId: vehicle.categoryId,
      categoryName: vehicleCategoryName,
      brand: vehicle.brand,
      model: vehicle.model,
      series: vehicle.series,
      seats: vehicle.seats,
      modelChoiceLabel: vehicle.modelChoiceLabel
    } : null,
    executionPhase: trip.executionPhase || null,
    driver: trip.driverName || trip.driverPhone || trip.vehiclePlate ? {
      name: trip.driverName || '—',
      phone: trip.driverPhone || '—',
      vehiclePlate: trip.vehiclePlate || '—'
    } : null,
    assignedAt: trip.assignedAt?.toISOString() || null,
    acceptedAt: trip.acceptedAt?.toISOString() || null,
    arrivedAt: trip.arrivedAt?.toISOString() || null,
    startedAt: trip.startedAt?.toISOString() || null,
    completedAt: trip.completedAt?.toISOString() || null,
    status: trip.status,
    createdAt: trip.createdAt.toISOString(),
    payment: trip.payment ? {
      id: trip.payment.id,
      total: trip.payment.total,
      currency: trip.payment.currency,
      status: trip.payment.status,
      fareAmount: trip.payment.fareAmount,
      cashAmount: trip.payment.cashAmount,
      externalAmount: trip.payment.externalAmount,
      externalPaymentMethod: trip.payment.externalPaymentMethod,
      createdAt: trip.payment.createdAt.toISOString()
    } : null
  }
}

@Controller('client')
class ClientOrdersController {
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^image\/(png|jpeg|webp|gif)$/.test(file.mimetype)) }))
  async uploadAvatar(@Req() req: RequestLike, @UploadedFile() file?: Express.Multer.File) {
    const session = await clientSessionFrom(req)
    if (!file) throw new HttpException('只接受圖片檔案', HttpStatus.BAD_REQUEST)
    const extension = extname(file.originalname).toLowerCase() || '.jpg'
    const filename = `${session.sub}-${Date.now()}${extension}`
    const uploadDir = join(process.cwd(), 'uploads', 'avatars')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), file.buffer)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
    const host = req.headers.host || '127.0.0.1:3010'
    const avatarUrl = `${protocol}://${host}/uploads/avatars/${filename}`
    const user = await prisma.user.update({ where: { id: session.sub }, data: { avatarUrl } })
    return userResponse(user)
  }

  @Get('me')
  async getProfile(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req)
    const user = await prisma.user.findUnique({ where: { id: session.sub } })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    return userResponse(user)
  }

  @Patch('me')
  async updateProfile(@Req() req: RequestLike, @Body() body: { name?: string; displayName?: string; avatarUrl?: string; email?: string; password?: string; gender?: string; region?: string; birthday?: string }) {
    const session = await clientSessionFrom(req)
    const name = body.name?.trim() || null
    const displayName = body.displayName?.trim() || null
    const avatarUrl = body.avatarUrl?.trim() || null
    const email = parseProfileEmail(body.email)
    const birthday = parseBirthday(body.birthday)
    const password = body.password?.trim() || ''
    const gender = body.gender?.trim() || null
    const region = body.region?.trim() || null
    if (name && name.length > 100 || displayName && displayName.length > 100 || password && (password.length < 8 || password.length > 200) || gender && gender.length > 30 || region && region.length > 100) throw new HttpException('Invalid profile fields', HttpStatus.BAD_REQUEST)
    const user = await prisma.user.update({ where: { id: session.sub }, data: { name, displayName, avatarUrl, email, ...(password ? { passwordHash: hashPassword(password) } : {}), gender, region, birthday } })
    return userResponse(user)
  }

  @Get('common-passengers')
  async listCommonPassengers(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req)
    return { data: await prisma.commonPassenger.findMany({ where: { userId: session.sub }, orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] }) }
  }

  @Post('common-passengers')
  async createCommonPassenger(@Req() req: RequestLike, @Body() body: { name?: string; phone?: string; phoneRegion?: string; gender?: string; documentType?: string; passportCountry?: string; isDefault?: boolean }) {
    const session = await clientSessionFrom(req)
    const value = validateCommonPassenger(body)
    const count = await prisma.commonPassenger.count({ where: { userId: session.sub } })
    if (value.isDefault || count === 0) await prisma.commonPassenger.updateMany({ where: { userId: session.sub }, data: { isDefault: false } })
    return prisma.commonPassenger.create({ data: { ...value, userId: session.sub, isDefault: value.isDefault || count === 0, sortOrder: count } })
  }

  @Patch('common-passengers/:id')
  async updateCommonPassenger(@Req() req: RequestLike, @Param('id') id: string, @Body() body: { name?: string; phone?: string; phoneRegion?: string; gender?: string; documentType?: string; passportCountry?: string; isDefault?: boolean }) {
    const session = await clientSessionFrom(req)
    const existing = await prisma.commonPassenger.findFirst({ where: { id, userId: session.sub } })
    if (!existing) throw new HttpException('Common passenger not found', HttpStatus.NOT_FOUND)
    const value = validateCommonPassenger(body, existing)
    if (value.isDefault) await prisma.commonPassenger.updateMany({ where: { userId: session.sub, id: { not: id } }, data: { isDefault: false } })
    return prisma.commonPassenger.update({ where: { id }, data: value })
  }

  @Delete('common-passengers/:id')
  async deleteCommonPassenger(@Req() req: RequestLike, @Param('id') id: string) {
    const session = await clientSessionFrom(req)
    const existing = await prisma.commonPassenger.findFirst({ where: { id, userId: session.sub } })
    if (!existing) throw new HttpException('Common passenger not found', HttpStatus.NOT_FOUND)
    await prisma.commonPassenger.delete({ where: { id } })
    if (existing.isDefault) {
      const replacement = await prisma.commonPassenger.findFirst({ where: { userId: session.sub }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
      if (replacement) await prisma.commonPassenger.update({ where: { id: replacement.id }, data: { isDefault: true } })
    }
    return { ok: true }
  }

  async getSecurity(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req)
    return clientSecurityResponse(await prisma.user.findUniqueOrThrow({ where: { id: session.sub }, include: { authIdentities: true } }))
  }

  @Post('security/phone/request')
  async requestPhoneChange(@Req() req: RequestLike, @Body() body: { countryCode?: string; phoneNumber?: string }) {
    const session = await clientSessionFrom(req)
    const identity = parsePhoneIdentity(body)
    const duplicate = await prisma.user.findFirst({ where: { countryCode: identity.countryCode, phoneNumber: identity.phoneNumber, id: { not: session.sub } }, select: { id: true } })
    if (duplicate) throw new HttpException('Phone number is already connected', HttpStatus.CONFLICT)
    const code = '00000'
    const challengeId = randomBytes(18).toString('hex')
    const exp = Date.now() + PHONE_CODE_TTL_MS
    clientPhoneChangeChallenges.set(challengeId, { ...identity, code, exp, attempts: 0, userId: session.sub })
    await prisma.verificationCode.create({ data: { id: challengeId, userId: session.sub, countryCode: identity.countryCode, phoneNumber: identity.phoneNumber, codeHash: createHash('sha256').update(code).digest('hex'), expiresAt: new Date(exp), purpose: 'PHONE_CHANGE' } })
    return { challengeId, expiresAt: new Date(exp).toISOString(), ...(process.env.NODE_ENV !== 'production' ? { developmentCode: code } : {}) }
  }

  @Post('security/phone/verify')
  async verifyPhoneChange(@Req() req: RequestLike, @Body() body: { challengeId?: string; code?: string }) {
    const session = await clientSessionFrom(req)
    const challengeId = body.challengeId?.trim() || ''
    const challenge = clientPhoneChangeChallenges.get(challengeId)
    if (!challenge || challenge.userId !== session.sub || challenge.exp <= Date.now()) {
      clientPhoneChangeChallenges.delete(challengeId)
      throw new UnauthorizedException('Verification code expired')
    }
    if ((body.code?.trim() || '') !== challenge.code) {
      challenge.attempts += 1
      if (challenge.attempts >= PHONE_CODE_MAX_ATTEMPTS) clientPhoneChangeChallenges.delete(challengeId)
      throw new UnauthorizedException('Invalid verification code')
    }
    const duplicate = await prisma.user.findFirst({ where: { countryCode: challenge.countryCode, phoneNumber: challenge.phoneNumber, id: { not: session.sub } } })
    if (duplicate) throw new HttpException('Phone number is already connected', HttpStatus.CONFLICT)
    clientPhoneChangeChallenges.delete(challengeId)
    await prisma.verificationCode.updateMany({ where: { id: challengeId }, data: { status: 'VERIFIED', consumedAt: new Date() } })
    const user = await prisma.user.update({ where: { id: session.sub }, data: { countryCode: challenge.countryCode, phoneNumber: challenge.phoneNumber }, include: { authIdentities: true } })
    return clientSecurityResponse(user)
  }
  @Patch('security')
  async updateSecurity(@Req() req: RequestLike, @Body() body: { email?: string; password?: string }) {
    const session = await clientSessionFrom(req)
    const email = parseProfileEmail(body.email)
    const password = body.password?.trim() || ''
    if (password && (password.length < 8 || password.length > 200)) throw new HttpException('Invalid security fields', HttpStatus.BAD_REQUEST)
    const user = await prisma.user.update({ where: { id: session.sub }, data: { email, ...(password ? { passwordHash: hashPassword(password) } : {}) }, include: { authIdentities: true } })
    return clientSecurityResponse(user)
  }

  @Post('security/providers')
  async linkProvider(@Req() req: RequestLike, @Body() body: { provider?: string; providerToken?: string }) {
    const session = await clientSessionFrom(req)
    const provider = body.provider?.trim().toLowerCase()
    const providerToken = body.providerToken?.trim()
    if (provider !== 'wechat' && provider !== 'apple' || !providerToken) throw new HttpException('Valid third-party provider credentials are required', HttpStatus.BAD_REQUEST)
    if (process.env.NODE_ENV === 'production') throw new HttpException('Third-party provider verification is not configured', HttpStatus.SERVICE_UNAVAILABLE)
    const existing = await prisma.authIdentity.findUnique({ where: { provider_providerId: { provider, providerId: providerToken } } })
    if (existing && existing.userId !== session.sub) throw new HttpException('Third-party account is already connected', HttpStatus.CONFLICT)
    if (!existing) await prisma.authIdentity.create({ data: { provider, providerId: providerToken, userId: session.sub } })
    return clientSecurityResponse(await prisma.user.findUniqueOrThrow({ where: { id: session.sub }, include: { authIdentities: true } }))
  }

  @Delete('security/providers/:provider')
  async unlinkProvider(@Req() req: RequestLike, @Param('provider') provider: string) {
    const session = await clientSessionFrom(req)
    if (provider !== 'wechat' && provider !== 'apple') throw new HttpException('Unsupported third-party provider', HttpStatus.BAD_REQUEST)
    const count = await prisma.authIdentity.count({ where: { userId: session.sub } })
    if (count <= 1) throw new HttpException('At least one sign-in method must remain connected', HttpStatus.CONFLICT)
    await prisma.authIdentity.deleteMany({ where: { userId: session.sub, provider } })
    return clientSecurityResponse(await prisma.user.findUniqueOrThrow({ where: { id: session.sub }, include: { authIdentities: true } }))
  }
  @Get('trips')
  async listTrips(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req)
    const trips = await prisma.trip.findMany({
      where: { userId: session.sub },
      include: { user: { select: { name: true, displayName: true, gender: true, countryCode: true, phoneNumber: true } }, payment: true, quote: { select: { expiresAt: true, total: true, currency: true, lines: true, vehicle: true, pricing: { select: { categoryName: true } } } } },
      orderBy: { createdAt: 'desc' }
    })
    return { data: trips.map(clientTripResponse) }
  }

  @Get('trips/:id')
  async getTrip(@Req() req: RequestLike, @Param('id') id: string) {
    const session = await clientSessionFrom(req)
    await prisma.trip.updateMany({ where: { id, userId: session.sub, status: 'PENDING', quote: { is: { expiresAt: { lte: new Date() } } } }, data: { status: 'CANCELLED' } })
    const trip = await prisma.trip.findFirst({ where: { id, userId: session.sub }, include: { user: { select: { name: true, displayName: true, gender: true, countryCode: true, phoneNumber: true } }, payment: true, quote: { select: { expiresAt: true, total: true, currency: true, lines: true, vehicle: true, pricing: { select: { categoryName: true } } } } } })
    if (!trip) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
    return clientTripResponse(trip)
  }

  @Post('trips/:id/cancel')
  async cancelTrip(@Req() req: RequestLike, @Param('id') id: string) {
    const session = await clientSessionFrom(req)
    return prisma.$transaction(async tx => {
      const trip = await tx.trip.findFirst({ where: { id, userId: session.sub }, include: { user: { select: { name: true, displayName: true, gender: true, countryCode: true, phoneNumber: true } }, payment: true, quote: { select: { expiresAt: true, total: true, currency: true, lines: true, vehicle: true, pricing: { select: { categoryName: true } } } } } })
      if (!trip) throw new HttpException('Trip not found', HttpStatus.NOT_FOUND)
      if (trip.status === 'CANCELLED') return clientTripResponse(trip)
      if (trip.status === 'COMPLETED' || trip.executionPhase === 'IN_PROGRESS') throw new HttpException('Completed or in-progress trips cannot be cancelled', HttpStatus.CONFLICT)

      const payment = trip.payment
      if (payment && payment.status === 'PAID') {
        const user = await tx.user.findUniqueOrThrow({ where: { id: session.sub } })
        const fareBalance = roundMoney(user.fareBalance + payment.fareAmount)
        const cashBalance = roundMoney(user.cashBalance + payment.cashAmount)
        await tx.user.update({ where: { id: user.id }, data: { fareBalance, cashBalance } })
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', refundedAt: new Date() } })
        if (payment.fareAmount > 0) await tx.walletTransaction.create({ data: { userId: user.id, wallet: 'FARE', type: 'REFUND', amount: payment.fareAmount, balanceAfter: fareBalance, reason: `訂單退款 - 車費餘額 (訂單: ${trip.id.slice(-8)})`, paymentId: payment.id } })
        if (payment.cashAmount > 0) await tx.walletTransaction.create({ data: { userId: user.id, wallet: 'CASH', type: 'REFUND', amount: payment.cashAmount, balanceAfter: cashBalance, reason: `訂單退款 - 現金餘額 (訂單: ${trip.id.slice(-8)})`, paymentId: payment.id } })
      }
      const updated = await tx.trip.update({ where: { id: trip.id }, data: { status: 'CANCELLED', executionPhase: null }, include: { user: { select: { name: true, displayName: true, gender: true, countryCode: true, phoneNumber: true } }, payment: true, quote: { select: { expiresAt: true, total: true, currency: true, lines: true, vehicle: true, pricing: { select: { categoryName: true } } } } } })
      return clientTripResponse(updated)
    })
  }

  @Get('transactions')
  async listTransactions(@Req() req: RequestLike) {
    const session = await clientSessionFrom(req)
    const data = await prisma.payment.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: 'desc' },
      include: { trip: true }
    })
    return {
      data: data.map(payment => ({
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
        trip: { origin: payment.trip.origin, destination: payment.trip.destination, status: payment.trip.status }
      }))
    }
  }
}

@Controller('health') class HealthController { @Get() check() { return { status: 'ok', service: 'master-travel-project-api' } } }
 @Module({ controllers: [HealthController, LocationController, SettingsController, RecommendedAddressesController, NotificationsController, PublicVehiclesController, PublicQuotesController, PublicMembershipPlansController, PublicPromotionsController, PaymentCardsController, WalletController, PaymentsController, ClientOrdersController, ClientAuthController, DriverAuthController, DriverOrderUrlController, AdminAuthController, AdminController, SupportController], providers: [{ provide: APP_INTERCEPTOR, useClass: AdminAccessInterceptor }] }) class AppModule {}
async function bootstrap() {
  await prisma.$connect()
  await ensurePricingDefaults()
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' })
  app.useBodyParser('json', { limit: '2mb' })
  const configuredOrigins = (process.env.APP_CORS_ORIGINS || process.env.ADMIN_CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
  const allowedOrigins = new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ])
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
  await app.listen(Number(process.env.PORT) || 3010, process.env.API_HOST || '0.0.0.0')
}
bootstrap()
