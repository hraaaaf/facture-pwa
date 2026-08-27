import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'

const port = 4178
const origin = `http://127.0.0.1:${port}`
const outputDir = 'artifacts/voice-input-v1'
const widths = [390, 430, 768]
const viewportHeight = width => width <= 430 ? 844 : 1024
const transcript = 'Client Hôtel Atlas, 200 draps à 85 dirhams, 40 serviettes à 22,5 MAD, TVA 20 %.'

const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env },
  detached: process.platform !== 'win32'
})
let serverLog = ''
server.stdout.on('data', chunk => { serverLog += chunk.toString() })
server.stderr.on('data', chunk => { serverLog += chunk.toString() })

const stopServer = () => {
  if (!server.pid) return
  try {
    if (process.platform === 'win32') server.kill('SIGTERM')
    else process.kill(-server.pid, 'SIGTERM')
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error
  }
}

const waitForServer = async () => {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/`)
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Vite indisponible.\n${serverLog}`)
}

const installFakeSpeechRecognition = async page => {
  await page.addInitScript(({ sample }) => {
    class FakeSpeechRecognition {
      constructor() {
        this.lang = 'fr-FR'
        this.interimResults = true
        this.continuous = true
        this.onresult = null
        this.onerror = null
        this.onend = null
      }
      start() {
        queueMicrotask(() => this.onresult?.({
          resultIndex: 0,
          results: [{ isFinal: true, 0: { transcript: sample } }]
        }))
      }
      stop() { queueMicrotask(() => this.onend?.()) }
      abort() { queueMicrotask(() => this.onend?.()) }
    }
    window.SpeechRecognition = FakeSpeechRecognition
    window.webkitSpeechRecognition = FakeSpeechRecognition
  }, { sample: transcript })
}

const seedConfiguredCompany = async page => {
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const company = {
      name: 'Benmoussa Rachid', brand: 'TAPISTOR SABRE',
      address: '484, Cit Amal 5, MASSIRA, CYM, RABAT', cityLabel: 'RABAT',
      phone: '', fax: '', email: '', ice: '001806241000086', ifNumber: '35789182',
      rc: '82972 RABAT', patente: '26450045', cnss: '7121982', bankName: '',
      rib: '181 810 21211 52654410108 03', legalLine: '', defaultVatRate: 20,
      logoDataUrl: '', managerSignatureDataUrl: '', pdfTemplate: 'premium',
      onboardingCompleted: true,
      numberingPrefixes: { DEVIS: 'DEV', FACTURE: 'F', BL: 'BL', BC: 'BC' }
    }
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('facture-pwa', 3)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
        if (!db.objectStoreNames.contains('counters')) db.createObjectStore('counters', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('clients')) db.createObjectStore('clients', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('catalog')) db.createObjectStore('catalog', { keyPath: 'id' })
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('settings', 'readwrite')
        tx.objectStore('settings').put(company, 'company')
        tx.onerror = () => { db.close(); reject(tx.error) }
        tx.onabort = () => { db.close(); reject(tx.error) }
        tx.oncomplete = () => { db.close(); resolve() }
      }
    })
  })
  await page.reload({ waitUntil: 'networkidle' })
}

const report = { viewports: {}, e2e: {}, consoleErrors: [] }
let browser

