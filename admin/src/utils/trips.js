import { formatOrderNumber } from './formatters.js'

const sortByNewestCreatedAt = items => [...items].sort((left, right) => {
  const leftCreatedAt = Date.parse(left.createdAt || '')
  const rightCreatedAt = Date.parse(right.createdAt || '')
  return (Number.isNaN(rightCreatedAt) ? 0 : rightCreatedAt) - (Number.isNaN(leftCreatedAt) ? 0 : leftCreatedAt)
})

export const filterTrips = (items, searchQuery, statusFilter = 'ALL', dateFilter = '') => {
  const query = String(searchQuery || '').trim().toLowerCase()
  return sortByNewestCreatedAt(items.filter(item => {
    const displayId = formatOrderNumber(item.id).toLowerCase()
    const matchesQuery = !query || [item.id, displayId, item.origin, item.destination, item.user?.name, item.user?.phoneNumber]
      .some(value => String(value || '').toLowerCase().includes(query))
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
    const matchesDate = !dateFilter || String(item.scheduledAt || '').slice(0, 10) === dateFilter
    return matchesQuery && matchesStatus && matchesDate
  }))
}

export const filterDispatchTrips = (items, searchQuery) => {
  const query = String(searchQuery || '').trim().toLowerCase()
  return sortByNewestCreatedAt(items.filter(item => !query || [item.id, item.origin, item.destination].join(' ').toLowerCase().includes(query)))
}
