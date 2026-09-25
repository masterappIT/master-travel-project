import { serializeAdminQuery } from '../utils/admin-query-state.js'

export const createTripsApi = api => ({
  list: (query = {}) => api(`/admin/trips${serializeAdminQuery(query)}`),
  get: id => api(`/admin/trips/${id}`, { cancelOnNavigate: false }),
  update: (id, payload) => api(`/admin/trips/${id}`, { method: 'POST', body: JSON.stringify(payload) }),
  dispatch: (id, payload) => api(`/admin/trips/${id}/dispatch`, { method: 'POST', body: JSON.stringify(payload) }),
  settle: (id, method) => api(`/admin/trips/${id}/settlement`, { method: 'POST', body: JSON.stringify({ method }) }),
  unsettle: id => api(`/admin/trips/${id}/settlement/unsettle`, { method: 'POST' }),
  orderUrls: id => api(`/admin/trips/${id}/order-urls`),
  createOrderUrl: (id, payload) => api(`/admin/trips/${id}/order-url`, { method: 'POST', body: JSON.stringify(payload) }),
  updateOrderUrlExpiry: (tripId, orderUrlId, validUntil) => api(`/admin/trips/${tripId}/order-urls/${orderUrlId}/expiry`, { method: 'POST', body: JSON.stringify({ validUntil }) }),
  copyOrderUrl: (tripId, orderUrlId) => api(`/admin/trips/${tripId}/order-urls/${orderUrlId}/copy`, { method: 'POST' }),
  revokeOrderUrl: (tripId, orderUrlId) => api(`/admin/trips/${tripId}/order-urls/${orderUrlId}/revoke`, { method: 'POST' })
})
