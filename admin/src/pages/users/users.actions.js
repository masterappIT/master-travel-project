export function createUsersActions({ usersApi, users, selectedUser, userForm, walletTransactions, topUpWithdrawalHistory, walletAdjustment, load, view, requestConfirmation, canWrite, displayError, error, notify }) {
  const edit = item => {
    selectedUser.value = null
    walletAdjustment.value = null
    userForm.value = { ...item }
  }

  const reset = () => {
    selectedUser.value = null
    walletAdjustment.value = null
    userForm.value = { id: '', name: '', displayName: '', countryCode: '+852', phoneNumber: '', email: '', gender: '', region: '', birthday: '' }
  }

  const select = async item => {
    try {
      const [detail, transactions, history] = await Promise.all([
        usersApi.detail(item.id),
        usersApi.walletTransactions(item.id),
        usersApi.topUpWithdrawalHistory(item.id)
      ])
      selectedUser.value = detail
      userForm.value = null
      walletTransactions.value = transactions.data
      topUpWithdrawalHistory.value = history.data
    } catch (err) {
      error.value = displayError(err)
    }
  }

  const save = async () => {
    try {
      const user = await usersApi.save(userForm.value.id, userForm.value)
      userForm.value = null
      view.value = 'users'
      await load()
      await select(user)
    } catch (err) {
      error.value = displayError(err)
    }
  }

  const updateStatus = async item => {
    if (!canWrite.value) return null
    const enabled = item.enabled === false
    const confirmed = await requestConfirmation({
      title: enabled ? '恢復用戶' : '停用用戶',
      message: enabled ? `確定恢復用戶「${item.name || item.phone}」？` : `確定停用用戶「${item.name || item.phone}」？停用後現有登入會立即失效。`,
      confirmLabel: enabled ? '恢復' : '停用',
      danger: !enabled
    })
    if (!confirmed) return null
    try {
      const updated = await usersApi.updateStatus(item.id, enabled)
      Object.assign(item, updated)
      if (selectedUser.value?.id === item.id) selectedUser.value = { ...selectedUser.value, ...updated }
      return updated
    } catch (err) {
      error.value = displayError(err)
      return null
    }
  }

  const remove = async item => {
    if (!canWrite.value) return null
    const confirmed = await requestConfirmation({
      title: '永久刪除用戶',
      message: `確定永久刪除用戶「${item.name || item.phoneNumber}」？此操作不可恢復；如已有行程或財務歷史，系統將拒絕刪除。`,
      confirmLabel: '永久刪除',
      danger: true
    })
    if (!confirmed) return null
    try {
      await usersApi.remove(item.id)
      if (selectedUser.value?.id === item.id) selectedUser.value = null
      if (userForm.value?.id === item.id) userForm.value = null
      walletAdjustment.value = null
      notify('用戶已永久刪除')
      await load()
      return true
    } catch (err) {
      error.value = displayError(err)
      notify(error.value, 'error')
      return null
    }
  }

  const openWalletAdjustment = wallet => {
    walletAdjustment.value = { wallet, direction: 'INCREASE', amount: '', reason: '' }
  }

  const saveWalletAdjustment = async () => {
    try {
      const result = await usersApi.adjustWallet(selectedUser.value.id, walletAdjustment.value)
      walletAdjustment.value = null
      await load()
      await select(result.user)
    } catch (err) {
      error.value = displayError(err)
    }
  }

  return { edit, reset, select, save, updateStatus, remove, openWalletAdjustment, saveWalletAdjustment, users }
}
