export const filterPersonnel = (items, statusFilter = '全部') =>
  statusFilter === '全部' ? items : items.filter(item => item.status === statusFilter)

export const filterEntryItems = (items, categoryFilter = '全部') =>
  categoryFilter === '全部' ? items : items.filter(item => item.category === categoryFilter)

export const filterExpenses = (items, categoryFilter = '全部') =>
  categoryFilter === '全部' ? items : items.filter(item => item.category === categoryFilter)
