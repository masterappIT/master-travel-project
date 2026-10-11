import assert from 'node:assert/strict'
import test from 'node:test'
import { createRenderer, h, ref } from 'vue'
import { useSupportPage } from '../src/pages/support/support.state.js'

const renderer = createRenderer({
  createElement: type => ({ type, children: [] }),
  createText: text => ({ text }),
  createComment: text => ({ comment: text }),
  setText: (node, text) => { node.text = text },
  setElementText: (node, text) => { node.text = text },
  patchProp: () => {},
  parentNode: node => node.parent,
  nextSibling: () => null,
  insert: (node, parent) => { node.parent = parent; parent.children.push(node) },
  remove: () => {},
  insertStaticContent: (content, parent) => { const node = { content, parent }; parent.children.push(node); return [node, node] }
})

function mountSupport(api) {
  const supportSettings = ref({ enabled: true, guestEnabled: true, directContactEnabled: true })
  let page
  const app = renderer.createApp({
    setup() {
      page = useSupportPage({
        api,
        canWrite: ref(true),
        isSuperAdministrator: ref(true),
        supportSettings,
        settingsLoader: { invalidate() {} },
        notify() {},
        requestConfirmation: async () => true,
        displayError: cause => cause.message
      })
      return () => h('div')
    }
  })
  app.mount({ children: [] })
  return { page, close: () => app.unmount() }
}

test('outbound action opens an existing account conversation and selects it', async () => {
  const calls = []
  const view = mountSupport(async (path, options = {}) => {
    calls.push([path, options.method || 'GET'])
    if (path === '/admin/support/conversations' && options.method === 'POST') return { id: 'conversation-1' }
    if (path === '/admin/support/conversations') return { data: [{ id: 'conversation-1', participantType: 'PASSENGER', participantId: 'account-1' }] }
    if (path === '/admin/support/conversations/conversation-1/messages') return { data: [] }
    if (path === '/admin/users/account-1') return { id: 'account-1' }
    throw new Error(`Unexpected request: ${path}`)
  })
  try {
    assert.equal(typeof view.page.openRecipient, 'function')
    view.page.recipientLookupMode.value = 'ID'
    view.page.recipientId.value = 'account-1'
    await view.page.openRecipient()
    assert.equal(view.page.section.value, 'inbox')
    assert.equal(view.page.selectedId.value, 'conversation-1')
    assert.deepEqual(calls[0], ['/admin/support/conversations', 'POST'])
    assert.equal(view.page.actionError.value, '')
  } finally { view.close() }
})

test('phone lookup lets an administrator select the matching account', async () => {
  const view = mountSupport(async path => {
    assert.equal(path, '/admin/users/options?page=1&pageSize=20&search=66996688')
    return { data: [{ id: 'account-1', phone: '+852 66996688' }] }
  })
  try {
    view.page.recipientPhone.value = '66996688'
    await view.page.searchRecipients()
    assert.equal(view.page.recipientOptions.value.length, 1)
    view.page.selectRecipient(view.page.recipientOptions.value[0])
    assert.equal(view.page.recipientId.value, 'account-1')
    assert.equal(view.page.recipientSearchError.value, '')
  } finally { view.close() }
})

test('support settings save updates the saved state after a successful response', async () => {
  const view = mountSupport(async (path, options = {}) => {
    assert.equal(path, '/settings')
    assert.equal(options.method, 'POST')
    return { support: { enabled: true, guestEnabled: true, directContactEnabled: true } }
  })
  try {
    view.page.settingsDraft.guestEnabled = false
    await view.page.saveSettings()
    assert.equal(view.page.settingsSaved.value, true)
    assert.equal(view.page.savingSettings.value, false)
  } finally { view.close() }
})
