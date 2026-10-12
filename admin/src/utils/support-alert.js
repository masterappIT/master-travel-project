const STORAGE_KEY = 'support-alert-sound'
let audioContext = null

export function readSupportAlertPreference() {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off' } catch { return true }
}

export function writeSupportAlertPreference(enabled) {
  try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off') } catch { /* 無法儲存時只影響下次開啟的預設值 */ }
}

// 瀏覽器在使用者尚未與頁面互動前可能拒絕播放；此時靜默略過，分頁標題與畫面提示仍會更新。
export function playSupportAlert() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    audioContext ||= new AudioContextClass()
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {})
    const start = audioContext.currentTime
    for (const [offset, frequency] of [[0, 880], [0.18, 1175]]) {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.18, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16)
      oscillator.connect(gain).connect(audioContext.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.17)
    }
  } catch { /* 提示音失敗不影響客服操作 */ }
}

// 回傳本次輪詢中新出現、等待客服回覆的對話數；首次載入只建立基準，不提示。
export function createIncomingTracker() {
  let seen = null
  return conversations => {
    const next = new Map(conversations.map(item => [item.id, item.lastMessageAt || '']))
    const fresh = seen ? conversations.filter(item => item.needsStaffReply && item.lastMessageAt && item.lastMessageAt > (seen.get(item.id) || '')).length : 0
    seen = next
    return fresh
  }
}
