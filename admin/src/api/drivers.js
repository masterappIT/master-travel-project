export const createDriversApi = api => ({
  list: () => api('/admin/drivers'),
  save: payload => api('/admin/drivers', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  remove: id => api(`/admin/drivers/${id}`, { method: 'DELETE' }),
  categories: () => api('/admin/vehicle-categories')
})
