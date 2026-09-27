export interface PromotionRoute {
  originRegion: string | null
  originCity: string | null
  destinationRegion: string | null
  destinationCity: string | null
  bidirectional: boolean
}

export interface QuoteRoute {
  originRegion: string
  originCity: string
  destinationRegion: string
  destinationCity: string
}

export function promotionMatchesRoute(promotion: PromotionRoute, route: QuoteRoute): boolean {
  const matchesDirection = (originRegion: string, originCity: string, destinationRegion: string, destinationCity: string) =>
    (!promotion.originRegion || promotion.originRegion === originRegion) &&
    (!promotion.originCity || promotion.originCity === originCity) &&
    (!promotion.destinationRegion || promotion.destinationRegion === destinationRegion) &&
    (!promotion.destinationCity || promotion.destinationCity === destinationCity)

  return matchesDirection(route.originRegion, route.originCity, route.destinationRegion, route.destinationCity) ||
    (promotion.bidirectional && matchesDirection(route.destinationRegion, route.destinationCity, route.originRegion, route.originCity))
}
