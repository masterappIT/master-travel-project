export function createPromotionsActions({ api, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId, pricingCurrency, dateTimeInput, nextTick, load, error, displayError, notify, requestConfirmation, t, openPromotionForm, generateRandomCouponCodeStr, mileageRules, mileageRewardForm, mileageLedger, mileageSelectedAccount, mileageSaving }) {
  async function openPromotionFormAndFocus(form) {
    promotionForm.value = form
    await nextTick()
    const container = document.querySelector('.promo-form-container')
    container?.scrollIntoView({ block: 'start' })
    container?.querySelector('input:not([readonly])')?.focus({ preventScroll: true })
  }
  function resetPromotion(kind = 'CAMPAIGN') {
    return openPromotionFormAndFocus({ id: '', name: '', kind, discountType: 'PERCENTAGE', stackingMode: 'NONE', discountValue: 10, currency: pricingCurrency.value === 'HKD' ? 'HKD$' : 'RMB¥', minimumSpend: 0, maximumDiscount: '', priority: 0, startsAt: '', endsAt: '', enabled: true, couponCode: '', usageLimit: '', membershipLevel: '', originRegion: '', originCity: '', destinationRegion: '', destinationCity: '', weekdays: [], timeStart: '', timeEnd: '' })
  }
  function editPromotion(item) {
    return openPromotionFormAndFocus({ ...item, stackingMode: item.stackingMode || 'NONE', startsAt: dateTimeInput(item.startsAt), endsAt: dateTimeInput(item.endsAt), maximumDiscount: item.maximumDiscount ?? '', usageLimit: item.usageLimit ?? '', weekdays: item.weekdays || [] })
  }
  async function savePromotion() {
    if (promotionSaving.value || !promotionForm.value) return
    promotionSaving.value = true
    try { await api('/admin/promotions', { method: 'POST', body: JSON.stringify(promotionForm.value) }); promotionForm.value = null; notify('優惠設定已成功保存'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { promotionSaving.value = false }
  }
  async function removePromotion(item) {
    if (promotionDeletingId.value) return
    if (!await requestConfirmation({ title: '刪除優惠', message: `確定要刪除優惠「${item.name}」嗎？`, confirmLabel: '刪除', danger: true })) return
    promotionDeletingId.value = item.id
    try { await api(`/admin/promotions/${item.id}`, { method: 'DELETE' }); notify('優惠已刪除'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { promotionDeletingId.value = '' }
  }
  function duplicatePromotion(item) {
    const copy = JSON.parse(JSON.stringify(item)); copy.id = ''; copy.name = `[複製] ${copy.name}`; copy.startsAt = dateTimeInput(copy.startsAt); copy.endsAt = dateTimeInput(copy.endsAt); copy.maximumDiscount = copy.maximumDiscount ?? ''; copy.usageLimit = copy.usageLimit ?? ''; copy.weekdays = copy.weekdays || []
    if (copy.kind === 'COUPON') copy.couponCode = generateRandomCouponCodeStr()
    return openPromotionFormAndFocus(copy)
  }
  async function togglePromotionEnabled(item) {
    if (promotionTogglingId.value) return
    promotionTogglingId.value = item.id
    try { const updated = { ...item, enabled: !item.enabled }; await api('/admin/promotions', { method: 'POST', body: JSON.stringify(updated) }); notify(updated.enabled ? '優惠已啟用' : '優惠已停用'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { promotionTogglingId.value = '' }
  }
  function generateRandomCouponCode() { if (promotionForm.value) promotionForm.value.couponCode = generateRandomCouponCodeStr() }
  function resetMileageReward() {
    mileageRewardForm.value = { id: '', name: '', description: '', cost: 100, enabled: true, stock: '', couponValue: '', couponCurrency: pricingCurrency.value, promotionId: '' }
  }
  function editMileageReward(item) {
    mileageRewardForm.value = { ...item, stock: item.stock ?? '', couponValue: item.couponValue ?? '', promotionId: item.promotionId || '' }
  }
  async function saveMileageRules() {
    if (mileageSaving.value) return
    mileageSaving.value = true
    try { await api('/admin/mileage/rules', { method: 'POST', body: JSON.stringify(mileageRules.value) }); notify('里程規則已保存'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { mileageSaving.value = false }
  }
  async function saveMileageReward() {
    if (mileageSaving.value || !mileageRewardForm.value) return
    mileageSaving.value = true
    try { await api('/admin/mileage/rewards', { method: 'POST', body: JSON.stringify(mileageRewardForm.value) }); mileageRewardForm.value = null; notify('兌換品已保存'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { mileageSaving.value = false }
  }
  async function toggleMileageReward(item) {
    mileageRewardForm.value = { ...item, enabled: !item.enabled, stock: item.stock ?? '', couponValue: item.couponValue ?? '', promotionId: item.promotionId || '' }
    await saveMileageReward()
  }
  async function removeMileageReward(item) {
    if (!await requestConfirmation({ title: '刪除兌換品', message: `確定要刪除「${item.name}」嗎？已有兌換記錄的項目只能停用。`, confirmLabel: '刪除', danger: true })) return
    try { await api(`/admin/mileage/rewards/${item.id}`, { method: 'DELETE' }); notify('兌換品已刪除'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  async function openMileageAccount(account) {
    mileageSelectedAccount.value = account
    try { mileageLedger.value = (await api(`/admin/mileage/accounts/${account.userId}/ledger`)).data }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  async function adjustMileage(account) {
    const amount = Number(account.adjustmentAmount)
    const reason = String(account.adjustmentReason || '').trim()
    if (!Number.isInteger(amount) || amount === 0 || !reason) { notify('請輸入非零整數里程與調整原因', 'error'); return }
    mileageSaving.value = true
    try { await api(`/admin/mileage/accounts/${account.userId}/adjust`, { method: 'POST', body: JSON.stringify({ amount, reason }) }); notify('會員里程已調整'); mileageSelectedAccount.value = null; mileageLedger.value = []; await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { mileageSaving.value = false }
  }
  return { openPromotionForm: openPromotionFormAndFocus, resetPromotion, editPromotion, savePromotion, removePromotion, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode, resetMileageReward, editMileageReward, saveMileageRules, saveMileageReward, toggleMileageReward, removeMileageReward, openMileageAccount, adjustMileage }
}
