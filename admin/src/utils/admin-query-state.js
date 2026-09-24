import { computed, ref, watch } from 'vue'

export function serializeAdminQuery(query = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === 'ALL' || value === 'all' || value === '全部') continue
    params.set(key, String(value))
  }
  const value = params.toString()
  return value ? `?${value}` : ''
}

export function normalizeListResult(result, fallback = {}) {
  const data = Array.isArray(result) ? result : result?.data || []
  const total = Number(result?.total ?? data.length)
  const pageSize = Number(result?.pageSize ?? fallback.pageSize ?? Math.max(data.length, 1))
  const page = Number(result?.page ?? fallback.page ?? 1)
  return {
    data,
    total,
    page,
    pageSize,
    pageCount: Number(result?.pageCount ?? Math.max(1, Math.ceil(total / pageSize))),
    summary: result?.summary || {}
  }
}

export function createServerListState({ pageSize = 10, filters = {}, onQueryChange } = {}) {
  const page = ref(1)
  const total = ref(0)
  const pageCount = ref(1)
  const summary = ref({})
  const filterRefs = Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, ref(value)]))
  const query = computed(() => ({
    page: page.value,
    pageSize,
    ...Object.fromEntries(Object.entries(filterRefs).map(([key, value]) => [key, value.value]))
  }))

  function apply(result) {
    const normalized = normalizeListResult(result, query.value)
    total.value = normalized.total
    page.value = normalized.page
    pageCount.value = normalized.pageCount
    summary.value = normalized.summary
    return normalized.data
  }
  function goToPage(value) {
    page.value = Math.min(Math.max(1, value), pageCount.value)
  }
  function bind() {
    if (!onQueryChange) return () => {}
    return watch(Object.values(filterRefs), () => { page.value = 1; onQueryChange() }, { flush: 'post' })
  }
  const stop = bind()

  return { page, pageSize, total, pageCount, summary, query, apply, goToPage, bind, stop, ...filterRefs }
}
