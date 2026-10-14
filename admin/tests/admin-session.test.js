import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminSessionActions } from '../src/utils/admin-session.js'

const state = value => ({ value })

function createSession(api) {
  const session = {
    token: state(''),
    username: state('admin'),
    password: state('secret'),
    signingIn: state(false),
    signInSlow: state(false),
    currentAdministrator: state(null),
    error: state(''),
    loads: 0
  }
  const actions = createAdminSessionActions({
    api,
    ...session,
    adminLogo: state(''),
    dashboard: state(null),
    dashboardUpdatedAt: state(null),
    dashboardRefreshFailed: state(false),
    view: state('dashboard'),
    load: () => { session.loads += 1 },
    displayError: error => `display:${error.message}`,
    t: key => `t:${key}`
  })
  return { session, ...actions }
}

test('ignores repeat submits while a slow sign-in is pending and says it is still connecting', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let requests = 0
  let respond
  const api = () => {
    requests += 1
    return new Promise(resolve => { respond = resolve })
  }
  const { session, apiLogin } = createSession(api)

  const pending = apiLogin()
  await apiLogin()
  assert.equal(requests, 1)
  assert.equal(session.signingIn.value, true)
  assert.equal(session.signInSlow.value, false)

  t.mock.timers.tick(1500)
  assert.equal(session.signInSlow.value, true)

  respond({ administrator: { id: 'admin-1' } })
  await pending
  assert.equal(session.token.value, 'cookie-session')
  assert.equal(session.loads, 1)
  assert.equal(session.signingIn.value, false)
  assert.equal(session.signInSlow.value, false)
})

test('reports rejected credentials instead of an expired session and allows another attempt', async () => {
  const unauthorized = Object.assign(new Error('Invalid admin credentials'), { status: 401, kind: 'unauthorized' })
  const { session, apiLogin } = createSession(() => Promise.reject(unauthorized))

  await apiLogin()
  assert.equal(session.error.value, 't:invalidCredentials')
  assert.equal(session.token.value, '')
  assert.equal(session.signingIn.value, false)
  assert.equal(session.loads, 0)
})

test('keeps the shared error display for other sign-in failures', async () => {
  const network = Object.assign(new Error('Network request failed'), { kind: 'network' })
  const { session, apiLogin } = createSession(() => Promise.reject(network))

  await apiLogin()
  assert.equal(session.error.value, 'display:Network request failed')
  assert.equal(session.signingIn.value, false)
})
