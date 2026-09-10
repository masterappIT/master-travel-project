export type ServiceMode = 'cross-border' | 'business-charter'
export type PricingType = 'distance' | 'fixed-charter'
export type TripType = 'one-way' | 'round-trip' | 'airport'
export type Currency = 'HKD' | 'RMB'

export interface TripRoute {
  origin: string
  destination: string
  stops: string[]
  originRegion?: string
  originCity?: string
  destinationRegion?: string
  destinationCity?: string
}

export interface FareBreakdown {
  baseFare: number
  packagePrice: number
  distanceCharge: number
  overtimeCharge: number
  extraKmCharge: number
  crossBorderFee: number
  tollFee: number
  nightSurcharge: number
  extrasTotal: number
  discount: number
  total: number
  currency: Currency
}

export interface TripDraft {
  serviceMode: ServiceMode
  pricingType: PricingType
  tripType?: TripType
  route: TripRoute
  departureTime: string
  returnTime?: string
  distanceMeters?: number
  distanceKm?: number
  durationHours?: number
  selectedPackageId?: string
  chosenVehicleId?: string
  includedKm?: number
  fixedPrice?: number
  estimatedFare?: number
  extras: string[]
  couponId?: string
  couponCode?: string
  fare?: FareBreakdown
}
