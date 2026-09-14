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
