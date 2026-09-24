import assert from 'node:assert/strict'
import test from 'node:test'
import { createDriversApi } from '../src/api/drivers.js'

test('loads a paginated driver trip history', async () => {
  let requestedPath = ''
  const api = async path => {
    requestedPath = path
    return { data: [], total: 0, page: 2, pageSize: 10, pageCount: 1 }
  }

  const result = await createDriversApi(api).listTrips('driver-123', { page: 2, pageSize: 10 })

  assert.equal(requestedPath, '/admin/drivers/driver-123/trips?page=2&pageSize=10')
  assert.equal(result.page, 2)
})
