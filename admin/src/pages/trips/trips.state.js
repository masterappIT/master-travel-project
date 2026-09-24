import { computed, ref, watch } from 'vue'

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

  const total = ref(0)
  const summary = ref({})
  const serverPageCount = ref(1)
  const dispatchTotal = ref(0)
  const dispatchSummary = ref({})
  const serverDispatchPageCount = ref(1)
  let refresh = () => {}
  const filtered = computed(() => trips.value)
  const pageCount = computed(() => serverPageCount.value)
  const paged = computed(() => trips.value)
  const dispatchFiltered = computed(() => trips.value)
  const dispatchPageCount = computed(() => serverDispatchPageCount.value)
  const dispatchPaged = computed(() => trips.value)

  watch([searchQuery, statusFilter, dateFilter], () => { page.value = 1; refresh() }, { flush: 'post' })
  watch(dispatchSearch, () => { dispatchPage.value = 1; refresh() }, { flush: 'post' })
  watch(page, () => refresh(), { flush: 'post' })
  watch(dispatchPage, () => refresh(), { flush: 'post' })

  function apply(result, mode = 'list') {
    trips.value = result.data || []
    const count = Number(result.pageCount ?? 1)
    if (mode === 'dispatch') {
      dispatchTotal.value = Number(result.total ?? trips.value.length)
      dispatchSummary.value = result.summary || {}
      serverDispatchPageCount.value = count
    } else {
      total.value = Number(result.total ?? trips.value.length)
      summary.value = result.summary || {}
      serverPageCount.value = count
    }
  }
  const query = computed(() => ({ page: page.value, pageSize, search: searchQuery.value, status: statusFilter.value, date: dateFilter.value, mode: 'list' }))
  const dispatchQuery = computed(() => ({ page: dispatchPage.value, pageSize, search: dispatchSearch.value, mode: 'dispatch' }))

  const goToPage = value => { page.value = Math.min(Math.max(1, value), pageCount.value) }
  const goToDispatchPage = value => { dispatchPage.value = Math.min(Math.max(1, value), dispatchPageCount.value) }

  return { searchQuery, statusFilter, dateFilter, dateYear, dateMonth, dateDay, dateYears, dateDays, clearDateFilter, page, pageSize, total, summary, filtered, pageCount, paged, goToPage, dispatchSearch, dispatchPage, dispatchTotal, dispatchSummary, dispatchPageCount, dispatchFiltered, dispatchPaged, goToDispatchPage, query, dispatchQuery, apply, setRefresh: callback => { refresh = callback } }
}
