export function createSupportApi(api) {
  return {
    listConversations: () => api('/admin/support/conversations', { cancelOnNavigate: false }),
    listMessages: (id, before = '') => api(`/admin/support/conversations/${encodeURIComponent(id)}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`, { cancelOnNavigate: false }),
    participantProfile: conversation => {
      if (!conversation?.participantId) return Promise.resolve(null)
      const id = encodeURIComponent(conversation.participantId)
      if (conversation.participantType === 'PASSENGER') return api(`/admin/users/${id}`, { cancelOnNavigate: false })
      if (conversation.participantType === 'DRIVER') return api(`/admin/drivers?search=${id}&page=1&pageSize=1`, { cancelOnNavigate: false }).then(result => result.data?.find(item => item.id === conversation.participantId) || null)
      return Promise.resolve(null)
    },
    sendMessage: (id, text, clientMessageId) => api(`/admin/support/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ text, clientMessageId }) }),
    openConversation: (participantType, participantId) => api('/admin/support/conversations', { method: 'POST', body: JSON.stringify({ participantType, participantId }) }),
    searchRecipients: (participantType, countryCode, phone) => api(`/admin/support/conversations/recipients?type=${encodeURIComponent(participantType)}&countryCode=${encodeURIComponent(countryCode)}&phone=${encodeURIComponent(phone)}`, { cancelOnNavigate: false }),
    saveSettings: support => api('/settings', { method: 'POST', body: JSON.stringify({ support }) })
  }
}
