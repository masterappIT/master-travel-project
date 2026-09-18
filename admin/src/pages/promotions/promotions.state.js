import { computed, ref } from 'vue'
import { filterPromotions } from '../../utils/promotions.js'

export function createPromotionsPageState(promotions) {
  const section = ref('PROMOTIONS')
  const filterTab = ref('ALL')
  const searchQuery = ref('')
  const mileageSearchQuery = ref('')
  const invitationSearchQuery = ref('')
  const invitationStatusFilter = ref('ALL')
  const filtered = computed(() => filterPromotions(promotions.value, filterTab.value, searchQuery.value))
  return { section, filterTab, searchQuery, mileageSearchQuery, invitationSearchQuery, invitationStatusFilter, filtered }
}
