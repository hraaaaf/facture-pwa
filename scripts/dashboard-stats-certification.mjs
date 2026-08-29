import { chromium } from 'playwright'
import { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

const [mainDirArg, featureDirArg] = process.argv.slice(2)
if (!mainDirArg || !featureDirArg) throw new Error('Usage: node scripts/dashboard-stats-certification.mjs <main-dir> <feature-dir>')

const mainDir = path.resolve(mainDirArg)
const featureDir = path.resolve(featureDirArg)
const outputDir = path.resolve('artifacts/dashboard-stats')
const widths = [390, 430, 768, 1280]

await fs.rm(outputDir, { recursive: true, force: true })
await fs.mkdir(outputDir, { recursive: true })

const doc = ({ id, type = 'FACTURE', date = '2026-08-29', status = 'FINALIZED', amount = 100, blShowPrices = true }) => ({
  id,
  type,
  number: status === 'DRAFT' ? '' : `${type}-${date.slice(0, 4)}-${id}`,
  date,
  client: `Client ${id}`,
  clientId: '',
  clientAddress: '',
  clientIce: '',
  clientIfNumber: '',
  object: 'Certification dashboard',
  lines: [{
    id: `line-${id}`,
    designation: 'Article',
    unit: 'Pièce',
    quantity: 1,
    unitPriceHT: amount,
    vatRate: 0,
    discountPercent: 0
  }],
  blShowPrices,
  globalDiscountPercent: 0,
  status,
  finalizedAt: status === 'DRAFT' ? '' : '2026-08-29T12:00:00.000Z',
  paidAt: status === 'PAID' ? '2026-08-29T13:00:00.000Z' : '',
  cancelledAt: status === 'CANCELLED' ? '2026-08-29T14:00:00.000Z' : '',
  sourceDocumentId: '',
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z'
})

const fixtureDocuments = [
  doc({ id: '001', type: 'FACTURE', amount: 100, status: 'FINALIZED' }),
  doc({ id: '002', type: 'FACTURE', amount: 200, status: 'PAID' }),
  doc({ id: '003', type: 'FACTURE', amount: 900, status: 'DRAFT' }),
  doc({ id: '004', type: 'FACTURE', amount: 800, status: 'CANCELLED' }),
  doc({ id: '005', type: 'FACTURE', amount: 700, date: '2025-08-29', status: 'FINALIZED' }),
  doc({ id: '006', type: 'DEVIS', amount: 300, status: 'FINALIZED' }),
  doc({ id: '007', type: 'BL', amount: 400, status: 'FINALIZED', blShowPrices: false }),
  doc({ id: '008', type: 'BC', amount: 500, status: 'FINALIZED' })
]

const mimeType = file => {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.html') return 'text/html; charset=utf-8'
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.json' || ext === '.webmanifest') return 'application/json; charset=utf-8'
  if (ext === '.png') return 'image/png'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.woff2') return 'font/woff2'
  return 'application/octet-stream'
}

const startStaticServer = async (rootDir, port) => {
  const distDir = path.join(rootDir, 'dist')
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
      const requested = decodeURIComponent(url.pathname)
      const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '')
      let file = path.resolve(distDir, relative)
      if (!file.startsWith(`${distDir}${path.sep}`) && file !== path.join(distDir, 'index.html')) {
        response.writeHead(403)
        response.end('Forbidden')
        return
      }
      try {
        const stat = await fs.stat(file)
        if (stat.isDirectory()) file = path.join(file, 'index.html')
      } catch {
        file = path.join(distDir, 'index.html')
      }
      const body = await fs.readFile(file)
      response.writeHead(200, {
        'Content-Type': mimeType(file),
        'Cache-Control': 'no-store'
      })
      response.end(body)
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end(error instanceof Error ? error.message : String(error))
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })

  return server
}

const closeServer = server => new Promise((resolve, reject) => {
  server.closeAllConnections?.()
  server.close(error => error ? reject(error) : resolve())
})

