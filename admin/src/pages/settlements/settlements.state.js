import { computed, ref, watch } from 'vue'

export function createSettlementsPageState(trips, drivers, pageSize = 10) {
  const searchQuery = ref('')
  const statusFilter = ref('UNSETTLED')
  const page = ref(1)
  const methods = ref({})
  const selectedTrip = ref(null)

  const eligible = computed(() => trips.value.filter(item => item.status === 'COMPLETED' && item.driverId))
  const filtered = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase()
    return eligible.value.filter(item => {
      const settled = Boolean(item.settlement)
      if (statusFilter.value === 'SETTLED' && !settled) return false
      if (statusFilter.value === 'UNSETTLED' && settled) return false
      if (!keyword) return true
      const driver = drivers.value.find(candidate => candidate.id === item.driverId)
      return [item.id, item.origin, item.destination, driver?.name, driver?.phone]
        .some(value => String(value || '').toLowerCase().includes(keyword))
    })
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
  const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  const settled = computed(() => eligible.value.filter(item => item.settlement))
  const unsettled = computed(() => eligible.value.filter(item => !item.settlement))

  watch([searchQuery, statusFilter], () => { page.value = 1 })
  watch(pageCount, count => { if (page.value > count) page.value = count })
  watch([trips, drivers], () => {
    const next = { ...methods.value }
    for (const trip of eligible.value) {
      const driver = drivers.value.find(item => item.id === trip.driverId)
      next[trip.id] = trip.settlement?.method || next[trip.id] || driver?.settlementMethod || ''
    }
    methods.value = next
  }, { immediate: true })

  const goToPage = value => { page.value = Math.min(Math.max(1, value), pageCount.value) }
  const openDetail = trip => { selectedTrip.value = trip }
  const closeDetail = () => { selectedTrip.value = null }
  const driverFor = trip => drivers.value.find(item => item.id === trip.driverId) || trip.driver || null
  const formatTotal = items => {
    const totals = items.reduce((result, item) => {
      const currency = item.driverPayoutCurrency || 'HKD'
      result[currency] = (result[currency] || 0) + Number(item.driverPayoutAmount || 0)
      return result
    }, {})
    return Object.entries(totals).map(([currency, amount]) => `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' · ') || '—'
  }

  return { searchQuery, statusFilter, page, pageSize, methods, selectedTrip, eligible, filtered, paged, pageCount, settled, unsettled, goToPage, openDetail, closeDetail, driverFor, formatTotal }
}
