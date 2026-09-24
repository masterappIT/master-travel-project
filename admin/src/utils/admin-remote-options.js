import { ref, watch } from 'vue'

export function retainSelectedOptions(current, incoming, selectedIds = []) {
  const selected = new Set((selectedIds || []).filter(Boolean))
  const merged = [...(incoming || [])]
  const present = new Set(merged.map(item => item.id))
  for (const item of current || []) {
    if (selected.has(item.id) && !present.has(item.id)) merged.push(item)
  }
  return merged
}

export async function loadAllOptions(fetchOptions, { pageSize = 100, search = '' } = {}) {
  const first = await fetchOptions({ page: 1, pageSize, search })
  const data = [...(first.data || [])]
  const pageCount = Number(first.pageCount || 1)
  for (let page = 2; page <= pageCount; page += 1) {
    const result = await fetchOptions({ page, pageSize, search })
    data.push(...(result.data || []))
  }
  return data
}

export function createRemoteOptionsLoader(fetchOptions, target, { pageSize = 20, selectedIds = () => [] } = {}) {
  const search = ref('')
  let request = 0

  async function load(value = search.value) {
    const requestId = ++request
    const result = await fetchOptions({ page: 1, pageSize, search: value })
    if (requestId !== request) return
    target.value = retainSelectedOptions(target.value, result.data, selectedIds())
  }

  watch(search, () => load(), { flush: 'post' })
  return { search, load }
}
