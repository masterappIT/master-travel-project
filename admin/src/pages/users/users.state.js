import { computed, ref, watch } from 'vue'

export function createUsersPageState(users, pageSize = 10) {
  const page = ref(1)
  const searchQuery = ref('')
  const statusFilter = ref('ALL')
  const total = ref(0)
  const pageCount = ref(1)
  const summary = ref({})
  let refresh = () => {}
  const filtered = computed(() => users.value)
  const paged = computed(() => users.value)

  watch([searchQuery, statusFilter], () => { page.value = 1; refresh() }, { flush: 'post' })
  watch(page, () => refresh(), { flush: 'post' })

  function apply(result) {
    users.value = result.data || []
    total.value = Number(result.total ?? users.value.length)
    pageCount.value = Number(result.pageCount ?? Math.max(1, Math.ceil(total.value / pageSize)))
    summary.value = result.summary || {}
    if (page.value > pageCount.value) page.value = pageCount.value
  }

  return {
    page, pageSize, searchQuery, statusFilter, total, summary, filtered, pageCount, paged,
    query: computed(() => ({ page: page.value, pageSize, search: searchQuery.value, status: statusFilter.value })),
    apply,
    setRefresh: callback => { refresh = callback },
    goToPage: nextPage => { page.value = Math.min(Math.max(1, nextPage), pageCount.value) }
  }
}
