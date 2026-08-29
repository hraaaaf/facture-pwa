import { chromium } from 'playwright'
import { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

const [mainDirArg, featureDirArg] = process.argv.slice(2)
if (!mainDirArg || !featureDirArg) throw new Error('Usage: node scripts/backup-continuity-certification.mjs <main-dir> <feature-dir>')

const mainDir = path.resolve(mainDirArg)
const featureDir = path.resolve(featureDirArg)
const outputDir = path.resolve('artifacts/backup-continuity')
const widths = [390, 430, 768, 1280]

await fs.rm(outputDir, { recursive: true, force: true })
await fs.mkdir(outputDir, { recursive: true })

const documentFixture = {
  id: 'backup-cert-001',
  type: 'FACTURE',
  number: 'F-2026-001',
  date: '2026-08-29',
  client: 'Client sauvegarde',
  clientId: '',
  clientAddress: '',
  clientIce: '',
  clientIfNumber: '',
  object: 'Certification continuité',
  lines: [{ id: 'line-backup', designation: 'Article', unit: 'Pièce', quantity: 1, unitPriceHT: 100, vatRate: 0, discountPercent: 0 }],
  blShowPrices: true,
  globalDiscountPercent: 0,
  status: 'FINALIZED',
  finalizedAt: '2026-08-29T12:00:00.000Z',
  paidAt: '',
  cancelledAt: '',
  sourceDocumentId: '',
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T12:00:00.000Z'
}

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
        response.writeHead(403); response.end('Forbidden'); return
      }
      try {
        const stat = await fs.stat(file)
        if (stat.isDirectory()) file = path.join(file, 'index.html')
      } catch {
        file = path.join(distDir, 'index.html')
      }
      const body = await fs.readFile(file)
      response.writeHead(200, { 'Content-Type': mimeType(file), 'Cache-Control': 'no-store' })
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

const seedApp = async page => {
  await page.evaluate(async seededDocument => {
    localStorage.clear()
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
      tx.objectStore('documents').put(seededDocument)
      tx.objectStore('settings').put({ onboardingCompleted: true }, 'company')
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
      tx.onabort = () => { db.close(); reject(tx.error) }
    })
  }, documentFixture)
}

const readState = async page => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  reminder: document.querySelector('.backup-reminder-shell')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}))

const capturePhase = async ({ browser, phase, url }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await seedApp(page)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.home-screen')
  if (phase === 'after') await page.waitForSelector('.backup-reminder-shell')

  const captures = []
  for (const width of widths) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const state = await readState(page)
    const screenshot = path.join(outputDir, `${phase}-${width}.png`)
    await page.screenshot({ path: screenshot, fullPage: true })
    captures.push({ width, ...state, screenshot })
  }
  return { page, captures, pageErrors, consoleErrors }
}

const mainServer = await startStaticServer(mainDir, 4191)
const featureServer = await startStaticServer(featureDir, 4192)
const browser = await chromium.launch({ headless: true })

let report
try {
  const before = await capturePhase({ browser, phase: 'before', url: 'http://127.0.0.1:4191' })
  const after = await capturePhase({ browser, phase: 'after', url: 'http://127.0.0.1:4192' })
  const after390 = after.captures.find(item => item.width === 390)

  const downloadPromise = after.page.waitForEvent('download')
  await after.page.getByRole('button', { name: 'Sauvegarder' }).click()
  const download = await downloadPromise
  const suggestedName = download.suggestedFilename()
  await after.page.waitForFunction(() => !document.querySelector('.backup-reminder-shell'))
  const backupMeta = await after.page.evaluate(() => JSON.parse(localStorage.getItem('factea:backup-continuity:v1') ?? '{}'))

  await before.page.close()
  await after.page.close()

  const assertions = [
    { name: 'baseline has no proactive reminder', ok: before.captures.every(item => item.reminder === ''), detail: before.captures.map(item => ({ width: item.width, reminder: item.reminder })) },
    { name: 'feature warns when data exists without backup', ok: after390?.reminder.includes('Sauvegarde à faire') && after390?.reminder.includes('Garde une copie hors du téléphone'), detail: after390?.reminder },
    { name: 'backup action downloads a full JSON backup', ok: suggestedName.startsWith('facture-pwa-backup-') && suggestedName.endsWith('.json'), detail: suggestedName },
    { name: 'successful backup records freshness metadata', ok: typeof backupMeta.lastBackupAt === 'string' && backupMeta.lastBackupAt.length > 0, detail: backupMeta },
    { name: 'all target widths have no horizontal overflow', ok: after.captures.every(item => item.scrollWidth <= item.innerWidth), detail: after.captures.map(item => ({ width: item.width, scrollWidth: item.scrollWidth, innerWidth: item.innerWidth })) },
    { name: 'no feature page errors', ok: after.pageErrors.length === 0, detail: after.pageErrors },
    { name: 'no feature console errors', ok: after.consoleErrors.length === 0, detail: after.consoleErrors }
  ]

  report = { generatedAt: new Date().toISOString(), before: before.captures, after: after.captures, assertions, failure: assertions.some(item => !item.ok) ? 'Backup continuity assertions failed' : null }
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  if (report.failure) throw new Error(report.failure)
} finally {
  await browser.close()
  await Promise.all([closeServer(mainServer), closeServer(featureServer)])
}

console.log(`BACKUP CONTINUITY CERTIFIED: ${report.assertions.length}/${report.assertions.length} assertions`)
