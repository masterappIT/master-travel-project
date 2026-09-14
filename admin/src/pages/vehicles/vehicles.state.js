import { ref } from 'vue'

export function createVehiclesPageState() {
  const tab = ref('catalog')
  const extraSortId = ref('')
  return { tab, extraSortId }
}
