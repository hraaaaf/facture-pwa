type ImportDebugData = Record<string, unknown>

const isVoiceDebugEnabled = () => {
  if (typeof window === 'undefined') return false
  return window.location.hostname.endsWith('.vercel.app')
    && new URLSearchParams(window.location.search).get('voiceDebug') === '1'
}

export const importDebug = (stage: string, data: ImportDebugData = {}) => {
  if (!isVoiceDebugEnabled()) return
  void fetch('/api/voice-debug', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stage, data, timestamp: new Date().toISOString() }),
    keepalive: true
  }).catch(() => undefined)
}
