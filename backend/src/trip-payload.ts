import { Prisma } from "../generated/prisma";

export const tripDriverSelect = Prisma.validator<Prisma.DriverSelect>()({
  id: true,
  name: true,
  phone: true,
  settlementMethod: true,
});

export type TripDriverSummary = Prisma.DriverGetPayload<{
  select: typeof tripDriverSelect;
}>;

export function tripDriverResponse(driver: TripDriverSummary) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    settlementMethod: driver.settlementMethod,
  };
}

export const adminTripDetailSelect = Prisma.validator<Prisma.TripSelect>()({
  id: true,
  userId: true,
  quoteId: true,
  origin: true,
  originRegion: true,
  originCity: true,
  originDistrict: true,
  originPlace: true,
  originDetail: true,
  destination: true,
  destinationRegion: true,
  destinationCity: true,
  destinationDistrict: true,
  destinationPlace: true,
  destinationDetail: true,
  originLatitude: true,
  originLongitude: true,
  destinationLatitude: true,
  destinationLongitude: true,
  routePoints: true,
  region: true,
  scheduledAt: true,
  passengerName: true,
  passengerPhone: true,
  passengerPhoneRegion: true,
  passengerGender: true,
  passengerDocumentType: true,
  passengerPassportCountry: true,
  estimatedArrivalAt: true,
  status: true,
  executionPhase: true,
  driverId: true,
  driverPayoutPercentage: true,
  driverPayoutCalculatedAmount: true,
  driverPayoutAmount: true,
  driverPayoutCurrency: true,
  driverName: true,
  driverPhone: true,
  vehicleId: true,
  vehicleCategory: true,
  vehicleColor: true,
  vehicleOwnership: true,
  vehiclePlateType: true,
  vehiclePlate: true,
  vehicleHkPlate: true,
  vehicleMacauPlate: true,
  vehicleMainlandPlate: true,
  assignedAt: true,
  acceptedAt: true,
  arrivedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  cancellationSource: true,
  fareBalancePaid: true,
  cashBalancePaid: true,
  externalPaid: true,
  externalPaymentMethod: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, countryCode: true, phoneNumber: true, name: true, displayName: true, avatarData: true, email: true, passwordHash: true, gender: true, region: true, birthday: true, cashBalance: true, fareBalance: true, membershipLevel: true, enabled: true, createdAt: true, lastLoginAt: true, lastLogoutAt: true, verificationCodes: { select: { id: true, purpose: true, status: true, attempts: true, expiresAt: true, consumedAt: true, createdAt: true } }, authIdentities: { select: { provider: true } } } },
  quote: {
    select: {
      id: true, distanceKm: true, currency: true, subtotal: true, total: true, durationSeconds: true, expiresAt: true, createdAt: true,
      pricing: { select: { categoryId: true, categoryName: true, tabLabel: true, minimumFare: true, currency: true, tiers: { orderBy: { order: "asc" }, select: { sourceTierId: true, fromKm: true, toKm: true, pricePerKm: true, order: true } } } },
      vehicle: { select: { vehicleId: true, categoryId: true, brand: true, model: true, series: true, seats: true, image: true, colorLabel: true, modelChoiceLabel: true } },
      lines: { orderBy: { order: "asc" }, select: { type: true, sourceId: true, label: true, quantity: true, unitAmount: true, totalAmount: true, currency: true, order: true } },
      promotionUsages: { select: { id: true, promotionId: true, status: true, createdAt: true, usedAt: true, releasedAt: true, promotion: { select: { id: true, name: true, kind: true, discountType: true, discountValue: true, currency: true, minimumSpend: true, maximumDiscount: true, couponCode: true } } } },
    },
  },
  payment: { select: { id: true, total: true, currency: true, fareAmount: true, cashAmount: true, externalAmount: true, externalPaymentMethod: true, externalReference: true, status: true, refundedAt: true, createdAt: true, updatedAt: true } },
  settlement: { select: { id: true, driverId: true, method: true, settledAt: true } },
  driver: { select: tripDriverSelect },
});

export type AdminTripDetail = Prisma.TripGetPayload<{ select: typeof adminTripDetailSelect }>;
