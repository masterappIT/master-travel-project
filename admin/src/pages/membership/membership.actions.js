export function createMembershipActions({ api, membershipForm, membershipPlans, load, error, displayError, requestConfirmation, notify, t }) {
  function editMembership(item) { membershipForm.value = { ...item, benefits: item.benefits.join('\n') } }
  function resetMembership() { membershipForm.value = { id: '', level: '', name: '', description: '', monthly: 0, yearly: 0, voucherCount: 0, mileageRate: 1, recommended: false, benefits: '', enabled: true, order: membershipPlans.value.length + 1 } }
  async function saveMembership() {
    try { const form = { ...membershipForm.value, benefits: String(membershipForm.value.benefits).split('\n').map(value => value.trim()).filter(Boolean) }; await api('/admin/membership-plans', { method: 'POST', body: JSON.stringify(form) }); membershipForm.value = null; await load() }
    catch (err) { error.value = displayError(err) }
  }
  async function removeMembership(item) {
    if (!await requestConfirmation({ title: '停用會員方案', message: `確定停用 ${item.name}？既有會員不受影響。`, confirmLabel: '停用', danger: true })) return
    try { await api(`/admin/membership-plans/${item.id}`, { method: 'DELETE' }); notify('會員方案已停用'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  async function confirmMembershipOrder(item) {
    if (!await requestConfirmation({ title: '確認會員訂單', message: `確認 ${item.user.displayName || item.user.name || item.user.phoneNumber} 的 ${item.plan.name} 訂單已收款並立即啟用？`, confirmLabel: '確認啟用' })) return
    try { await api(`/admin/membership-orders/${item.id}/confirm`, { method: 'POST' }); notify('會員會籍已啟用'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  return { editMembership, resetMembership, saveMembership, removeMembership, confirmMembershipOrder }
}
