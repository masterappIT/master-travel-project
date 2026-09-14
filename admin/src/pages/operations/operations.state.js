import { computed, ref } from 'vue'
import { filterEntryItems, filterExpenses, filterPersonnel } from '../../utils/operations.js'

export function createOperationsPageState(personnel, entryItems, expenseItems) {
  const personnelFilter = ref('全部')
  const entryFilter = ref('全部')
  const expenseFilter = ref('全部')
  const filteredPersonnel = computed(() => filterPersonnel(personnel.value, personnelFilter.value))
  const filteredEntryItems = computed(() => filterEntryItems(entryItems.value, entryFilter.value))
  const filteredExpenses = computed(() => filterExpenses(expenseItems.value, expenseFilter.value))
  return { personnelFilter, entryFilter, expenseFilter, filteredPersonnel, filteredEntryItems, filteredExpenses }
}
