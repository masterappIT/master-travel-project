import { computed, ref } from 'vue'
import { filterDrivers } from '../../utils/drivers.js'

export function createDriversPageState(drivers) {
  const searchQuery = ref('')
  const statusFilter = ref('全部')
  const typeFilter = ref('全部')
  const filtered = computed(() => filterDrivers(drivers.value, searchQuery.value, statusFilter.value, typeFilter.value))
  const hasActiveFilters = computed(() => Boolean(searchQuery.value.trim() || statusFilter.value !== '全部' || typeFilter.value !== '全部'))

  function resetFilters() {
    searchQuery.value = ''
    statusFilter.value = '全部'
    typeFilter.value = '全部'
  }

  return { searchQuery, statusFilter, typeFilter, filtered, hasActiveFilters, resetFilters }
}
