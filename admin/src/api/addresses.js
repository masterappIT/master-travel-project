export const createAddressesApi = api => ({
  list: () => api('/admin/recommended-addresses'),
  save: (id, payload) => api(id ? `/admin/recommended-addresses/${id}` : '/admin/recommended-addresses', {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(payload)
  }),
  remove: id => api(`/admin/recommended-addresses/${id}`, { method: 'DELETE' }),
  cities: () => api('/admin/mainland-cities'),
  saveCity: payload => api('/admin/mainland-cities', { method: 'POST', body: JSON.stringify(payload) }),
  removeCity: id => api(`/admin/mainland-cities/${id}`, { method: 'DELETE' }),
  search: (keyword, region, city = '') => {
    const cityQuery = city ? `&city=${encodeURIComponent(city)}` : ''
    return api(`/location/search?keyword=${encodeURIComponent(keyword)}&region=${encodeURIComponent(region)}${cityQuery}`)
  }
})
