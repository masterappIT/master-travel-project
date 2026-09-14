const normalize = value => String(value || '').toLowerCase()

export const filterNotificationUsers = (items, searchQuery) => {
  const query = String(searchQuery || '').trim().toLowerCase()
  if (!query) return items
  return items.filter(item => normalize(`${item.displayName || ''} ${item.name || ''} ${item.phoneNumber || ''} ${item.id}`).includes(query))
}

export const filterNotificationDrivers = (items, searchQuery) => {
  const query = String(searchQuery || '').trim().toLowerCase()
  if (!query) return items
  return items.filter(item => normalize(`${item.name || ''} ${item.phone || ''} ${item.id}`).includes(query))
}
