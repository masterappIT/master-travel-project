export const createDriversApi = api => ({
  list: () => api('/admin/drivers'),
  save: payload => api('/admin/drivers', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  remove: id => api(`/admin/drivers/${id}`, { method: 'DELETE' }),
  approve: id => api(`/admin/drivers/${id}/review/approve`, { method: 'POST' }),
  requestRevision: (id, reason) => api(`/admin/drivers/${id}/review/revision`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reject: (id, reason) => api(`/admin/drivers/${id}/review/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  vehiclePhoto: id => api.blob(`/admin/drivers/${id}/vehicle-photo`),
  categories: () => api('/admin/vehicle-categories')
})
