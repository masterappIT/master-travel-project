export function createAdministratorsActions({ api, administratorForm, load, error, displayError, requestConfirmation, notify }) {
  function resetAdministrator() { administratorForm.value = { id: '', username: '', displayName: '', role: 'OPERATOR', enabled: true, password: '' } }
  function editAdministrator(item) { administratorForm.value = { ...item, password: '' } }
  async function saveAdministrator() { try { await api('/admin/administrators', { method: 'POST', body: JSON.stringify(administratorForm.value) }); administratorForm.value = null; await load() } catch (err) { error.value = displayError(err) } }
  async function disableAdministrator(item) { if (!await requestConfirmation({ title: '停用管理員', message: `確定停用 ${item.displayName}？`, confirmLabel: '停用', danger: true })) return; try { await api(`/admin/administrators/${item.id}`, { method: 'DELETE' }); notify('管理員已停用'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') } }
  return { resetAdministrator, editAdministrator, saveAdministrator, disableAdministrator }
}
