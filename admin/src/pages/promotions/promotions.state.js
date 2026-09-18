import { computed, ref } from 'vue'
import { filterPromotions } from '../../utils/promotions.js'

export function createPromotionsPageState(promotions) {
  const section = ref('PROMOTIONS')
  const filterTab = ref('ALL')
  const searchQuery = ref('')
  const mileageSearchQuery = ref('')
  const filtered = computed(() => filterPromotions(promotions.value, filterTab.value, searchQuery.value))
  return { section, filterTab, searchQuery, mileageSearchQuery, filtered }
}
