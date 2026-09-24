import { computed, ref, watch } from 'vue'

export function createSettlementsPageState(trips, drivers, pageSize = 10) {
  const searchQuery = ref('')
  const statusFilter = ref('UNSETTLED')
  const page = ref(1)
  const total = ref(0)
  const pageCount = ref(1)
  const summary = ref({})
  const methods = ref({})
  const selectedTrip = ref(null)
  let refresh = () => {}

  const eligible = computed(() => trips.value)
  const filtered = computed(() => trips.value)
  const paged = computed(() => trips.value)
  const settled = computed(() => summary.value.settledItems || [])
  const unsettled = computed(() => summary.value.unsettledItems || [])

  watch([searchQuery, statusFilter], () => { page.value = 1; refresh() }, { flush: 'post' })
  watch(page, () => refresh(), { flush: 'post' })
  watch([trips, drivers], () => {
    const next = { ...methods.value }
    for (const trip of trips.value) {
      const driver = drivers.value.find(item => item.id === trip.driverId)
      next[trip.id] = trip.settlement?.method || next[trip.id] || driver?.settlementMethod || ''
    }
    methods.value = next
  }, { immediate: true })

  function apply(result) {
    trips.value = result.data || []
    total.value = Number(result.total ?? trips.value.length)
    page.value = Number(result.page ?? page.value)
    pageCount.value = Number(result.pageCount ?? 1)
    summary.value = result.summary || {}
  }
  const goToPage = value => { page.value = Math.min(Math.max(1, value), pageCount.value) }
  const openDetail = trip => { selectedTrip.value = trip }
  const closeDetail = () => { selectedTrip.value = null }
  const driverFor = trip => drivers.value.find(item => item.id === trip.driverId) || trip.driver || null
  const formatTotal = items => {
    if (!Array.isArray(items)) return String(items || '—')
    const totals = items.reduce((result, item) => {
      const currency = item.currency || item.driverPayoutCurrency || 'HKD'
      const amount = item.amount ?? item.total ?? item.driverPayoutAmount ?? 0
      result[currency] = (result[currency] || 0) + Number(amount || 0)
      return result
    }, {})
    return Object.entries(totals).map(([currency, amount]) => `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' · ') || '—'
  }

  return {
    searchQuery, statusFilter, page, pageSize, total, summary, methods, selectedTrip, eligible, filtered, paged, pageCount, settled, unsettled,
    query: computed(() => ({ page: page.value, pageSize, search: searchQuery.value, status: statusFilter.value, mode: 'settlements' })),
    apply, setRefresh: callback => { refresh = callback }, goToPage, openDetail, closeDetail, driverFor, formatTotal
  }
}
