export function matchesSearchCity(city: string | undefined, requestedCity: string | undefined): boolean {
  const normalize = (value: string) => value.trim().replace(/市$/, "");
  const requested = normalize(requestedCity || "");
  return !requested || normalize(city || "") === requested;
}
