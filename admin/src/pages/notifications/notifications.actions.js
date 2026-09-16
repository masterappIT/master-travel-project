export function createNotificationsActions({ api, notificationForm, notificationRecipientSearch, notificationTemplates, load, error, displayError }) {
  const createTemplate = async (form) => {
    try { await api('/admin/notification-templates', { method: 'POST', body: JSON.stringify(form) }); await load() } catch (err) { error.value = displayError(err); throw err }
  }
  function resetNotification(template = 'order') {
    const templates = { order: { title: '您的跨境出行訂單已確認', content: '您的行程：香港 - 深圳機場（訂單編號：282678634）', audience: 'ALL_USERS', templateType: 'order', important: false, userIds: [], driverIds: [] }, payment: { title: '您的餘額增值已到帳', content: '您的錢包餘額$0.00', audience: 'ALL_USERS', templateType: 'payment', important: false, userIds: [], driverIds: [] }, promotion: { title: '您的餘額提現已到帳', content: '您的錢包餘額$0.00', audience: 'ALL_USERS', templateType: 'promotion', important: false, userIds: [], driverIds: [] }, system: { title: '您的訂單退款已到帳', content: '行程：香港 - 深圳機場（訂單編號：282678634）', audience: 'ALL_USERS', templateType: 'refund', important: false, userIds: [], driverIds: [] } }
    const selected = notificationTemplates.value.find(item => item.type === template)
    notificationForm.value = { ...(selected || templates[template] || templates.order), userIds: [], driverIds: [] }; notificationRecipientSearch.value = ''
  }
  function clearNotificationRecipients() { if (!notificationForm.value) return; notificationForm.value.userIds = []; notificationForm.value.driverIds = [] }
  function toggleNotificationRecipient(type, id, checked) { if (!notificationForm.value) return; const key = type === 'user' ? 'userIds' : 'driverIds'; const ids = new Set(notificationForm.value[key] || []); if (checked) ids.add(id); else ids.delete(id); notificationForm.value[key] = [...ids] }
  function notificationRecipientChecked(type, id) { const key = type === 'user' ? 'userIds' : 'driverIds'; return Boolean(notificationForm.value?.[key]?.includes(id)) }
  async function saveNotification() { if (!notificationForm.value) return; try { await api('/admin/notifications', { method: 'POST', body: JSON.stringify(notificationForm.value) }); notificationForm.value = null; await load() } catch (err) { error.value = displayError(err) } }
  return { resetNotification, createTemplate, clearNotificationRecipients, toggleNotificationRecipient, notificationRecipientChecked, saveNotification }
}
