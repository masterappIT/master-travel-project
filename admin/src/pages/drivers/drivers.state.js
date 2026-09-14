import { computed, ref } from 'vue'
import { filterDrivers } from '../../utils/drivers.js'

export function createDriversPageState(drivers) {
  const searchQuery = ref('')
  const statusFilter = ref('全部')
  const typeFilter = ref('全部')
  const filtered = computed(() => filterDrivers(drivers.value, searchQuery.value, statusFilter.value, typeFilter.value))

  return { searchQuery, statusFilter, typeFilter, filtered }
}
