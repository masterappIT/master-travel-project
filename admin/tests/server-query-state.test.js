import assert from 'node:assert/strict'
import test from 'node:test'
import { ref } from 'vue'
import { createUsersApi } from '../src/api/users.js'
import { createTripsApi } from '../src/api/trips.js'
import { createServerListState, normalizeListResult, serializeAdminQuery } from '../src/utils/admin-query-state.js'
import { createRemoteOptionsLoader, loadAllOptions, retainSelectedOptions } from '../src/utils/admin-remote-options.js'
import { loadAllPages, loadDriversResources, loadMembershipResources, loadNotificationResources } from '../src/utils/admin-resource-loader.js'

test('serializes bounded server list queries and omits neutral filters', () => {
  assert.equal(serializeAdminQuery({ page: 2, pageSize: 20, search: 'Amy Lee', status: 'ALL', date: '' }), '?page=2&pageSize=20&search=Amy+Lee')
})

test('resource APIs serialize resource modes and filters', async () => {
  const paths = []
  const api = path => { paths.push(path); return Promise.resolve({ data: [] }) }
  await createUsersApi(api).list({ page: 3, pageSize: 10, status: 'DISABLED' })
  await createTripsApi(api).list({ page: 1, pageSize: 10, mode: 'dispatch', search: 'T-1' })
  assert.deepEqual(paths, ['/admin/users?page=3&pageSize=10&status=DISABLED', '/admin/trips?page=1&pageSize=10&mode=dispatch&search=T-1'])
})

test('normalizes paged response metadata and summary', () => {
  assert.deepEqual(normalizeListResult({ data: [{ id: 1 }], total: 21, page: 2, pageSize: 10, pageCount: 3, summary: { enabled: 18 } }), {
    data: [{ id: 1 }], total: 21, page: 2, pageSize: 10, pageCount: 3, summary: { enabled: 18 }
  })
})

test('server state resets page on filter changes and applies metadata', async () => {
  let refreshes = 0
  const state = createServerListState({ pageSize: 10, filters: { search: '', status: 'ALL' }, onQueryChange: () => { refreshes += 1 } })
  state.page.value = 4
  state.search.value = 'new'
  await Promise.resolve()
  assert.equal(state.page.value, 1)
  assert.equal(refreshes, 1)
  assert.deepEqual(state.apply({ data: [], total: 35, page: 1, pageSize: 10, pageCount: 4, summary: { failed: 2 } }), [])
  assert.equal(state.pageCount.value, 4)
  assert.deepEqual(state.summary.value, { failed: 2 })
})

test('retains selected remote options missing from refreshed results', () => {
  const current = [{ id: 'selected' }, { id: 'old' }]
  assert.deepEqual(retainSelectedOptions(current, [{ id: 'new' }], ['selected']), [{ id: 'new' }, { id: 'selected' }])
})

test('loads every bounded options page', async () => {
  const pages = []
  const result = await loadAllOptions(async query => {
    pages.push(query)
    return { data: [{ id: query.page }], pageCount: 3 }
  })
  assert.deepEqual(result, [{ id: 1 }, { id: 2 }, { id: 3 }])
  assert.deepEqual(pages.map(query => query.pageSize), [100, 100, 100])
})

test('accumulates every page while preserving first response metadata', async () => {
  const result = await loadAllPages(async query => ({ data: [query.page], total: 2, page: query.page, pageCount: 2, summary: { pending: 1 } }))
  assert.deepEqual(result, { data: [1, 2], total: 2, page: 1, pageCount: 2, summary: { pending: 1 } })
})

test('notification resource load requests only the current history page', async () => {
  const notifications = ref([])
  const notificationTemplates = ref([])
  const notificationUsers = ref([])
  const notificationDrivers = ref([])
  let applied
  const paths = []
  const api = async path => {
    paths.push(path)
    if (path.startsWith('/admin/notifications?')) return { data: [{ id: 'notice' }], total: 1, pageCount: 1 }
    if (path === '/admin/notification-templates') return { data: [{ id: 'template' }] }
    throw new Error(`Unexpected path: ${path}`)
  }
  await loadNotificationResources({
    api,
    usersApi: { options: async () => ({ data: [{ id: 'user' }] }) },
    driversApi: { options: async () => ({ data: [{ id: 'driver' }] }) },
    notifications,
    notificationTemplates,
    notificationUsers,
    notificationDrivers,
    query: { page: 3, pageSize: 20 },
    state: { apply: result => { applied = result } }
  })
  assert.deepEqual(paths, ['/admin/notifications?page=3&pageSize=20', '/admin/notification-templates'])
  assert.deepEqual(notificationTemplates.value, [{ id: 'template' }])
  assert.deepEqual(notifications.value, [{ id: 'notice' }])
  assert.equal(applied.total, 1)
})

test('driver and membership loaders request only the current server page', async () => {
  const driverQueries = []
  const drivers = ref([])
  const vehicleCategories = ref([])
  const allVehicles = ref([])
  let driverApplied
  await loadDriversResources({
    driversApi: {
      categories: async () => ({ data: [] }),
      list: async query => { driverQueries.push(query); return { data: [{ id: 'driver' }], total: 45, page: 2, pageCount: 3 } }
    },
    vehicleCategories,
    drivers,
    allVehicles,
    includeVehicles: false,
    state: { query: ref({ page: 2, pageSize: 20 }), apply: result => { driverApplied = result; drivers.value = result.data } }
  })
  assert.deepEqual(driverQueries, [{ page: 2, pageSize: 20 }])
  assert.equal(driverApplied.pageCount, 3)

  const paths = []
  const membershipPlans = ref([])
  const membershipOrders = ref([])
  await loadMembershipResources({
    api: async path => {
      paths.push(path)
      return path === '/admin/membership-plans'
        ? { data: [] }
        : { data: [{ id: 'order' }], total: 25, page: 2, pageCount: 2 }
    },
    membershipPlans,
    membershipOrders,
    query: { page: 2, pageSize: 20 },
    state: { apply: result => { membershipOrders.value = result.data } }
  })
  assert.deepEqual(paths, ['/admin/membership-plans', '/admin/membership-orders?page=2&pageSize=20'])
  assert.deepEqual(membershipOrders.value, [{ id: 'order' }])
})

test('remote options discard stale responses', async () => {
  const target = ref([])
  let resolveFirst
  const loader = createRemoteOptionsLoader(query => query.search === 'old'
    ? new Promise(resolve => { resolveFirst = resolve })
    : Promise.resolve({ data: [{ id: 'new' }] }), target)
  const old = loader.load('old')
  await loader.load('new')
  resolveFirst({ data: [{ id: 'old' }] })
  await old
  assert.deepEqual(target.value, [{ id: 'new' }])
})
