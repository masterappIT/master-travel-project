import { ref } from 'vue'

export function createNotificationsActions({ api, notificationForm, notificationRecipientSearch, notificationTemplates, load, error, displayError, notify, requestConfirmation }) {
  const templateActionId = ref('')
  const createTemplate = async (form) => {
    try { await api('/admin/notification-templates', { method: 'POST', body: JSON.stringify(form) }); notify('模板已新增'); await load() }
    catch (err) { error.value = displayError(err); notify(error.value, 'error'); throw err }
  }
  function resetNotification(templateId) {
    const selected = templateId
      ? notificationTemplates.value.find(item => item.id === templateId && item.enabled)
      : notificationTemplates.value.find(item => item.enabled)
    if (!selected) { notificationForm.value = null; notify('此模板目前不可套用', 'error'); return }
    notificationForm.value = { ...selected, templateId: selected.id, templateType: selected.type, userIds: [], driverIds: [] }
    notificationRecipientSearch.value = ''
  }
  async function setTemplateEnabled(item) {
    if (templateActionId.value) return
    templateActionId.value = item.id
    try {
      await api(`/admin/notification-templates/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ enabled: !item.enabled }) })
      if (notificationForm.value?.templateId === item.id && item.enabled) notificationForm.value = null
      notify(item.enabled ? '模板已停用' : '模板已啟用')
      await load()
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { templateActionId.value = '' }
  }
  async function removeTemplate(item) {
    if (item.builtIn || templateActionId.value) return
    if (!await requestConfirmation({ title: '刪除自訂模板', message: `確定刪除「${item.name}」？已發送消息紀錄會保留。`, confirmLabel: '刪除', danger: true })) return
    templateActionId.value = item.id
    try {
      await api(`/admin/notification-templates/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      if (notificationForm.value?.templateId === item.id) notificationForm.value = null
      notify('自訂模板已刪除')
      await load()
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { templateActionId.value = '' }
  }
  function clearNotificationRecipients() { if (!notificationForm.value) return; notificationForm.value.userIds = []; notificationForm.value.driverIds = [] }
  function toggleNotificationRecipient(type, id, checked) { if (!notificationForm.value) return; const key = type === 'user' ? 'userIds' : 'driverIds'; const ids = new Set(notificationForm.value[key] || []); if (checked) ids.add(id); else ids.delete(id); notificationForm.value[key] = [...ids] }
  function notificationRecipientChecked(type, id) { const key = type === 'user' ? 'userIds' : 'driverIds'; return Boolean(notificationForm.value?.[key]?.includes(id)) }
  const notificationSending = ref(false)
  // A second submit while the confirmation is open would replace the dialog and orphan the first one.
  let confirmingSend = false
  async function saveNotification() {
    const form = notificationForm.value
    if (!form || notificationSending.value || confirmingSend) return
    const target = form.audience === 'ALL_USERS' ? '全體用戶端' : form.audience === 'ALL_DRIVERS' ? '全體司機端' : `指定的 ${(form.userIds?.length || 0) + (form.driverIds?.length || 0)} 位收件人`
    confirmingSend = true
    const confirmed = await requestConfirmation({ title: '發送消息', message: `確定向${target}發送「${form.title}」？發送後無法撤回。`, confirmLabel: '發送' }).finally(() => { confirmingSend = false })
    if (!confirmed) return
    notificationSending.value = true
    try {
      const result = await api('/admin/notifications', { method: 'POST', body: JSON.stringify(form) })
      const skippedParts = [result?.skippedUsers ? `${result.skippedUsers} 位用戶` : '', result?.skippedDrivers ? `${result.skippedDrivers} 位司機` : ''].filter(Boolean)
      const skipped = skippedParts.length ? `；${skippedParts.join('、')}已關閉此類通知，未發送` : ''
      if (!result?.count) { notify(`沒有發送任何消息${skipped}`, 'error'); return }
      notificationForm.value = null
      notify(`已發送 ${result.count} 筆消息${skipped}`)
      await load()
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
    finally { notificationSending.value = false }
  }
  return { templateActionId, notificationSending, resetNotification, createTemplate, setTemplateEnabled, removeTemplate, clearNotificationRecipients, toggleNotificationRecipient, notificationRecipientChecked, saveNotification }
}
