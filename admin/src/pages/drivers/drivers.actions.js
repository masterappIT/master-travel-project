import { ref } from 'vue'
import { primaryDriverVehicle } from '../../utils/drivers.js'
import { composeMainlandPlate, formatHongKongPlateInput, formatMacauPlateInput, formatMainlandPlateInput, mainlandPlateInput, normalizeVehiclePlates, vehiclePlateError } from './vehicle-plates.js'

function requiredVehiclePlateError({ vehicleOwnership, plateType, hkPlate, macauPlate, mainlandPlate }) {
  if ((vehicleOwnership === '香港' || vehicleOwnership === '中國內地' || plateType === '三地牌') && !hkPlate) return '請填寫香港車牌'
  if (vehicleOwnership === '澳門' && !macauPlate) return '請填寫澳門車牌'
  if (plateType !== '單牌' && !mainlandPlate) return '請填寫內地車牌'
  return ''
}

export function createDriversActions({ driversApi, driverForm, selectedDriver, settlementForm, drivers, allVehicles, error, load, displayError, requestConfirmation, notify }) {
  let vehiclePhotoUrl = null
  let driverFormPhotoUrl = null
  const vehicleForm = ref(null)
  const assignmentVehicle = ref(null)
  const vehicleAssignments = ref([])
  function resetVehicleForm() {
    const driver = selectedDriver.value
    vehicleForm.value = { id: '', driverId: driver?.id || '', plateType: '單牌', hkPlate: '', macauPlate: '', mainlandPlate: '', vehicleOwnership: '香港', vehicleCategory: '', vehicleColor: '', vehiclePhotoFile: null, vehiclePhotos: [] }
  }
  function editVehicle(vehicle) { vehicleForm.value = { ...vehicle, vehiclePhotoFile: null, vehiclePhotos: [] } }
  function closeVehicleForm() { vehicleForm.value = null }
  function changeVehicleOwnership() {
    if (!vehicleForm.value) return
    if (vehicleForm.value.vehicleOwnership === '中國內地') vehicleForm.value.plateType = '兩地牌'
    vehicleForm.value.hkPlate = ''; vehicleForm.value.macauPlate = ''; vehicleForm.value.mainlandPlate = ''
  }
  async function saveVehicle() {
    const form = vehicleForm.value
    if (!form) return
    const plates = normalizeVehiclePlates({ ...form, mainlandPlate: composeMainlandPlate(form.mainlandPlate, form.vehicleOwnership) })
    const plateError = vehiclePlateError({ ...plates, vehicleOwnership: form.vehicleOwnership }) || requiredVehiclePlateError({ ...form, ...plates })
    if (form.vehicleOwnership === '中國內地' && form.plateType !== '兩地牌') { error.value = '中國內地車輛只可選擇兩地牌'; return }
    if (plateError || !form.vehicleCategory || !form.vehicleColor) { error.value = plateError || '請填寫車輛類別及顏色'; return }
    try {
      await driversApi.saveVehicle({ ...form, ...plates, id: form.id || undefined })
      closeVehicleForm(); await load(); notify('車輛已儲存')
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }


  const reviewStatusLabel = status => ({ PENDING: '待審核', APPROVED: '已通過', REVISION_REQUIRED: '退回修改', REJECTED: '已拒絕' }[status] || status || '待審核')

  function clearDriverFormPhotoUrl() {
    if (driverFormPhotoUrl) URL.revokeObjectURL(driverFormPhotoUrl)
    driverFormPhotoUrl = null
  }

  function resetDriver() {
    clearDriverFormPhotoUrl()
    driverForm.value = { id: '', driverType: '內部司機', name: '', affiliation: '香港', vehicleOwnership: '香港', plateType: '單牌', hkPlate: '', macauPlate: '', mainlandPlate: '', phoneCountryCode: '+852', phone: '', vehicleCategory: '', vehicleColor: '', vehiclePhotos: [], vehiclePhotoFile: null, vehiclePhotoPersisted: false, removeVehiclePhoto: false }
  }

  function editDriver(item) {
    clearDriverFormPhotoUrl()
    const vehicle = primaryDriverVehicle(item) || {}
    const vehicleOwnership = vehicle.vehicleOwnership || '香港'
    driverForm.value = { driverType: '內部司機', affiliation: '香港', phoneCountryCode: '+852', ...item, vehicleOwnership, plateType: vehicle.plateType || '單牌', hkPlate: vehicle.hkPlate || '', macauPlate: formatMacauPlateInput(vehicle.macauPlate), mainlandPlate: mainlandPlateInput(vehicle.mainlandPlate, vehicleOwnership), vehicleCategory: vehicle.vehicleCategory || '', vehicleColor: vehicle.vehicleColor || '', vehiclePhotos: [], vehiclePhotoFile: null, vehiclePhotoPersisted: Boolean(vehicle.vehiclePhotos?.length), removeVehiclePhoto: false }
  }

  function formatDriverHongKongPlate() {
    if (!driverForm.value) return
    driverForm.value.hkPlate = formatHongKongPlateInput(driverForm.value.hkPlate)
  }

  function formatDriverMacauPlate() {
    if (!driverForm.value) return
    driverForm.value.macauPlate = formatMacauPlateInput(driverForm.value.macauPlate)
  }

  function formatDriverMainlandPlate() {
    if (!driverForm.value) return
    driverForm.value.mainlandPlate = formatMainlandPlateInput(driverForm.value.mainlandPlate)
  }

  function changeDriverOwnership() {
    if (!driverForm.value) return
    if (driverForm.value.vehicleOwnership === '中國內地') driverForm.value.plateType = '兩地牌'
    driverForm.value.hkPlate = ''
    driverForm.value.macauPlate = ''
    driverForm.value.mainlandPlate = ''
  }

  async function uploadDriverPhotos(event) {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return
    const file = files[0]
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { error.value = '車輛相片只支援 JPEG、PNG 或 WebP'; return }
    if (file.size > 2 * 1024 * 1024) { error.value = '車輛相片不可超過 2 MB'; return }
    clearDriverFormPhotoUrl()
    driverFormPhotoUrl = URL.createObjectURL(file)
    driverForm.value.vehiclePhotoFile = file
    driverForm.value.vehiclePhotos = [driverFormPhotoUrl]
    driverForm.value.vehiclePhotoPersisted = false
    driverForm.value.removeVehiclePhoto = false
    error.value = ''
  }

  function removeDriverPhoto() {
    clearDriverFormPhotoUrl()
    driverForm.value.vehiclePhotoFile = null
    driverForm.value.vehiclePhotos = []
    driverForm.value.vehiclePhotoPersisted = false
    driverForm.value.removeVehiclePhoto = true
  }

  async function saveDriver() {
    const vehicleOwnership = driverForm.value.vehicleOwnership || '香港'
    const plates = normalizeVehiclePlates({ ...driverForm.value, mainlandPlate: composeMainlandPlate(driverForm.value.mainlandPlate, vehicleOwnership) })
    const { vehiclePhotoFile, vehiclePhotoPersisted, removeVehiclePhoto, vehiclePhotos, ...driverFields } = driverForm.value
    const form = { ...driverFields, ...plates, vehicleOwnership, driverType: driverForm.value.driverType || '內部司機', name: String(driverForm.value.name || '').trim(), phone: String(driverForm.value.phone || '').trim(), vehicleCategory: String(driverForm.value.vehicleCategory || '').trim(), vehicleColor: String(driverForm.value.vehicleColor || '').trim(), id: driverForm.value.id || undefined }
    const plateError = vehiclePlateError({ ...plates, vehicleOwnership: form.vehicleOwnership }) || requiredVehiclePlateError(form)
    if (plateError) { error.value = plateError; return }
    if (!form.name || !form.affiliation || !form.plateType || !form.phone || !form.vehicleCategory || !form.vehicleColor) { error.value = '請填寫註冊所需資料'; return }
    if (form.vehicleOwnership === '中國內地' && form.plateType !== '兩地牌') { error.value = '中國內地車輛只可選擇兩地牌'; return }
    try {
      await driversApi.save(form, vehiclePhotoFile, removeVehiclePhoto)
      clearDriverFormPhotoUrl()
      driverForm.value = null; error.value = ''; await load()
    } catch (err) { error.value = displayError(err) }
  }

  async function updateDriverStatus(item) {
    const enabled = item.enabled === false
    const confirmed = await requestConfirmation({
      title: enabled ? '恢復司機' : '停用司機',
      message: enabled ? `確定恢復司機「${item.name}」？` : `確定停用司機「${item.name}」？停用後現有登入會立即失效。`,
      confirmLabel: enabled ? '恢復' : '停用',
      danger: !enabled
    })
    if (!confirmed) return
    try {
      const updated = await driversApi.updateStatus(item.id, enabled)
      Object.assign(item, updated)
      if (selectedDriver.value?.id === item.id) selectedDriver.value = { ...selectedDriver.value, ...updated, vehiclePhotoUrl }
      notify(enabled ? '司機已恢復' : '司機已停用')
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  async function removeDriver(item) {
    if (!await requestConfirmation({ title: '永久刪除司機', message: `確定永久刪除司機「${item.name}」？此操作不可恢復；如已有行程、結算或評分歷史，系統將拒絕刪除。`, confirmLabel: '永久刪除', danger: true })) return
    try {
      await driversApi.remove(item.id)
      if (selectedDriver.value?.id === item.id) closeDriverDetail()
      if (driverForm.value?.id === item.id) driverForm.value = null
      notify('司機已永久刪除')
      await load()
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  async function manageVehicleAssignments(vehicle) {
    assignmentVehicle.value = vehicle
    try { vehicleAssignments.value = (await driversApi.listVehicleAssignments(vehicle.id)).data || [] } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  function closeVehicleAssignments() { assignmentVehicle.value = null; vehicleAssignments.value = [] }
  async function bindVehicleDriver(driverId) {
    if (!assignmentVehicle.value || !driverId) return
    try { await driversApi.bindVehicle(driverId, assignmentVehicle.value.id); await manageVehicleAssignments(assignmentVehicle.value); await load(); notify('司機已綁定車輛') } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  async function setPrimaryVehicle(driverId) {
    if (!assignmentVehicle.value || !driverId) return
    try {
      await driversApi.setPrimaryVehicle(driverId, assignmentVehicle.value.id)
      await manageVehicleAssignments(assignmentVehicle.value)
      await load()
      notify('主要車輛已更新')
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  async function unbindVehicleDriver(driverId) {
    if (!assignmentVehicle.value || !driverId) return
    if (!await requestConfirmation({ title: '解除車輛綁定', message: '確定解除這名司機與車輛的綁定？車輛資料不會被刪除。', confirmLabel: '解除綁定', danger: true })) return
    try { await driversApi.unbindVehicle(driverId, assignmentVehicle.value.id); await manageVehicleAssignments(assignmentVehicle.value); await load(); notify('已解除司機綁定') } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  async function refreshDriverVehicles(driver = selectedDriver.value) {
    if (!driver?.id) return
    try {
      const result = await driversApi.listVehicles(driver.id)
      driver.vehicles = result.data || []
    } catch (err) { error.value = displayError(err) }
  }

  async function updateVehicleStatus(vehicle) {
    if (!vehicle) return
    try {
      const updated = await driversApi.updateVehicleStatus(vehicle.id, vehicle.enabled === false)
      Object.assign(vehicle, updated)
      const matchingVehicle = allVehicles?.value?.find(item => item.id === vehicle.id)
      if (matchingVehicle && matchingVehicle !== vehicle) Object.assign(matchingVehicle, updated)
      if (selectedDriver.value) await refreshDriverVehicles(selectedDriver.value)
      notify(vehicle.enabled ? '車輛已恢復' : '車輛已停用')
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  async function removeVehicle(vehicle) {
    if (!vehicle) return
    if (!await requestConfirmation({ title: '刪除車輛', message: `確定刪除車牌「${vehicle.hkPlate || vehicle.macauPlate || vehicle.mainlandPlate || '未設定'}」？`, confirmLabel: '刪除', danger: true })) return
    try { await driversApi.removeVehicle(vehicle.id)
      notify('車輛已刪除')
      await load()
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  async function openDriverDetail(item) {
    if (vehiclePhotoUrl) URL.revokeObjectURL(vehiclePhotoUrl)
    vehiclePhotoUrl = null
    selectedDriver.value = { ...item, vehiclePhotoUrl: null }
    await refreshDriverVehicles(selectedDriver.value)
    if (primaryDriverVehicle(item)?.vehiclePhotos?.length) {
      try {
        vehiclePhotoUrl = URL.createObjectURL(await driversApi.vehiclePhoto(item.id))
        if (selectedDriver.value?.id === item.id) selectedDriver.value = { ...selectedDriver.value, vehiclePhotoUrl }
      } catch (err) { error.value = displayError(err) }
    }
  }
  function previewDriver(item) { openDriverDetail(item) }
  function closeDriverDetail() {
    if (vehiclePhotoUrl) URL.revokeObjectURL(vehiclePhotoUrl)
    vehiclePhotoUrl = null
    selectedDriver.value = null
    settlementForm.value = null
  }

  async function reviewDriver(action, reason = '') {
    const item = selectedDriver.value
    if (!item) return
    try {
      const updated = action === 'approve'
        ? await driversApi.approve(item.id)
        : action === 'revision'
          ? await driversApi.requestRevision(item.id, reason)
          : await driversApi.reject(item.id, reason)
      selectedDriver.value = { ...updated, vehiclePhotoUrl }
      notify(action === 'approve' ? '司機審核已通過' : action === 'revision' ? '已退回司機修改資料' : '已拒絕司機註冊')
      await load()
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  async function approveDriver() {
    if (!await requestConfirmation({ title: '通過司機審核', message: `確認通過「${selectedDriver.value?.name || ''}」的註冊資料？`, confirmLabel: '通過' })) return
    await reviewDriver('approve')
  }

  async function requestDriverRevision() {
    const reason = window.prompt('請輸入退回修改原因')?.trim()
    if (!reason) return
    await reviewDriver('revision', reason)
  }

  async function rejectDriver() {
    const reason = window.prompt('請輸入直接拒絕原因')?.trim()
    if (!reason) return
    if (!await requestConfirmation({ title: '直接拒絕註冊', message: '拒絕後本次註冊將終止，司機無法重新提交。', confirmLabel: '拒絕', danger: true })) return
    await reviewDriver('reject', reason)
  }
  function resetSettlement(item = selectedDriver.value) {
    if (item) settlementForm.value = { driverId: item.id, settlementMethod: item.settlementMethod || '月結', settlementAccount: item.settlementAccount || '' }
  }
  async function saveSettlement() {
    if (!settlementForm.value) return
    try {
      const driver = drivers.value.find(item => item.id === settlementForm.value.driverId)
      if (!driver) return
      await driversApi.updateSettlement(driver.id, {
        settlementMethod: settlementForm.value.settlementMethod,
        settlementAccount: settlementForm.value.settlementAccount
      })
      settlementForm.value = null
      await load()
    } catch (err) { error.value = displayError(err) }
  }

  return { reviewStatusLabel, resetDriver, editDriver, formatDriverHongKongPlate, formatDriverMacauPlate, formatDriverMainlandPlate, changeDriverOwnership, uploadDriverPhotos, removeDriverPhoto, saveDriver, updateDriverStatus, removeDriver, openDriverDetail, previewDriver, closeDriverDetail, approveDriver, requestDriverRevision, rejectDriver, resetSettlement, saveSettlement, refreshDriverVehicles, manageVehicleAssignments, closeVehicleAssignments, bindVehicleDriver, setPrimaryVehicle, unbindVehicleDriver, vehicleAssignments, assignmentVehicle, updateVehicleStatus, removeVehicle, vehicleForm, resetVehicleForm, editVehicle, closeVehicleForm, changeVehicleOwnership, saveVehicle }
}
