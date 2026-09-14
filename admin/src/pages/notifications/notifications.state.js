import { computed, ref } from 'vue'
import { filterNotificationDrivers, filterNotificationUsers } from '../../utils/notifications.js'

export function createNotificationsPageState(users, drivers) {
  const recipientSearch = ref('')
  const filteredUsers = computed(() => filterNotificationUsers(users.value, recipientSearch.value))
  const filteredDrivers = computed(() => filterNotificationDrivers(drivers.value, recipientSearch.value))
  return { recipientSearch, filteredUsers, filteredDrivers }
}
