export function createSupportApi(api) {
  return {
    listConversations: () => api('/admin/support/conversations', { cancelOnNavigate: false }),
    listMessages: id => api(`/admin/support/conversations/${encodeURIComponent(id)}/messages`, { cancelOnNavigate: false }),
    sendMessage: (id, text, clientMessageId) => api(`/admin/support/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ text, clientMessageId }) }),
    openConversation: (participantType, participantId) => api('/admin/support/conversations', { method: 'POST', body: JSON.stringify({ participantType, participantId }) }),
    listAgents: () => api('/admin/support/agents', { cancelOnNavigate: false }),
    createAgent: form => api('/admin/support/agents', { method: 'POST', body: JSON.stringify(form) }),
    setAgentEnabled: (id, enabled) => api(`/admin/support/agents/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
    saveSettings: support => api('/settings', { method: 'POST', body: JSON.stringify({ support }) })
  }
}
