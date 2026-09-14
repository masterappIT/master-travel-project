export function createPromotionsActions({ api, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId, pricingCurrency, dateTimeInput, nextTick, load, error, displayError, notify, requestConfirmation, t, openPromotionForm, generateRandomCouponCodeStr }) {
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
  return { openPromotionForm: openPromotionFormAndFocus, resetPromotion, editPromotion, savePromotion, removePromotion, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode }
}
