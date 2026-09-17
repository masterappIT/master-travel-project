export const filterDrivers = (items, searchQuery, statusFilter = '全部', typeFilter = '全部') => {
  const query = String(searchQuery || '').trim().toLowerCase()
  return items.filter(item => {
    const statusLabel = { PENDING: '待審核', APPROVED: '已通過', REVISION_REQUIRED: '退回修改', REJECTED: '已拒絕' }[item.reviewStatus] || item.reviewStatus || '待審核'
  const matchesStatus = statusFilter === '全部' || statusLabel === statusFilter
    const matchesType = typeFilter === '全部' || (item.driverType || '內部司機') === typeFilter
    const matchesQuery = !query || [item.name, item.phone, item.hkPlate, item.macauPlate, item.mainlandPlate, item.vehicleCategory]
      .some(value => String(value || '').toLowerCase().includes(query))
    return matchesStatus && matchesType && matchesQuery
  })
}

export const isStoredDriver = item => Boolean(item && (item.affiliation || item.plateType || item.vehicleCategory || item.reviewStatus))

export const filterStoredDrivers = items => items.filter(isStoredDriver)