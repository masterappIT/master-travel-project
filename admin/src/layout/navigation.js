export const primaryNavigation = Object.freeze([
  { id: 'dashboard', label: 'dashboard' },
  { id: 'users', label: 'users' },
  { id: 'drivers', label: 'drivers' },
  { id: 'trips', label: 'trips' },
  { id: 'dispatch', label: 'dispatch' },
  { id: 'settlements', label: 'settlements' },
  { id: 'charters', label: 'charters' },
  { id: 'addresses', label: 'addresses' },
  { id: 'vehicles', label: 'vehicleManagement' },
  { id: 'membership', label: 'membership' },
  { id: 'promotions', label: 'promotions' },
  { id: 'payments', label: 'paymentSettings' },
  { id: 'finance', label: '財務管理中心' },
  { id: 'login-settings', label: 'loginSettings' },
  { id: 'notifications', label: 'notifications' },
  { id: 'administrators', label: 'administrators', superAdminOnly: true },
  { id: 'auditLogs', label: 'auditLogs', superAdminOnly: true }
])

export const operationsNavigation = Object.freeze([
  { id: 'operations-personnel', label: 'personnelManagement' },
  { id: 'drivers', label: 'drivers' },
  { id: 'entries', label: 'entryItems' },
  { id: 'income', label: 'incomeReport' },
  { id: 'expenses', label: 'expenseDetails' }
])

export function createNavigationController({ view, load }) {
  return target => {
    view.value = target
    return load()
  }
}
