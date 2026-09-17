export const createDriversApi = api => ({
  list: () => api('/admin/drivers'),
  save: (payload, vehiclePhoto = null, removeVehiclePhoto = false) => {
    if (!vehiclePhoto && !removeVehiclePhoto) {
      return api('/admin/drivers', { method: 'POST', body: JSON.stringify(payload) })
    }
    const form = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'vehiclePhotos') form.append(key, String(value))
    })
    if (vehiclePhoto) form.append('vehiclePhoto', vehiclePhoto)
    if (removeVehiclePhoto) form.append('removeVehiclePhoto', 'true')
    return api('/admin/drivers', { method: 'POST', body: form })
  },
  remove: id => api(`/admin/drivers/${id}`, { method: 'DELETE' }),
  approve: id => api(`/admin/drivers/${id}/review/approve`, { method: 'POST' }),
  requestRevision: (id, reason) => api(`/admin/drivers/${id}/review/revision`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reject: (id, reason) => api(`/admin/drivers/${id}/review/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  vehiclePhoto: id => api.blob(`/admin/drivers/${id}/vehicle-photo`),
  categories: () => api('/admin/vehicle-categories')
})
