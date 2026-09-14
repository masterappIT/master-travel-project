import { computed, ref } from 'vue'
import { filterAddresses } from '../../utils/addresses.js'

export function createAddressesPageState(addresses) {
  const regionFilter = ref('')
  const cityFilter = ref('')
  const filtered = computed(() => filterAddresses(addresses.value, regionFilter.value, cityFilter.value))
  const totalCount = computed(() => addresses.value.length)
  const enabledCount = computed(() => addresses.value.filter(item => item.enabled).length)
  const mainlandCount = computed(() => addresses.value.filter(item => item.region === '大陸').length)
  return { regionFilter, cityFilter, filtered, totalCount, enabledCount, mainlandCount }
}
