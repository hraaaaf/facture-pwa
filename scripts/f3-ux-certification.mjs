import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'
import * as XLSX from 'xlsx'

const port = 4176
const origin = `http://127.0.0.1:${port}`
const outputDir = 'artifacts/f3-ui'
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

const seedConfiguredCompany = async page => {
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const company = {
      name: 'Benmoussa Rachid',
      brand: 'TAPISTOR SABRE',
      address: '484, Cit Amal 5, 040 163, MASSIRA, CYM, RABAT',
      cityLabel: 'RABAT',
      phone: '',
      fax: '',
      email: '',
      ice: '001806241000086',
      ifNumber: '35789182',
      rc: '82972 RABAT',
      patente: '26450045',
      cnss: '7121982',
      bankName: '',
      rib: '181 810 21211 52654410108 03',
      legalLine: '',
      defaultVatRate: 20,
      logoDataUrl: '',
      managerSignatureDataUrl: '',
      pdfTemplate: 'premium',
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

const excelFixture = () => {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Client: Hotel Atlas'],
    ['Objet: Fourniture textile'],
    ['Date: 27/08/2026'],
    ['Devise: MAD']
  ]), 'Meta')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Article', 'Qte', 'P.U', 'TVA'],
    ['Drap blanc 240x300', 10, 50, 20],
    ['Serviette bain 70x140', 20, 25, 20]
  ]), 'Lignes')
  return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }))
}

const viewportHeight = width => width <= 430 ? 844 : 1024
const widths = [390, 430, 768]
const report = { viewports: {}, e2e: {}, consoleErrors: [] }
let browser

try {
  await fs.mkdir(outputDir, { recursive: true })
  await waitForServer()
  browser = await chromium.launch({ headless: true })

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: viewportHeight(width) } })
    const page = await context.newPage()
    const errors = []
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('pageerror', error => errors.push(error.message))

    await seedConfiguredCompany(page)
    await page.locator('.fab').waitFor({ timeout: 15_000 })
    await page.locator('.fab').click()
    await page.locator('.new-sheet').waitFor()
    await page.locator('.import-quote-card').waitFor()

    const metrics = await page.evaluate(() => {
      const card = document.querySelector('.import-quote-card')?.getBoundingClientRect()
      const sheet = document.querySelector('.new-sheet')?.getBoundingClientRect()
      return {
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        cardHeight: card?.height ?? 0,
        sheetWidth: sheet?.width ?? 0
      }
    })
    assert.ok(metrics.scrollWidth <= metrics.viewport, `${width}px: overflow horizontal`)
    assert.ok(metrics.cardHeight >= 44, `${width}px: CTA import < 44px`)
    assert.ok(metrics.sheetWidth <= metrics.viewport, `${width}px: sheet hors viewport`)
    report.viewports[width] = metrics
    await page.screenshot({ path: `${outputDir}/after-new-sheet-${width}.png`, fullPage: false })

    if (width === 390) {
      await page.locator('.import-quote-card').click()
      await page.locator('.quote-import-sheet').waitFor()
      await page.screenshot({ path: `${outputDir}/after-import-picker-390.png`, fullPage: false })

      const chooserPromise = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: 'Excel' }).click()
      const chooser = await chooserPromise
      await chooser.setFiles({
        name: 'hotel-atlas-review.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: excelFixture()
      })

      await page.locator('.quote-review-list').waitFor({ timeout: 30_000 })
      assert.equal(await page.locator('.quote-review-field').count(), 2, 'Revue ciblée: exactement 2 unités attendues')
      await page.screenshot({ path: `${outputDir}/after-review-390.png`, fullPage: false })

      for (let index = 0; index < 2; index += 1) {
        const input = page.locator('.quote-review-field input').first()
        await input.fill('Pièce')
      }

      await page.locator('.quote-ready-hero').waitFor()
      await page.screenshot({ path: `${outputDir}/after-ready-390.png`, fullPage: false })
      await page.getByRole('button', { name: 'Créer le devis' }).click()
      await page.locator('.editor-screen').waitFor()

      assert.equal(await page.locator('.client-field input').inputValue(), 'Hotel Atlas')
      assert.match(await page.locator('.object-panel textarea').inputValue(), /Fourniture textile/i)
      assert.equal(await page.locator('.article-card').count(), 2)
      assert.match(await page.locator('.article-designation textarea').nth(0).inputValue(), /Drap blanc/i)
      assert.match(await page.locator('.article-designation textarea').nth(1).inputValue(), /Serviette bain/i)
      assert.equal(await page.locator('.article-fields input').nth(0).inputValue(), 'Pièce')
      assert.ok(await page.locator('.editor-save').isEnabled(), 'Le devis importé doit rester modifiable/finalisable')

      const editorMetrics = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
      assert.ok(editorMetrics.scrollWidth <= editorMetrics.viewport, 'Editor importé: overflow horizontal')
      await page.screenshot({ path: `${outputDir}/after-import-editor-390.png`, fullPage: false })
      report.e2e = {
        source: 'XLSX',
        reviewFields: 2,
        result: 'editable DEVIS draft',
        lineCount: 2,
        client: 'Hotel Atlas'
      }
    }

    report.consoleErrors.push(...errors.map(error => `${width}px: ${error}`))
    await context.close()
  }

  assert.deepEqual(report.consoleErrors, [], `Erreurs navigateur: ${report.consoleErrors.join(' | ')}`)
  console.log(JSON.stringify({ ok: true, ...report }, null, 2))
} finally {
  if (browser) await browser.close()
  stopServer()
}
