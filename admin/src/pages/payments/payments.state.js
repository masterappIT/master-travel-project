import { ref } from 'vue'

export function createPaymentsPageState() {
  const saved = ref(false)
  const raceSaving = ref(false)
  return { saved, raceSaving }
}
