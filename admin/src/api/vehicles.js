const assetUrl = (baseUrl, path) => path?.startsWith('/') ? `${baseUrl.replace(/\/$/, '')}${path}` : path || ''

export const createVehiclesApi = (api, baseUrl) => ({
  list: () => api('/admin/vehicles'),
  imageUrl: vehicle => assetUrl(baseUrl, vehicle?.image),
  logoUrl: vehicle => assetUrl(baseUrl, vehicle?.logo),
  save: (payload, vehicleImage = null, vehicleLogo = null, removeVehicleImage = false, removeVehicleLogo = false) => {
    const { hasStoredImage, hasStoredLogo, fallbackImage, imagePreview, logoPreview, vehicleImageFile, vehicleLogoFile, ...fields } = payload
    if (hasStoredImage) fields.image = fallbackImage || ''
    if (!vehicleImage && !vehicleLogo && !removeVehicleImage && !removeVehicleLogo) {
      return api('/admin/vehicles', { method: 'POST', body: JSON.stringify(fields) })
    }
    const form = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value))
    })
    if (vehicleImage) form.append('vehicleImage', vehicleImage)
    if (vehicleLogo) form.append('vehicleLogo', vehicleLogo)
    if (removeVehicleImage) form.append('removeVehicleImage', 'true')
    if (removeVehicleLogo) form.append('removeVehicleLogo', 'true')
    return api('/admin/vehicles', { method: 'POST', body: form })
  },
  image: id => api.blob(`/vehicles/${encodeURIComponent(id)}/image`),
  logo: id => api.blob(`/vehicles/${encodeURIComponent(id)}/logo`)
})
