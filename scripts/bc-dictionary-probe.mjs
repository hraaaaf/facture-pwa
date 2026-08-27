import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'
import * as XLSX from 'xlsx'

const port = 4177
const origin = `http://127.0.0.1:${port}`
const outputDir = 'artifacts/bc-dictionary-probe'
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env }, detached: process.platform !== 'win32'
})
let serverLog = ''
server.stdout.on('data', chunk => { serverLog += chunk.toString() })
server.stderr.on('data', chunk => { serverLog += chunk.toString() })
const stopServer = () => {
  if (!server.pid) return
  try { process.platform === 'win32' ? server.kill('SIGTERM') : process.kill(-server.pid, 'SIGTERM') } catch (error) { if (error?.code !== 'ESRCH') throw error }
}
const waitForServer = async () => {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try { const response = await fetch(`${origin}/`); if (response.ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Vite indisponible.\n${serverLog}`)
}
const seedCompany = async page => {
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const company = {
      name: 'Benmoussa Rachid', brand: 'TAPISTOR SABRE', address: '484, Cit Amal 5, MASSIRA, CYM, RABAT', cityLabel: 'RABAT',
      phone: '', fax: '', email: '', ice: '001806241000086', ifNumber: '35789182', rc: '82972 RABAT', patente: '26450045', cnss: '7121982',
      bankName: '', rib: '181 810 21211 52654410108 03', legalLine: '', defaultVatRate: 20, logoDataUrl: '', managerSignatureDataUrl: '',
      pdfTemplate: 'premium', onboardingCompleted: true, numberingPrefixes: { DEVIS: 'DEV', FACTURE: 'F', BL: 'BL', BC: 'BC' }
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
const fixture = () => {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['BON DE COMMANDE FOURNISSEUR — TEST FICTIF'],
    ['Client: Hotel Azur Marrakech'],
    ['Objet: Renouvelement linge hotellerie'],
    ['Date: 27/08/2026'],
    ['Devise: MAD']
  ]), 'Commande')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Article', 'Unite', 'Qte', 'P.U', 'TVA'],
    ['Drapp blanc 240x300', 'pcs', 12, 48.5, 20],
    ['Serviette bainn 70x140', 'unite', 30, 24.9, 20],
    ['Nappe rectangulair 180x300', 'metres', 8, 72, 20]
  ]), 'Lignes')
  return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }))
}

let browser
try {
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(`${outputDir}/bon-commande-fictif.xlsx`, fixture())
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => consoleErrors.push(error.message))

  await seedCompany(page)
  await page.locator('.fab').click()
  await page.locator('.import-quote-card').click()
  await page.locator('.quote-import-sheet').waitFor()

  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Excel' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({ name: 'bon-commande-fictif.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fixture() })

  await page.locator('.quote-ready-hero').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: `${outputDir}/01-ready.png`, fullPage: false })
  await page.getByRole('button', { name: 'Créer le devis' }).click()
  await page.locator('.editor-screen').waitFor()

  const object = await page.locator('.object-panel textarea').inputValue()
  const designations = await page.locator('.article-designation textarea').evaluateAll(nodes => nodes.map(node => node.value))
  const units = await page.locator('.article-card').evaluateAll(cards => cards.map(card => {
    const fields = card.querySelectorAll('.article-fields input')
    return fields[0]?.value ?? ''
  }))
  const client = await page.locator('.client-field input').inputValue()
  assert.equal(designations.length, 3)
  assert.deepEqual(consoleErrors, [])
  await page.screenshot({ path: `${outputDir}/02-devis-created.png`, fullPage: true })

  const report = {
    ok: true,
    source: 'BON DE COMMANDE fictif XLSX',
    input: {
      object: 'Renouvelement linge hotellerie',
      designations: ['Drapp blanc 240x300', 'Serviette bainn 70x140', 'Nappe rectangulair 180x300'],
      units: ['pcs', 'unite', 'metres']
    },
    output: { client, object, designations, units },
    consoleErrors
  }
  await fs.writeFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await context.close()
} finally {
  if (browser) await browser.close()
  stopServer()
}
