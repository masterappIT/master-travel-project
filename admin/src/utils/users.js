export const filterUsers = (items, searchQuery, statusFilter = 'ALL') => {
  const query = String(searchQuery || '').trim().toLowerCase()
  return items.filter(item => {
    const searchableValues = [
      item.name,
      item.phoneNumber,
      `${item.countryCode || ''}${item.phoneNumber || ''}`,
      item.id
    ]
    const matchesQuery = !query || searchableValues
      .some(value => String(value || '').toLowerCase().includes(query))
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ENABLED' ? item.enabled !== false : item.enabled === false)
    return matchesQuery && matchesStatus
  })
}
