import { computed, ref } from 'vue'
import { filterAddresses } from '../../utils/addresses.js'

export function createAddressesPageState(addresses) {
  const regionFilter = ref('')
  const cityFilter = ref('')
  const filtered = computed(() => filterAddresses(addresses.value, regionFilter.value, cityFilter.value))
  return { regionFilter, cityFilter, filtered }
}
