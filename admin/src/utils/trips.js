import { formatOrderNumber } from './formatters.js'

export const filterTrips = (items, searchQuery, statusFilter = 'ALL', dateFilter = '') => {
  const query = String(searchQuery || '').trim().toLowerCase()
  return items.filter(item => {
    const displayId = formatOrderNumber(item.id).toLowerCase()
    const matchesQuery = !query || [item.id, displayId, item.origin, item.destination, item.user?.name, item.user?.phoneNumber]
      .some(value => String(value || '').toLowerCase().includes(query))
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
    const matchesDate = !dateFilter || String(item.scheduledAt || '').slice(0, 10) === dateFilter
    return matchesQuery && matchesStatus && matchesDate
  })
}

export const filterDispatchTrips = (items, searchQuery) => {
  const query = String(searchQuery || '').trim().toLowerCase()
  return items.filter(item => !query || [item.id, item.origin, item.destination].join(' ').toLowerCase().includes(query))
}