const seedApp = async (page, documents) => {
  await page.evaluate(async seededDocuments => {
    await new Promise((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase('facture-pwa')
      deletion.onsuccess = () => resolve()
      deletion.onerror = () => reject(deletion.error)
      deletion.onblocked = () => reject(new Error('IndexedDB deletion blocked'))
    })

    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('facture-pwa', 3)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains('documents')) database.createObjectStore('documents', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings')
        if (!database.objectStoreNames.contains('counters')) database.createObjectStore('counters', { keyPath: 'key' })
        if (!database.objectStoreNames.contains('clients')) database.createObjectStore('clients', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('catalog')) database.createObjectStore('catalog', { keyPath: 'id' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    await new Promise((resolve, reject) => {
      const tx = db.transaction(['documents', 'settings'], 'readwrite')
      const docs = tx.objectStore('documents')
      docs.clear()
      for (const document of seededDocuments) docs.put(document)
      tx.objectStore('settings').put({ onboardingCompleted: true }, 'company')
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
      tx.onabort = () => { db.close(); reject(tx.error) }
    })
  }, documents)
}

const readDashboard = async page => page.evaluate(() => ({
  period: document.querySelector('.period-chip')?.textContent?.trim() ?? '',
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  cards: Array.from(document.querySelectorAll('.stat-card')).map(card => ({
    label: card.querySelector('.stat-label')?.textContent?.trim() ?? '',
    count: Number(card.querySelector('.stat-count')?.textContent?.trim() ?? 'NaN'),
    amount: card.querySelector('.stat-amount')?.textContent?.trim() ?? ''
  }))
}))

const capturePhase = async ({ browser, phase, url }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })

  await page.goto(url, { waitUntil: 'networkidle' })
  await seedApp(page, fixtureDocuments)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.stats-grid')

  const captures = []
  for (const width of widths) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const state = await readDashboard(page)
    const screenshot = path.join(outputDir, `${phase}-${width}.png`)
    await page.screenshot({ path: screenshot, fullPage: true })
    captures.push({ width, ...state, screenshot })
  }

  await page.close()
  return { captures, pageErrors, consoleErrors }
}

const findCard = (capture, label) => capture.cards.find(card => card.label === label)
const normalizeAmount = value => Number(String(value).replace(/[^0-9,-]/g, '').replace(',', '.'))

const mainServer = await startStaticServer(mainDir, 4181)
const featureServer = await startStaticServer(featureDir, 4182)
const browser = await chromium.launch({ headless: true })

let report
try {
  const before = await capturePhase({ browser, phase: 'before', url: 'http://127.0.0.1:4181' })
  const after = await capturePhase({ browser, phase: 'after', url: 'http://127.0.0.1:4182' })
  const before390 = before.captures.find(item => item.width === 390)
  const after390 = after.captures.find(item => item.width === 390)
  const beforeFacture = findCard(before390, 'Facture')
  const afterFacture = findCard(after390, 'Facture')
  const afterBl = findCard(after390, 'Bon de livraison')

  const assertions = [
    { name: 'baseline reproduces audited defect', ok: beforeFacture?.count === 4 && normalizeAmount(beforeFacture?.amount) === 1900, detail: beforeFacture },
    { name: 'feature keeps only 2026 finalized/paid invoices', ok: afterFacture?.count === 2 && normalizeAmount(afterFacture?.amount) === 300, detail: afterFacture },
    { name: 'BL without prices counts but contributes zero amount', ok: afterBl?.count === 1 && normalizeAmount(afterBl?.amount) === 0, detail: afterBl },
    { name: 'period remains This year', ok: after390?.period === 'Cette année', detail: after390?.period },
    { name: 'all target widths have no horizontal overflow', ok: after.captures.every(item => item.scrollWidth <= item.innerWidth), detail: after.captures.map(item => ({ width: item.width, scrollWidth: item.scrollWidth, innerWidth: item.innerWidth })) },
    { name: 'no page errors', ok: after.pageErrors.length === 0, detail: after.pageErrors },
    { name: 'no console errors', ok: after.consoleErrors.length === 0, detail: after.consoleErrors }
  ]

  report = {
    generatedAt: new Date().toISOString(),
    fixture: 'current-year finalized+paid, current-year draft+cancelled, previous-year finalized, BL without prices',
    before,
    after,
    assertions,
    failure: assertions.some(item => !item.ok) ? 'Dashboard certification assertions failed' : null
  }
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  if (report.failure) throw new Error(report.failure)
} finally {
  await browser.close()
  await Promise.all([closeServer(mainServer), closeServer(featureServer)])
}

console.log(`DASHBOARD STATS CERTIFIED: ${report.assertions.length}/${report.assertions.length} assertions`)
