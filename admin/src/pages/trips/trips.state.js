import { computed, ref, watch } from 'vue'
import { filterDispatchTrips, filterTrips } from '../../utils/trips.js'

export function createTripsPageState(trips, pageSize = 10) {
  const searchQuery = ref('')
  const statusFilter = ref('ALL')
  const dateFilter = ref('')
  const dateYear = ref('')
  const dateMonth = ref('')
  const dateDay = ref('')
  const dateYears = computed(() => {
    const year = new Date().getFullYear()
    return Array.from({ length: 11 }, (_, index) => String(year - 5 + index))
  })
  const dateDays = computed(() => {
    const year = Number(dateYear.value) || new Date().getFullYear()
    const month = Number(dateMonth.value) || 1
    return Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => String(index + 1).padStart(2, '0'))
  })
  watch([dateYear, dateMonth, dateDay], () => {
    dateFilter.value = dateYear.value && dateMonth.value && dateDay.value
      ? `${dateYear.value}-${dateMonth.value}-${dateDay.value}`
      : ''
  })
  const clearDateFilter = () => {
    dateYear.value = ''
    dateMonth.value = ''
    dateDay.value = ''
    dateFilter.value = ''
  }
  const page = ref(1)
  const dispatchSearch = ref('')
  const dispatchPage = ref(1)

  const filtered = computed(() => filterTrips(trips.value, searchQuery.value, statusFilter.value, dateFilter.value))
  const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
  const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  const dispatchFiltered = computed(() => filterDispatchTrips(trips.value, dispatchSearch.value))
  const dispatchPageCount = computed(() => Math.max(1, Math.ceil(dispatchFiltered.value.length / pageSize)))
  const dispatchPaged = computed(() => dispatchFiltered.value.slice((dispatchPage.value - 1) * pageSize, dispatchPage.value * pageSize))

  watch([searchQuery, statusFilter, dateFilter], () => { page.value = 1 }, { flush: 'sync' })
  watch(dispatchSearch, () => { dispatchPage.value = 1 })
  watch(pageCount, count => { if (page.value > count) page.value = count })
  watch(dispatchPageCount, count => { if (dispatchPage.value > count) dispatchPage.value = count })

  const goToPage = value => { page.value = Math.min(Math.max(1, value), pageCount.value) }
  const goToDispatchPage = value => { dispatchPage.value = Math.min(Math.max(1, value), dispatchPageCount.value) }

  return { searchQuery, statusFilter, dateFilter, dateYear, dateMonth, dateDay, dateYears, dateDays, clearDateFilter, page, pageSize, filtered, pageCount, paged, goToPage, dispatchSearch, dispatchPage, dispatchPageCount, dispatchFiltered, dispatchPaged, goToDispatchPage }
}
