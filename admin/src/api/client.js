export function createApiClient({ baseUrl, getToken, onUnauthorized }) {
  async function request(path, options = {}) {
    let response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}),
          ...(options.headers || {})
        }
      })
    } catch (cause) {
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
      if (response.status === 401) onUnauthorized()
      throw error
    }

    return response
  }

  const api = async (path, options = {}) => {
    const response = await request(path, options)
    if (response.status === 204) return null
    return response.json()
  }
  api.blob = async (path, options = {}) => (await request(path, options)).blob()
  return api
}
