const MAX_VEHICLE_ASSET_BYTES = 2 * 1024 * 1024
const VEHICLE_ASSET_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片無法讀取')) }
    image.src = url
  })
}

async function compressVehicleAsset(file) {
  if (file.size <= MAX_VEHICLE_ASSET_BYTES) return file
  const image = await loadImage(file)
  let width = image.naturalWidth
  let height = image.naturalHeight
  let quality = 0.9
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width))
    canvas.height = Math.max(1, Math.round(height))
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type, quality))
    if (!blob) throw new Error('圖片壓縮失敗')
    if (blob.size <= MAX_VEHICLE_ASSET_BYTES) return new File([blob], file.name, { type: file.type, lastModified: Date.now() })
    width *= 0.82
    height *= 0.82
    quality = Math.max(0.55, quality - 0.05)
  }
  throw new Error('圖片壓縮後仍超過 2 MB')
}

export function createVehiclesActions({ api, vehiclesApi, view, categories, vehicles, extras, distancePricing, routeMinimumFareForm, categoryForm, vehicleForm, extraForm, pricingCurrency, severeWeatherEnabled, extraSortId, load, error, displayError, requestConfirmation, notify, t }) {
  let vehicleImageUrl = null
  let vehicleLogoUrl = null
  function clearVehicleImageUrl() {
    if (vehicleImageUrl) URL.revokeObjectURL(vehicleImageUrl)
    vehicleImageUrl = null
  }
  function clearVehicleLogoUrl() {
    if (vehicleLogoUrl) URL.revokeObjectURL(vehicleLogoUrl)
    vehicleLogoUrl = null
  }
  function editExtra(item) { extraForm.value = { triggerType: item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE'), triggerEnabled: item.triggerEnabled !== false, nightStartTime: item.nightStartTime || '22:00', nightEndTime: item.nightEndTime || '06:00', ...item } }
  function resetExtra() { extraForm.value = { id: '', label: '', price: 0, currency: pricingCurrency.value === 'HKD' ? 'HKD$' : 'RMB¥', enabled: true, order: extras.value.length + 1, requiredForImmediate: false, requiredWithinMinutes: null, triggerType: 'NONE', triggerEnabled: true, nightStartTime: '22:00', nightEndTime: '06:00' } }
  async function saveExtra() { const currentView = view.value; try { const form = extraForm.value; await api('/admin/vehicle-extras', { method: 'POST', body: JSON.stringify({ ...form, requiredForImmediate: form.triggerType === 'IMMEDIATE' }) }); if (form.triggerType === 'WEATHER') await api('/settings', { method: 'POST', body: JSON.stringify({ severeWeatherEnabled: severeWeatherEnabled.value }) }); extraForm.value = null; view.value = currentView; await load(); view.value = currentView } catch (err) { view.value = currentView; error.value = displayError(err) } }
  async function moveExtra(direction) { const index = extras.value.findIndex(extra => extra.id === extraSortId.value); const target = index + direction; if (index < 0 || target < 0 || target >= extras.value.length) return; const reordered = [...extras.value]; const [item] = reordered.splice(index, 1); reordered.splice(target, 0, item); try { await Promise.all(reordered.map((extra, order) => api('/admin/vehicle-extras', { method: 'POST', body: JSON.stringify({ ...extra, order: order + 1 }) }))); await load() } catch (err) { error.value = displayError(err) } }
  async function showOnlyExtra(item) { const currentView = view.value; try { await Promise.all(extras.value.filter(extra => extra.id !== item.id && extra.enabled !== false).map(extra => api('/admin/vehicle-extras', { method: 'POST', body: JSON.stringify({ ...extra, enabled: false }) }))); await api('/admin/vehicle-extras', { method: 'POST', body: JSON.stringify({ ...item, enabled: true }) }); await load(); view.value = currentView } catch (err) { error.value = displayError(err) } }
  async function toggleSevereWeather() { try { const updated = await api('/settings', { method: 'POST', body: JSON.stringify({ severeWeatherEnabled: !severeWeatherEnabled.value }) }); severeWeatherEnabled.value = Boolean(updated.severeWeatherEnabled) } catch (err) { error.value = displayError(err) } }
  async function removeExtra(item) { if (!await requestConfirmation({ title: '刪除額外服務', message: `${t('remove')} ${item.label}?`, confirmLabel: '刪除', danger: true })) return; try { await api(`/admin/vehicle-extras/${item.id}`, { method: 'DELETE' }); notify('額外服務已刪除'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') } }
  function editVehicle(item) {
    clearVehicleImageUrl()
    clearVehicleLogoUrl()
    vehicleForm.value = { ...item, imagePreview: vehiclesApi.imageUrl(item), logoPreview: vehiclesApi.logoUrl(item), vehicleImageFile: null, vehicleLogoFile: null, removeVehicleImage: false, removeVehicleLogo: false }
  }
  function editCategory(item) { categoryForm.value = { ...item } }
  function resetCategory() { categoryForm.value = { id: '', name: '', tabLabel: '', order: categories.value.length + 1, enabled: true } }
  function resetVehicle() {
    clearVehicleImageUrl()
    clearVehicleLogoUrl()
    vehicleForm.value = { id: crypto.randomUUID(), categoryId: categories.value[0]?.id || '', brand: '', model: '', series: '', seats: 4, image: '', fallbackImage: '', hasStoredImage: false, hasStoredLogo: false, imagePreview: '', logoPreview: '', vehicleImageFile: null, vehicleLogoFile: null, removeVehicleImage: false, removeVehicleLogo: false, colorLabel: '不限顏色', modelChoiceLabel: '', enabled: true, order: 1 }
  }
  async function assignVehicleAsset(event, kind) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const label = kind === 'image' ? '車型圖片' : '車型 Logo'
    if (!VEHICLE_ASSET_TYPES.includes(file.type)) { error.value = `${label}只支援 JPEG、PNG 或 WebP`; return }
    try {
      const compressed = await compressVehicleAsset(file)
      if (kind === 'image') {
        clearVehicleImageUrl()
        vehicleImageUrl = URL.createObjectURL(compressed)
        vehicleForm.value.vehicleImageFile = compressed
        vehicleForm.value.imagePreview = vehicleImageUrl
        vehicleForm.value.removeVehicleImage = false
      } else {
        clearVehicleLogoUrl()
        vehicleLogoUrl = URL.createObjectURL(compressed)
        vehicleForm.value.vehicleLogoFile = compressed
        vehicleForm.value.logoPreview = vehicleLogoUrl
        vehicleForm.value.removeVehicleLogo = false
      }
      error.value = ''
    } catch (err) { error.value = err instanceof Error ? err.message : `${label}壓縮失敗` }
  }
  function uploadVehicleImage(event) { return assignVehicleAsset(event, 'image') }
  function uploadVehicleLogo(event) { return assignVehicleAsset(event, 'logo') }
  function removeVehicleImage() {
    const form = vehicleForm.value
    if (!form) return
    clearVehicleImageUrl()
    form.vehicleImageFile = null
    form.removeVehicleImage = Boolean(form.hasStoredImage)
    form.imagePreview = form.fallbackImage || ''
  }
  function removeVehicleLogo() {
    const form = vehicleForm.value
    if (!form) return
    clearVehicleLogoUrl()
    form.vehicleLogoFile = null
    form.removeVehicleLogo = Boolean(form.hasStoredLogo)
    form.logoPreview = ''
  }
  function closeVehicleForm() {
    clearVehicleImageUrl()
    clearVehicleLogoUrl()
    vehicleForm.value = null
  }
  async function saveCategory() { try { await api('/admin/vehicle-categories', { method: 'POST', body: JSON.stringify(categoryForm.value) }); categoryForm.value = null; await load() } catch (err) { error.value = displayError(err) } }
  async function toggleCategory(item) { try { await api('/admin/vehicle-categories', { method: 'POST', body: JSON.stringify({ ...item, enabled: !item.enabled }) }); await load() } catch (err) { error.value = displayError(err) } }
  async function saveVehicle() {
    const form = vehicleForm.value
    if (!form?.vehicleImageFile && !form?.imagePreview) { error.value = '請上傳車型圖片'; return }
    try {
      await vehiclesApi.save(form, form.vehicleImageFile, form.vehicleLogoFile, form.removeVehicleImage, form.removeVehicleLogo)
      closeVehicleForm()
      await load()
    } catch (err) { error.value = displayError(err) }
  }
  async function toggleVehicle(item) { try { await vehiclesApi.save({ ...item, enabled: !item.enabled }); await load() } catch (err) { error.value = displayError(err) } }
  async function removeCategory(item) { if (!await requestConfirmation({ title: '刪除車型分類', message: `${t('remove')} ${item.name}?`, confirmLabel: '刪除', danger: true })) return; try { await api(`/admin/vehicle-categories/${item.id}`, { method: 'DELETE' }); notify('車型分類已刪除'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') } }
  async function removeVehicle(item) { if (!await requestConfirmation({ title: '刪除車型', message: `${t('remove')} ${item.model}?`, confirmLabel: '刪除', danger: true })) return; try { await api(`/admin/vehicles/${item.id}`, { method: 'DELETE' }); notify('車型已刪除'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') } }
  return { editExtra, resetExtra, saveExtra, moveExtra, showOnlyExtra, toggleSevereWeather, removeExtra, editVehicle, editCategory, resetCategory, resetVehicle, uploadVehicleImage, uploadVehicleLogo, removeVehicleImage, removeVehicleLogo, closeVehicleForm, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle }
}
