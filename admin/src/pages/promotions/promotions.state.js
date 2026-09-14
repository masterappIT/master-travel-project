import { computed, ref } from 'vue'
import { filterPromotions } from '../../utils/promotions.js'

export function createPromotionsPageState(promotions) {
  const filterTab = ref('ALL')
  const searchQuery = ref('')
  const filtered = computed(() => filterPromotions(promotions.value, filterTab.value, searchQuery.value))
  return { filterTab, searchQuery, filtered }
}
