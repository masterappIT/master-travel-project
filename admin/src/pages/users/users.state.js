import { computed, ref, watch } from 'vue'
import { filterUsers } from '../../utils/users.js'

export function createUsersPageState(users, pageSize = 10) {
  const page = ref(1)
  const searchQuery = ref('')
  const statusFilter = ref('ALL')
  const filtered = computed(() => filterUsers(users.value, searchQuery.value, statusFilter.value))
  const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
  const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))

  watch([searchQuery, statusFilter], () => { page.value = 1 })
  watch(pageCount, count => { if (page.value > count) page.value = count })

  return {
    page,
    pageSize,
    searchQuery,
    statusFilter,
    filtered,
    pageCount,
    paged,
    goToPage: nextPage => { page.value = Math.min(Math.max(1, nextPage), pageCount.value) }
  }
}
