export function createSupportApi(api) {
  return {
    listConversations: () => api('/admin/support/conversations', { cancelOnNavigate: false }),
    listMessages: id => api(`/admin/support/conversations/${encodeURIComponent(id)}/messages`, { cancelOnNavigate: false }),
    participantProfile: conversation => {
      if (!conversation?.participantId) return Promise.resolve(null)
      const id = encodeURIComponent(conversation.participantId)
      if (conversation.participantType === 'PASSENGER') return api(`/admin/users/${id}`, { cancelOnNavigate: false })
      if (conversation.participantType === 'DRIVER') return api(`/admin/drivers?search=${id}&page=1&pageSize=1`, { cancelOnNavigate: false }).then(result => result.data?.find(item => item.id === conversation.participantId) || result.data?.[0] || null)
      return Promise.resolve(null)
    },
    sendMessage: (id, text, clientMessageId) => api(`/admin/support/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ text, clientMessageId }) }),
    openConversation: (participantType, participantId) => api('/admin/support/conversations', { method: 'POST', body: JSON.stringify({ participantType, participantId }) }),
    searchRecipients: (participantType, phone) => {
      const path = participantType === 'DRIVER' ? '/admin/drivers/options' : '/admin/users/options'
      return api(`${path}?page=1&pageSize=20&search=${encodeURIComponent(phone)}`, { cancelOnNavigate: false })
    },
    listAgents: () => api('/admin/support/agents', { cancelOnNavigate: false }),
    createAgent: form => api('/admin/support/agents', { method: 'POST', body: JSON.stringify(form) }),
    setAgentEnabled: (id, enabled) => api(`/admin/support/agents/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
    saveSettings: support => api('/settings', { method: 'POST', body: JSON.stringify({ support }) })
  }
}
