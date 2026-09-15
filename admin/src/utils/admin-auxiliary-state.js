import { ref } from 'vue'
import { readStoredList } from './storage.js'
import { filterStoredDrivers } from './drivers.js'

export function createAdminAuxiliaryState() {
  const personnel = ref(readStoredList('admin_personnel'))
  const entryItems = ref(readStoredList('admin_entry_items'))
  const drivers = ref(filterStoredDrivers(readStoredList('admin_drivers')))
  const expenseItems = ref(readStoredList('admin_expenses'))
  return {
    administrators: ref([]),
    auditLogs: ref([]),
    notifications: ref([]),
    notificationUsers: ref([]),
    notificationDrivers: ref([]),
    personnel,
    entryItems,
    drivers,
    selectedDriver: ref(null),
    expenseItems
  }
}
