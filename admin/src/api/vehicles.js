export const createVehiclesApi = (api, baseUrl) => ({
  list: () => api('/admin/vehicles'),
  imageUrl: vehicle => vehicle?.image?.startsWith('/') ? `${baseUrl.replace(/\/$/, '')}${vehicle.image}` : vehicle?.image || '',
  save: (payload, vehicleImage = null, removeVehicleImage = false) => {
    const { hasStoredImage, fallbackImage, imagePreview, vehicleImageFile, ...fields } = payload
    if (hasStoredImage) fields.image = fallbackImage || ''
    if (!vehicleImage && !removeVehicleImage) {
      return api('/admin/vehicles', { method: 'POST', body: JSON.stringify(fields) })
    }
    const form = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value))
    })
    if (vehicleImage) form.append('vehicleImage', vehicleImage)
    if (removeVehicleImage) form.append('removeVehicleImage', 'true')
    return api('/admin/vehicles', { method: 'POST', body: form })
  },
  image: id => api.blob(`/vehicles/${encodeURIComponent(id)}/image`)
})
