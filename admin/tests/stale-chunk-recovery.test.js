import assert from 'node:assert/strict'
import test from 'node:test'
import { createStaleChunkRecovery, STALE_BUILD_ERROR_KIND } from '../src/utils/stale-chunk-recovery.js'
import { createErrorDisplay } from '../src/utils/error-display.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => { values.set(key, String(value)) }
  }
}

test('reloads once before the app starts and not again within the cooldown', async () => {
  let reloads = 0
  let currentTime = 1000000
  const recovery = createStaleChunkRecovery({ storage: createStorage(), reload: () => { reloads += 1 }, now: () => currentTime })

  await recovery.handlePreloadError({ payload: new TypeError('Importing a module script failed.') })
  assert.equal(reloads, 1)

  currentTime += 5000
  await recovery.handlePreloadError({ payload: new TypeError('Importing a module script failed.') })
  assert.equal(reloads, 1)

  currentTime += 60000
  await recovery.handlePreloadError({ payload: new TypeError('Importing a module script failed.') })
  assert.equal(reloads, 2)
})

test('does not reload when the reload marker cannot be stored', async () => {
  let reloads = 0
  const storage = { getItem: () => null, setItem: () => { throw new Error('storage unavailable') } }
  const recovery = createStaleChunkRecovery({ storage, reload: () => { reloads += 1 } })

  await recovery.handlePreloadError({ payload: new TypeError('failed') })
  assert.equal(reloads, 0)
})

test('asks before reloading once the app is running', async () => {
  let reloads = 0
  let prompts = 0
  let answer
  const recovery = createStaleChunkRecovery({ storage: createStorage(), reload: () => { reloads += 1 } })
  recovery.setPrompt(() => { prompts += 1; return new Promise(resolve => { answer = resolve }) })

  const first = recovery.handlePreloadError({ payload: new TypeError('failed') })
  const second = recovery.handlePreloadError({ payload: new TypeError('failed') })
  assert.equal(prompts, 1)
  answer(false)
  await Promise.all([first, second])
  assert.equal(reloads, 0)

  const third = recovery.handlePreloadError({ payload: new TypeError('failed') })
  assert.equal(prompts, 2)
  answer(true)
  await third
  assert.equal(reloads, 1)
})

test('shows a refresh instruction instead of the raw browser import error', async () => {
  const error = new TypeError('Importing a module script failed.')
  const recovery = createStaleChunkRecovery({ storage: createStorage(), reload: () => {} })
  recovery.setPrompt(async () => false)
  await recovery.handlePreloadError({ payload: error })

  assert.equal(error.kind, STALE_BUILD_ERROR_KIND)
  const t = key => key
  assert.equal(createErrorDisplay({ locale: { value: 'zh' }, t })(error), '後台已更新版本，請重新整理頁面後再繼續。')
  assert.equal(createErrorDisplay({ locale: { value: 'en' }, t })(error), 'The admin console has been updated. Please refresh the page to continue.')
})
