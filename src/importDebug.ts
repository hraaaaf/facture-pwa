type ImportDebugData = Record<string, unknown>

let sessionId: string | null = null

const enabled = () => {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('debugImport') === '1'
}

const getSessionId = () => {
  if (sessionId) return sessionId
  try {
    sessionId = window.sessionStorage.getItem('factea-import-debug-session')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      window.sessionStorage.setItem('factea-import-debug-session', sessionId)
    }
  } catch {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
  return sessionId
}

export const importDebug = (stage: string, data: ImportDebugData = {}) => {
  if (!enabled()) return
  const payload = {
    stage,
    session: getSessionId(),
    timestamp: new Date().toISOString(),
    host: window.location.host,
    userAgent: navigator.userAgent,
    data
  }
  void fetch('/api/import-debug', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => undefined)
}
