function cookieValue(name) {
  const prefix = `${encodeURIComponent(name)}=`
  const item = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(prefix))
  return item ? decodeURIComponent(item.slice(prefix.length)) : ''
}

export function createApiClient({ baseUrl, getToken, onUnauthorized }) {
  const mutationListeners = new Set()
  let activeReadController = null

  function beginReadScope() {
    activeReadController?.abort()
    activeReadController = new AbortController()
    return activeReadController.signal
  }

  async function request(path, options = {}) {
    let response
    const { cancelOnNavigate = true, ...fetchOptions } = options
    const isFormData = fetchOptions.body instanceof FormData
    const method = (fetchOptions.method || 'GET').toUpperCase()
    const csrfToken = method === 'GET' || method === 'HEAD' ? '' : cookieValue('admin_csrf')
    const isScopedRead = cancelOnNavigate && (method === 'GET' || method === 'HEAD') && !fetchOptions.signal
    const signal = fetchOptions.signal || (isScopedRead ? activeReadController?.signal : undefined)
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...fetchOptions,
        ...(signal ? { signal } : {}),
        credentials: 'include',
        headers: {
          ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
          ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}),
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          ...(fetchOptions.headers || {})
        }
      })
    } catch (cause) {
      if (signal?.aborted || cause?.name === 'AbortError') {
        const error = new Error('Request cancelled')
        error.kind = 'cancelled'
        error.retryable = false
        error.cause = cause
        throw error
      }
      const error = new Error('Network request failed')
      error.kind = 'network'
      error.retryable = true
      error.cause = cause
      throw error
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const error = new Error(payload.message || response.statusText || 'Request failed')
      error.status = response.status
      error.kind = response.status === 401 ? 'unauthorized' : response.status === 403 ? 'forbidden' : response.status === 404 ? 'not-found' : 'http'
      error.retryable = response.status >= 500
      const obsoleteScopedRead = isScopedRead && signal !== activeReadController?.signal
      if (response.status === 401 && !obsoleteScopedRead) onUnauthorized()
      throw error
    }

    return response
  }

  const api = async (path, options = {}) => {
    const response = await request(path, options)
    const payload = response.status === 204 ? null : await response.json()
    const method = (options.method || 'GET').toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') {
      for (const listener of mutationListeners) listener({ path, method, payload })
    }
    return payload
  }
  api.blob = async (path, options = {}) => (await request(path, options)).blob()
  api.beginReadScope = beginReadScope
  api.onMutation = listener => {
    mutationListeners.add(listener)
    return () => mutationListeners.delete(listener)
  }
  return api
}
