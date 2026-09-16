const splitAddress = (value: string) => value
  .replace(/\r?\n/g, ' · ')
  .split(/\s*[·・／/－–—-]\s*/)
  .map(part => part.trim())
  .filter(Boolean)

const cityName = (value: string, fallback: string) => {
  const text = value.trim()
  if (!text) return fallback
  const first = splitAddress(text)[0] || text
  return first.replace(/特别行政区|特別行政區/g, '').replace(/市$/, '') || fallback
}

const districtAndPlace = (value: string, fallbackCity: string) => {
  const parts = splitAddress(value)
  if (parts.length >= 3) return { city: cityName(parts[0], fallbackCity), district: parts[1], place: parts.slice(2).join('／') }
  if (parts.length === 2) {
    const first = parts[0]
    const second = parts[1]
    if (/区$|區$/.test(first)) return { city: fallbackCity, district: first, place: second }
    const districtMatch = second.match(/^(.+?(?:区|區))(.*)$/u)
    if (districtMatch) return { city: cityName(first, fallbackCity), district: districtMatch[1], place: districtMatch[2] || districtMatch[1] }
    return { city: cityName(first, fallbackCity), district: '', place: second }
  }
  return { city: fallbackCity, district: '', place: parts[0] || value }
}

const removeHouseNumber = (value: string) => value
  .replace(/(?:[-－—,，\s]+)?(?:\d+[A-Za-z]?號?|\d+[A-Za-z]?号?)(?:[-－—,，\s].*)?$/u, '')
  .replace(/[-－—,，\s]+$/u, '')
  .trim()

export const formatOrderCardAddress = (value: string | undefined, fallback: string) => cityName(value?.trim() || '', fallback)

export const formatOrderSummaryAddress = (value: string | undefined, fallbackCity: string) => {
  const address = districtAndPlace(value?.trim() || '', fallbackCity)
  return [address.city, address.district].filter(Boolean).join(' · ') || fallbackCity
}

export const formatOrderDetailAddress = (value: string | undefined, fallbackCity: string) => {
  const address = districtAndPlace(value?.trim() || '', fallbackCity)
  const cityAndDistrict = [address.city, address.district].filter(Boolean).join(' · ')
  return [cityAndDistrict, removeHouseNumber(address.place)].filter(Boolean).join('') || fallbackCity
}
