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
  updateStatus: (id, enabled) => api(`/admin/drivers/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ enabled })
  }),
  updateSettlement: (id, payload) => api(`/admin/drivers/${id}/settlement`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),
  approve: id => api(`/admin/drivers/${id}/review/approve`, { method: 'POST' }),
  requestRevision: (id, reason) => api(`/admin/drivers/${id}/review/revision`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reject: (id, reason) => api(`/admin/drivers/${id}/review/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  vehiclePhoto: id => api.blob(`/admin/drivers/${id}/vehicle-photo`),
  categories: () => api('/admin/vehicle-categories'),
  listVehicles: driverId => api(`/admin/drivers/${driverId}/vehicles`),
  listTrips: (driverId, { page = 1, pageSize = 10 } = {}) => api(`/admin/drivers/${driverId}/trips?page=${page}&pageSize=${pageSize}`),
  listAllVehicles: () => api('/admin/driver-vehicles'),
  vehiclePhotoByVehicle: (id, options = {}) => api.blob(`/admin/driver-vehicles/${encodeURIComponent(id)}/photo`, options),
  vehiclePhotoThumbnailByVehicle: (id, options = {}) => api.blob(`/admin/driver-vehicles/${encodeURIComponent(id)}/photo/thumbnail`, options),
  saveVehicle: payload => {
    const form = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'vehiclePhotos' && key !== 'vehiclePhotoFile') form.append(key, String(value))
    })
    if (payload.vehiclePhotoFile) form.append('vehiclePhoto', payload.vehiclePhotoFile)
    return api(payload.id ? `/admin/driver-vehicles/${payload.id}` : '/admin/driver-vehicles', { method: payload.id ? 'PATCH' : 'POST', body: form })
  },
  updateVehicleStatus: (id, enabled) => api(`/admin/driver-vehicles/${id}/status`, { method: 'POST', body: JSON.stringify({ enabled }) }),
  listVehicleAssignments: id => api(`/admin/driver-vehicles/${id}/assignments`),
  bindVehicle: (driverId, id) => api(`/admin/drivers/${driverId}/vehicles/${id}/bind`, { method: 'POST' }),
  setPrimaryVehicle: (driverId, id) => api(`/admin/drivers/${driverId}/vehicles/${id}/primary`, { method: 'POST' }),
  unbindVehicle: (driverId, id) => api(`/admin/drivers/${driverId}/vehicles/${id}/bind`, { method: 'DELETE' }),
  removeVehicle: id => api(`/admin/driver-vehicles/${id}`, { method: 'DELETE' }),
})
