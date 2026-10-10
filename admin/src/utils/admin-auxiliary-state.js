import { ref } from 'vue'
import { readStoredList } from './storage.js'
import { filterStoredDrivers } from './drivers.js'

export function createAdminAuxiliaryState() {
  const drivers = ref(filterStoredDrivers(readStoredList('admin_drivers')))
  return {
    administrators: ref([]),
    auditLogs: ref([]),
    notifications: ref([]),
    notificationTemplates: ref([]),
    notificationUsers: ref([]),
    notificationDrivers: ref([]),
    drivers,
    selectedDriver: ref(null)
  }
}
