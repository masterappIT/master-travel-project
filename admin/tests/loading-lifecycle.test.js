import assert from 'node:assert/strict'
import test from 'node:test'
import { createApiClient } from '../src/api/client.js'
import { createAdminResourceLoader } from '../src/utils/admin-load-orchestrator.js'
import { loadAddressResources } from '../src/utils/admin-resource-loader.js'

const state = value => ({ value })

test('classifies browser-specific aborted fetch failures as cancellation', async () => {
  globalThis.document = { cookie: '' }
  let requestCount = 0
  globalThis.fetch = (_url, { signal }) => {
    requestCount += 1
    if (requestCount > 1) return Promise.resolve(new Response('{}', { status: 200 }))
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new TypeError('The user aborted a request.')), { once: true })
    })
  }

  const api = createApiClient({ baseUrl: '/api', getToken: () => '', onUnauthorized: () => {} })
  api.beginReadScope()
  const firstRequest = api('/first').catch(error => error)
  api.beginReadScope()

  assert.equal((await firstRequest).kind, 'cancelled')
})

test('does not clear the session when an obsolete scoped read returns unauthorized', async () => {
  globalThis.document = { cookie: '' }
  let resolveFirst
  let unauthorizedCount = 0
  globalThis.fetch = (_url, { signal }) => {
    if (!resolveFirst) {
      return new Promise(resolve => {
        resolveFirst = () => resolve(new Response('{"message":"expired"}', {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }))
        signal.addEventListener('abort', resolveFirst, { once: true })
      })
    }
    return Promise.resolve(new Response('{}', { status: 200 }))
  }

  const api = createApiClient({
    baseUrl: '/api',
    getToken: () => '',
    onUnauthorized: () => { unauthorizedCount += 1 }
  })
  api.beginReadScope()
  const obsoleteRequest = api('/obsolete').catch(error => error)
  api.beginReadScope()

  assert.equal((await obsoleteRequest).kind, 'unauthorized')
  assert.equal(unauthorizedCount, 0)
})

test('clears the session when the current request returns unauthorized', async () => {
  globalThis.document = { cookie: '' }
  let unauthorizedCount = 0
  globalThis.fetch = () => Promise.resolve(new Response('{"message":"expired"}', {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  }))

  const api = createApiClient({
    baseUrl: '/api',
    getToken: () => '',
    onUnauthorized: () => { unauthorizedCount += 1 }
  })
  api.beginReadScope()
  const requestError = await api('/current').catch(error => error)

  assert.equal(requestError.kind, 'unauthorized')
  assert.equal(unauthorizedCount, 1)
})

test('does not let an obsolete request overwrite the current page error', async () => {
  let rejectDashboard
  const api = path => {
    if (path === '/admin/dashboard') return new Promise((_, reject) => { rejectDashboard = reject })
    return Promise.resolve({})
  }
  api.beginReadScope = () => {}
  const view = state('dashboard')
  const error = state('')
  const loader = createAdminResourceLoader({
    api,
    token: state('session'),
    currentAdministrator: state({ id: 'admin' }),
    view,
    loading: state(false),
    error,
    dashboard: state(null),
    loadRequestId: state(0),
    displayError: requestError => requestError.message,
    applySettings: () => {},
    loadSettings: () => Promise.resolve({ settings: {} }),
    settings: {},
    resourceLoaders: { coreUsers: () => Promise.resolve() }
  })

  const obsoleteLoad = loader.load()
  view.value = 'users'
  await loader.load()
  rejectDashboard(new Error('obsolete failure'))
  await obsoleteLoad

  assert.equal(error.value, '')
})

test('preserves address data when navigation cancels its requests', async () => {
  const addresses = state([{ id: 'existing-address' }])
  const mainlandCities = state([{ id: 'existing-city' }])
  const cancelled = Object.assign(new Error('cancelled'), { kind: 'cancelled' })

  const message = await loadAddressResources({
    addressesApi: {
      list: () => Promise.reject(cancelled),
      cities: () => Promise.reject(cancelled)
    },
    addresses,
    mainlandCities,
    displayMainlandCity: value => value,
    displayError: error => error.message
  })

  assert.deepEqual(addresses.value, [{ id: 'existing-address' }])
  assert.deepEqual(mainlandCities.value, [{ id: 'existing-city' }])
  assert.equal(message, '')
})
