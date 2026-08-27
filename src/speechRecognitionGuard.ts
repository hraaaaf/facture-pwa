type RecognitionLike = {
  start: (...args: unknown[]) => unknown
  abort?: () => void
  addEventListener?: (type: string, listener: () => void, options?: { once?: boolean } | boolean) => void
  onerror?: ((event: { error?: string }) => void) | null
  onend?: (() => void) | null
}

type RecognitionCtorLike = {
  prototype: RecognitionLike
}

type SpeechScope = {
  navigator?: { userAgent?: string; standalone?: boolean }
  SpeechRecognition?: RecognitionCtorLike
  webkitSpeechRecognition?: RecognitionCtorLike
}

type GuardOptions = {
  startupTimeoutMs?: number
  firstResultTimeoutMs?: number
}

const patchedPrototypes = new WeakSet<object>()

export const isIOSWebView = (userAgent: string, standalone = false) => {
  if (standalone) return false
  if (!/(iPhone|iPad|iPod)/i.test(userAgent)) return false
  const explicitNonSafari = /(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA|ChatGPT)/i.test(userAgent)
  const safari = /Version\/[\d.]+.*Safari\//i.test(userAgent)
  return explicitNonSafari || !safari
}

const disableCtor = (scope: SpeechScope, key: 'SpeechRecognition' | 'webkitSpeechRecognition') => {
  try {
    Object.defineProperty(scope, key, { configurable: true, writable: true, value: undefined })
  } catch {
    try { scope[key] = undefined } catch {}
  }
}

const patchCtor = (Ctor: RecognitionCtorLike | undefined, startupTimeoutMs: number, firstResultTimeoutMs: number) => {
  if (!Ctor?.prototype || patchedPrototypes.has(Ctor.prototype)) return false
  const prototype = Ctor.prototype
  const originalStart = prototype.start
  if (typeof originalStart !== 'function') return false

  const guardedStart = function (this: RecognitionLike, ...args: unknown[]) {
    const recognition = this
    let settled = false
    let started = false

    const cleanupTimers = () => {
      clearTimeout(startupTimer)
      clearTimeout(firstResultTimer)
    }

    const settle = () => {
      if (settled) return
      settled = true
      cleanupTimers()
    }

    const failClosed = () => {
      if (settled) return
      settled = true
      cleanupTimers()
      try { recognition.abort?.() } catch {}
      recognition.onerror?.({ error: started ? 'no-speech' : 'service-not-available' })
      recognition.onend?.()
    }

    const startupTimer = setTimeout(failClosed, startupTimeoutMs)
    const firstResultTimer = setTimeout(failClosed, firstResultTimeoutMs)

    recognition.addEventListener?.('start', () => {
      started = true
      clearTimeout(startupTimer)
    }, { once: true })
    recognition.addEventListener?.('result', settle, { once: true })
    recognition.addEventListener?.('error', settle, { once: true })
    recognition.addEventListener?.('end', settle, { once: true })

    try {
      return originalStart.apply(recognition, args)
    } catch (error) {
      settle()
      throw error
    }
  }

  try {
    Object.defineProperty(prototype, 'start', {
      configurable: true,
      writable: true,
      value: guardedStart
    })
  } catch {
    prototype.start = guardedStart
  }
  patchedPrototypes.add(prototype)
  return true
}

export const installSpeechRecognitionGuard = (rawScope: unknown, options: GuardOptions = {}) => {
  const scope = rawScope as SpeechScope
  const userAgent = scope.navigator?.userAgent ?? ''
  const standalone = Boolean(scope.navigator?.standalone)

  if (isIOSWebView(userAgent, standalone)) {
    disableCtor(scope, 'SpeechRecognition')
    disableCtor(scope, 'webkitSpeechRecognition')
    return 'disabled-ios-webview' as const
  }

  const startupTimeoutMs = options.startupTimeoutMs ?? 4500
  const firstResultTimeoutMs = options.firstResultTimeoutMs ?? 15000
  const constructors = new Set([scope.SpeechRecognition, scope.webkitSpeechRecognition].filter(Boolean))
  let patched = false
  for (const Ctor of constructors) patched = patchCtor(Ctor, startupTimeoutMs, firstResultTimeoutMs) || patched
  return patched ? 'guarded' as const : 'unavailable' as const
}
