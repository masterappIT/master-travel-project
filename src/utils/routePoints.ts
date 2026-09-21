export type RoutePoint = { latitude: number; longitude: number }

export const MAX_PERSISTED_ROUTE_POINTS = 300

export function compactRoutePoints(
  points: RoutePoint[] | undefined,
  maximum = MAX_PERSISTED_ROUTE_POINTS
): RoutePoint[] | undefined {
  const validPoints = points?.filter(point =>
    Number.isFinite(point.latitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    Number.isFinite(point.longitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180
  )
  if (!validPoints?.length) return undefined
  if (validPoints.length <= maximum) return validPoints
  if (maximum < 2) return [validPoints[0]]

  const lastIndex = validPoints.length - 1
  return Array.from({ length: maximum }, (_, index) =>
    validPoints[Math.round(index * lastIndex / (maximum - 1))]
  )
}
