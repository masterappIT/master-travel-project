export function createOperationsStorage({ personnel, entryItems, expenseItems, drivers }) {
  function persist() {
    localStorage.setItem('admin_personnel', JSON.stringify(personnel.value))
    localStorage.setItem('admin_drivers', JSON.stringify(drivers.value))
    localStorage.setItem('admin_entry_items', JSON.stringify(entryItems.value))
    localStorage.setItem('admin_expenses', JSON.stringify(expenseItems.value))
  }

  function seed() {
    if (!personnel.value.length) personnel.value = [{ id: 'staff-1', name: '王小明', role: '調度主管', phone: '9123 4567', status: '在職' }, { id: 'staff-2', name: '李怡君', role: '客服專員', phone: '9234 5678', status: '在職' }]
    if (!entryItems.value.length) entryItems.value = [{ id: 'entry-1', name: '機場接送', category: '接送服務', unit: '趟', price: 680, enabled: true }, { id: 'entry-2', name: '跨境包車', category: '包車服務', unit: '小時', price: 500, enabled: true }, { id: 'entry-3', name: '深夜服務費', category: '附加服務', unit: '次', price: 120, enabled: true }]
    if (!expenseItems.value.length) expenseItems.value = [{ id: 'expense-1', date: '2026-09-08', category: '車輛維護', description: '例行保養與洗車', amount: 1280, status: '已核銷' }, { id: 'expense-2', date: '2026-09-06', category: '人事費用', description: '兼職司機薪資', amount: 3600, status: '待核銷' }]
    persist()
  }

  return { persist, seed }
}
