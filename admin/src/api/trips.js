export const createTripsApi = api => ({
  list: () => api('/admin/trips'),
  update: (id, payload) => api(`/admin/trips/${id}`, { method: 'POST', body: JSON.stringify(payload) }),
  dispatch: (id, driverId) => api(`/admin/trips/${id}/dispatch`, { method: 'POST', body: JSON.stringify({ driverId }) }),
  settle: (id, method) => api(`/admin/trips/${id}/settlement`, { method: 'POST', body: JSON.stringify({ method }) }),
  unsettle: id => api(`/admin/trips/${id}/settlement/unsettle`, { method: 'POST' }),
  orderUrls: id => api(`/admin/trips/${id}/order-urls`),
  createOrderUrl: (id, payload) => api(`/admin/trips/${id}/order-url`, { method: 'POST', body: JSON.stringify(payload) }),
  revokeOrderUrl: (tripId, orderUrlId) => api(`/admin/trips/${tripId}/order-urls/${orderUrlId}/revoke`, { method: 'POST' })
})
