export function createMembershipActions({ api, membershipForm, membershipPlans, load, error, displayError, requestConfirmation, notify, t }) {
  function editMembership(item) { membershipForm.value = { ...item, benefits: item.benefits.join('\n') } }
  function resetMembership() { membershipForm.value = { id: '', level: '', name: '', monthly: 0, yearly: 0, recommended: false, benefits: '', enabled: true, order: membershipPlans.value.length + 1 } }
  async function saveMembership() {
    try { const form = { ...membershipForm.value, benefits: String(membershipForm.value.benefits).split('\n').map(value => value.trim()).filter(Boolean) }; await api('/admin/membership-plans', { method: 'POST', body: JSON.stringify(form) }); membershipForm.value = null; await load() }
    catch (err) { error.value = displayError(err) }
  }
  async function removeMembership(item) {
    if (!await requestConfirmation({ title: '刪除會員方案', message: `${t('remove')} ${item.name}?`, confirmLabel: '刪除', danger: true })) return
    try { await api(`/admin/membership-plans/${item.id}`, { method: 'DELETE' }); notify('會員方案已刪除'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  return { editMembership, resetMembership, saveMembership, removeMembership }
}
