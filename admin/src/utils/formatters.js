export const sortByOrder = (items) => [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))

export const currencyLabel = (currency) => currency === 'HKD' ? 'HKD$' : 'RMB¥'

export const formatOrderNumber = (id) => {
  const digits = String(id || '').replace(/\D/g, '')
  return digits ? `A${digits.slice(-8).padStart(8, '0')}` : '—'
}

export const displayMainlandCity = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return normalized.replace(/市$/, '') || normalized
}

export const apiMainlandCity = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized && !normalized.endsWith('市') ? `${normalized}市` : normalized
}

export const displayPlaceName = (value) => typeof value === 'string' ? value.trim() : ''

const COMPACT_ADDRESS_LIMIT = 18

const splitAddress = (value) => String(value || '')
  .replace(/\r?\n/g, ' · ')
  .split(/\s*[·・／/－–—-]\s*/)
  .map(part => part.trim())
  .filter(Boolean)

const cityName = (value, fallback) => {
  const text = String(value || '').trim()
  if (!text) return fallback
  const first = splitAddress(text)[0] || text
  return first.replace(/特别行政区|特別行政區/g, '').replace(/市$/, '') || fallback
}

const truncateUnicode = (value, limit = COMPACT_ADDRESS_LIMIT) => {
  const characters = Array.from(value)
  return characters.length <= limit ? value : `${characters.slice(0, Math.max(0, limit - 3)).join('')}...`
}

const normalizedRegion = (address, fallback) => {
  const value = address?.region === '大陸' ? address?.city : address?.region || address?.city
  return cityName(value, fallback)
}

const districtAndPlace = (value, fallbackCity) => {
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
  return { city: fallbackCity, district: '', place: parts[0] || String(value || '').trim() }
}

const addressParts = (value, fallbackCity) => {
  if (!value || typeof value === 'string') return districtAndPlace(value?.trim() || '', fallbackCity)
  return {
    city: normalizedRegion(value, fallbackCity),
    district: String(value.district || '').trim(),
    place: String(value.place || '').trim()
  }
}

export const formatTripAddress = (trip, side) => {
  const prefix = side === 'destination' ? 'destination' : 'origin'
  const fallbackCity = prefix === 'destination' ? '大陸' : '香港'
  const structured = trip && (trip[`${prefix}Region`] || trip[`${prefix}City`] || trip[`${prefix}District`] || trip[`${prefix}Place`])
    ? { region: trip[`${prefix}Region`], city: trip[`${prefix}City`], district: trip[`${prefix}District`], place: trip[`${prefix}Place`] }
    : undefined
  const address = addressParts(structured || trip?.[prefix], fallbackCity)
  const location = `${address.district}${address.place}`
  return truncateUnicode([address.city, location].filter(Boolean).join(' · ') || fallbackCity)
}
