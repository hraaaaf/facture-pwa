import { describe, expect, it } from 'vitest'
import { installSpeechRecognitionGuard, isIOSWebView } from './speechRecognitionGuard'

class SilentRecognition extends EventTarget {
  aborted = false
  onerror: ((event: { error?: string }) => void) | null = null
  onend: (() => void) | null = null
  start() {}
  abort() { this.aborted = true }
}

class HealthyRecognition extends EventTarget {
  onerror: ((event: { error?: string }) => void) | null = null
  onend: (() => void) | null = null
  start() {
    this.dispatchEvent(new Event('start'))
    this.dispatchEvent(new Event('result'))
  }
  abort() {}
}

describe('speechRecognitionGuard', () => {
  it('identifie un WebView iOS mais pas Safari ni une PWA standalone', () => {
    const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 Version/26.6 Mobile/15E148 Safari/604.1'
    const embedded = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 ChatGPT'
    expect(isIOSWebView(safari)).toBe(false)
    expect(isIOSWebView(embedded)).toBe(true)
    expect(isIOSWebView(embedded, true)).toBe(false)
  })

  it('désactive la fausse API SpeechRecognition dans un WebView iOS', () => {
    const scope = {
      navigator: { userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 ChatGPT' },
      webkitSpeechRecognition: SilentRecognition
    }
    expect(installSpeechRecognitionGuard(scope)).toBe('disabled-ios-webview')
    expect(scope.webkitSpeechRecognition).toBeUndefined()
  })

  it('fail-close une reconnaissance silencieuse au lieu de rester bloquée', async () => {
    const scope = {
      navigator: { userAgent: 'Mozilla/5.0 Chrome/151 Safari/537.36' },
      SpeechRecognition: SilentRecognition
    }
    expect(installSpeechRecognitionGuard(scope, { startupTimeoutMs: 5, firstResultTimeoutMs: 20 })).toBe('guarded')
    const recognition = new SilentRecognition()
    let error = ''
    let ended = false
    recognition.onerror = event => { error = event.error ?? '' }
    recognition.onend = () => { ended = true }
    recognition.start()
    await new Promise(resolve => setTimeout(resolve, 12))
    expect(recognition.aborted).toBe(true)
    expect(error).toBe('service-not-available')
    expect(ended).toBe(true)
  })

  it('laisse une reconnaissance saine fonctionner sans faux timeout', async () => {
    const scope = {
      navigator: { userAgent: 'Mozilla/5.0 Chrome/151 Safari/537.36' },
      SpeechRecognition: HealthyRecognition
    }
    expect(installSpeechRecognitionGuard(scope, { startupTimeoutMs: 5, firstResultTimeoutMs: 10 })).toBe('guarded')
    const recognition = new HealthyRecognition()
    let error = ''
    recognition.onerror = event => { error = event.error ?? '' }
    recognition.start()
    await new Promise(resolve => setTimeout(resolve, 15))
    expect(error).toBe('')
  })
})
