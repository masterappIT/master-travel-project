export function createErrorDisplay({ locale, t }) {
  return function displayError(message) {
    const error = typeof message === 'object' && message ? message : null
    if (error?.kind === 'network') return locale.value === 'zh' ? '網路連線失敗，請稍後重試。' : 'Network request failed. Please try again.'
    if (error?.kind === 'unauthorized' || error?.status === 401 || String(error?.message || message).includes('session')) return t('sessionExpired')
    if (error?.kind === 'forbidden' || error?.status === 403) return locale.value === 'zh' ? '您沒有執行此操作的權限。' : 'You do not have permission to perform this action.'
    if (error?.kind === 'not-found' || error?.status === 404) return locale.value === 'zh' ? '找不到要求的資料。' : 'The requested data was not found.'
    const text = error?.message || message || 'Request failed'
    return text === 'Request failed' ? t('requestFailed') : text
  }
}
