import { serializeAdminQuery } from '../utils/admin-query-state.js'

export const createUsersApi = api => ({
  list: (query = {}) => api(`/admin/users${serializeAdminQuery(query)}`),
  options: (query = {}) => api(`/admin/users/options${serializeAdminQuery(query)}`),
  save: (id, payload) => api(id ? `/admin/users/${id}` : '/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  detail: id => api(`/admin/users/${id}`),
  loginMethods: id => api(`/admin/users/${id}`).then(result => result.loginMethods || []),
  verificationCodes: id => api(`/admin/users/${id}`).then(result => result.verificationCodes || []),
  walletTransactions: id => api(`/admin/users/${id}/wallet-transactions`),
  topUpWithdrawalHistory: id => api(`/admin/users/${id}/top-up-withdrawal-history`),
  updateStatus: (id, enabled) => api(`/admin/users/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ enabled })
  }),
  remove: id => api(`/admin/users/${id}`, { method: 'DELETE' }),
  adjustWallet: (id, payload) => api(`/admin/users/${id}/wallet-adjustments`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
})