try {
  await fs.mkdir(outputDir, { recursive: true })
  await waitForServer()
  browser = await chromium.launch({ headless: true })

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: viewportHeight(width) } })
    const page = await context.newPage()
    await installFakeSpeechRecognition(page)
    const errors = []
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('pageerror', error => errors.push(error.message))

    await seedConfiguredCompany(page)
    await page.locator('.fab').waitFor({ timeout: 15_000 })
    await page.locator('.fab').click()
    await page.locator('.new-sheet').waitFor()
    await page.locator('.import-quote-card').click()
    await page.locator('.quote-import-sheet').waitFor()

    const pickerMetrics = await page.evaluate(() => {
      const sheet = document.querySelector('.quote-import-sheet')?.getBoundingClientRect()
      const close = document.querySelector('.quote-import-header .sheet-close')?.getBoundingClientRect()
      const voice = document.querySelector('.quote-voice-choice')?.getBoundingClientRect()
      const style = document.querySelector('.quote-voice-choice') ? getComputedStyle(document.querySelector('.quote-voice-choice')) : null
      return {
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        sheetWidth: sheet?.width ?? 0,
        closeWidth: close?.width ?? 0,
        closeHeight: close?.height ?? 0,
        voiceHeight: voice?.height ?? 0,
        voiceRadius: style?.borderRadius ?? '',
        sourceButtons: document.querySelectorAll('.quote-format-grid > button').length
      }
    })
    assert.ok(pickerMetrics.scrollWidth <= pickerMetrics.viewport, `${width}px picker: overflow horizontal`)
    assert.ok(pickerMetrics.sheetWidth <= pickerMetrics.viewport, `${width}px picker: sheet hors viewport`)
    assert.ok(pickerMetrics.closeWidth >= 44 && pickerMetrics.closeHeight >= 44, `${width}px picker: fermer <44px`)
    assert.ok(pickerMetrics.voiceHeight >= 90, `${width}px picker: CTA vocal trop petit`)
    assert.equal(pickerMetrics.sourceButtons, 5, `${width}px picker: 5 sources attendues`)
    report.viewports[width] = { picker: pickerMetrics }
    await page.screenshot({ path: `${outputDir}/after-picker-${width}.png`, fullPage: false })

    await page.locator('.quote-voice-choice').click()
    await page.locator('.quote-voice-panel').waitFor()
    const textarea = page.getByRole('textbox', { name: 'Transcription du message vocal' })
    const start = page.getByRole('button', { name: 'Commencer' })
    await start.click()
    await page.getByRole('button', { name: 'Arrêter' }).waitFor()
    await textarea.waitFor()
    await page.waitForFunction(() => document.querySelector('textarea[aria-label="Transcription du message vocal"]')?.value.length > 10)

    const voiceMetrics = await page.evaluate(() => {
      const panel = document.querySelector('.quote-voice-panel')?.getBoundingClientRect()
      const textarea = document.querySelector('.quote-voice-panel textarea')?.getBoundingClientRect()
      const actions = [...document.querySelectorAll('.quote-voice-actions button')].map(button => button.getBoundingClientRect().height)
      const orb = document.querySelector('.quote-voice-orb')?.getBoundingClientRect()
      return {
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        panelWidth: panel?.width ?? 0,
        textareaWidth: textarea?.width ?? 0,
        minActionHeight: actions.length ? Math.min(...actions) : 0,
        orbWidth: orb?.width ?? 0,
        listening: document.querySelector('.quote-voice-orb')?.classList.contains('listening') ?? false
      }
    })
    assert.ok(voiceMetrics.scrollWidth <= voiceMetrics.viewport, `${width}px vocal: overflow horizontal`)
    assert.ok(voiceMetrics.panelWidth <= pickerMetrics.sheetWidth, `${width}px vocal: panel hors sheet`)
    assert.ok(voiceMetrics.textareaWidth <= voiceMetrics.panelWidth, `${width}px vocal: textarea hors panel`)
    assert.ok(voiceMetrics.minActionHeight >= 48, `${width}px vocal: action <48px`)
    assert.ok(voiceMetrics.orbWidth >= 70, `${width}px vocal: orb trop petit`)
    assert.equal(voiceMetrics.listening, true, `${width}px vocal: état écoute non visible`)
    report.viewports[width].voice = voiceMetrics
    await page.screenshot({ path: `${outputDir}/after-listening-${width}.png`, fullPage: false })

    await page.getByRole('button', { name: 'Arrêter' }).click()

    if (width === 390) {
      assert.match(await textarea.inputValue(), /Hôtel Atlas/)
      await page.getByRole('button', { name: 'Analyser' }).click()
      await page.locator('.quote-review-list').waitFor()
      const reviewCount = await page.locator('.quote-review-field').count()
      assert.equal(reviewCount, 1, 'Vocal: seule la date doit nécessiter une revue')
      const reviewInput = page.locator('.quote-review-field input').first()
      assert.equal(await reviewInput.getAttribute('type'), 'date', 'Vocal: la revue attendue est la date')
      await reviewInput.fill('2026-08-27')
      await page.locator('.quote-ready-hero').waitFor()
      assert.match(await page.locator('.quote-ready-hero').innerText(), /Hôtel Atlas/)
      assert.match(await page.locator('.quote-ready-grid').innerText(), /2/)
      await page.screenshot({ path: `${outputDir}/after-ready-390.png`, fullPage: false })
      await page.getByRole('button', { name: 'Créer le devis' }).click()
      await page.locator('.editor-screen').waitFor()
      assert.equal(await page.locator('.client-field input').inputValue(), 'Hôtel Atlas')
      assert.equal(await page.locator('.article-card').count(), 2)
      assert.match(await page.locator('.article-designation textarea').nth(0).inputValue(), /draps/i)
      assert.match(await page.locator('.article-designation textarea').nth(1).inputValue(), /serviettes/i)
      const quantities = await page.locator('.compact-number-field input').allInputValues()
      assert.ok(quantities.includes('200'), 'Vocal: quantité 200 absente')
      assert.ok(quantities.includes('40'), 'Vocal: quantité 40 absente')
      await page.screenshot({ path: `${outputDir}/after-editor-390.png`, fullPage: false })
      report.e2e = { transcript, reviewFields: 1, result: 'editable DEVIS draft', lineCount: 2, client: 'Hôtel Atlas' }
    }

    report.consoleErrors.push(...errors.map(error => `${width}px: ${error}`))
    await context.close()
  }

  assert.deepEqual(report.consoleErrors, [], `Erreurs navigateur: ${report.consoleErrors.join(' | ')}`)
  await fs.writeFile(`${outputDir}/report.json`, JSON.stringify({ ok: true, ...report }, null, 2))
  console.log(JSON.stringify({ ok: true, ...report }, null, 2))
} finally {
  if (browser) await browser.close()
  stopServer()
}
