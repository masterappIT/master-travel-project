export function createOperationsActions({ personnel, personnelForm, entryItems, entryForm, expenseItems, expenseForm, persistOperations, requestConfirmation, notify }) {
  function resetPersonnel() { personnelForm.value = { id: '', name: '', role: '司機', phone: '', status: '在職' } }
  function editPersonnel(item) { personnelForm.value = { ...item } }
  function savePersonnel() { const form = { ...personnelForm.value, id: personnelForm.value.id || `staff-${Date.now()}` }; personnel.value = personnel.value.some(item => item.id === form.id) ? personnel.value.map(item => item.id === form.id ? form : item) : [form, ...personnel.value]; personnelForm.value = null; persistOperations() }
  async function removePersonnel(item) { if (!await requestConfirmation({ title: '刪除人員', message: `刪除人員「${item.name}」？`, confirmLabel: '刪除', danger: true })) return; personnel.value = personnel.value.filter(record => record.id !== item.id); persistOperations(); notify('人員已刪除') }
  function resetEntryItem() { entryForm.value = { id: '', name: '', category: '接送服務', unit: '趟', price: 0, enabled: true } }
  function editEntryItem(item) { entryForm.value = { ...item } }
  function saveEntryItem() { const form = { ...entryForm.value, id: entryForm.value.id || `entry-${Date.now()}`, price: Number(entryForm.value.price) || 0 }; entryItems.value = entryItems.value.some(item => item.id === form.id) ? entryItems.value.map(item => item.id === form.id ? form : item) : [form, ...entryItems.value]; entryForm.value = null; persistOperations() }
  async function removeEntryItem(item) { if (!await requestConfirmation({ title: '刪除進出項目', message: `刪除項目「${item.name}」？`, confirmLabel: '刪除', danger: true })) return; entryItems.value = entryItems.value.filter(record => record.id !== item.id); persistOperations(); notify('進出項目已刪除') }
  function resetExpense() { expenseForm.value = { id: '', date: new Date().toISOString().slice(0, 10), category: '車輛維護', description: '', amount: 0, status: '待核銷' } }
  function editExpense(item) { expenseForm.value = { ...item } }
  function saveExpense() { const form = { ...expenseForm.value, id: expenseForm.value.id || `expense-${Date.now()}`, amount: Number(expenseForm.value.amount) || 0 }; expenseItems.value = expenseItems.value.some(item => item.id === form.id) ? expenseItems.value.map(item => item.id === form.id ? form : item) : [form, ...expenseItems.value]; expenseForm.value = null; persistOperations() }
  async function removeExpense(item) { if (!await requestConfirmation({ title: '刪除支出', message: `刪除支出「${item.description}」？`, confirmLabel: '刪除', danger: true })) return; expenseItems.value = expenseItems.value.filter(record => record.id !== item.id); persistOperations(); notify('支出已刪除') }
  return { resetPersonnel, editPersonnel, savePersonnel, removePersonnel, resetEntryItem, editEntryItem, saveEntryItem, removeEntryItem, resetExpense, editExpense, saveExpense, removeExpense }
}
