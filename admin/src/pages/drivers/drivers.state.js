import { computed, ref, watch } from 'vue'

export function createDriversPageState(drivers, pageSize = 100) {
  const searchQuery = ref('')
  const statusFilter = ref('全部')
  const typeFilter = ref('全部')
  const page = ref(1)
  const total = ref(0)
  const pageCount = ref(1)
  const summary = ref({})
  let refresh = () => {}
  const filtered = computed(() => drivers.value)
  const hasActiveFilters = computed(() => Boolean(searchQuery.value.trim() || statusFilter.value !== '全部' || typeFilter.value !== '全部'))

  watch([searchQuery, statusFilter, typeFilter], () => { page.value = 1; refresh() }, { flush: 'post' })
  watch(page, () => refresh(), { flush: 'post' })
  function resetFilters() { searchQuery.value = ''; statusFilter.value = '全部'; typeFilter.value = '全部' }
  function apply(result) {
    drivers.value = result.data || []
    total.value = Number(result.total ?? drivers.value.length)
    pageCount.value = Number(result.pageCount ?? 1)
    summary.value = result.summary || {}
  }

  return {
    searchQuery, statusFilter, typeFilter, page, pageSize, total, pageCount, summary, filtered, hasActiveFilters, resetFilters, apply,
    query: computed(() => ({
      page: page.value,
      pageSize,
      search: searchQuery.value,
      reviewStatus: { 待審核: 'PENDING', 退回修改: 'REVISION_REQUIRED', 已通過: 'APPROVED', 已拒絕: 'REJECTED' }[statusFilter.value] || statusFilter.value,
      driverType: typeFilter.value
    })),
    setRefresh: callback => { refresh = callback }
  }
}
