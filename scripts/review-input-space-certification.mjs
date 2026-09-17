import { chromium, webkit, devices } from 'playwright'
import { jsPDF } from 'jspdf'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const root = process.argv[2] || '.'
const dist = resolve(root, 'dist')
const artifactDir = resolve('artifacts/review-input-space')
mkdirSync(artifactDir, { recursive: true })

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
}

function serve() {
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname
    let file = join(dist, pathname === '/' ? 'index.html' : pathname)
    if (!existsSync(file)) file = join(dist, 'index.html')
    try {
      res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' })
      res.end(readFileSync(file))
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  })
  return new Promise(resolveServer => server.listen(0, '127.0.0.1', () => {
    resolveServer({ server, url: `http://127.0.0.1:${server.address().port}` })
  }))
}

function incompletePdf() {
  const pdf = new jsPDF({ compress: true })
  pdf.setFontSize(12)
  pdf.text('DEVIS', 20, 18)
  pdf.text('Date: 17/09/2026', 20, 30)
  pdf.text('Article', 20, 55)
  pdf.text('Qte', 105, 55)
  pdf.text('P.U', 135, 55)
  pdf.text('TVA', 170, 55)
  pdf.text('Service test', 20, 66)
  pdf.text('1', 105, 66)
  pdf.text('100', 135, 66)
  pdf.text('20', 170, 66)
  return Buffer.from(pdf.output('arraybuffer'))
}

async function seedAndOpen(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const req = indexedDB.open('facture-pwa', 3)
    const db = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction(['settings'], 'readwrite')
    tx.objectStore('settings').put({
      name: 'TAPISTOR',
      brand: 'TAPISTOR',
      address: 'Rabat',
      cityLabel: 'Rabat',
      phone: '',
      fax: '',
      email: '',
      ice: '001',
      ifNumber: '001',
      rc: '',
      patente: '',
      cnss: '',
      bankName: '',
      rib: '',
      legalLine: '',
      defaultVatRate: 20,
      logoDataUrl: '',
      managerSignatureDataUrl: '',
      pdfTemplate: 'premium',
      onboardingCompleted: true,
      numberingPrefixes: { DEVIS: 'DEV', FACTURE: 'F', BL: 'BL', BC: 'BC' },
      numberingBaseline: { year: 2026, lastUsed: { DEVIS: 0, FACTURE: 0, BL: 0, BC: 0 } }
    }, 'company')
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Nouveau document' }).click()
  await page.getByText('Importer → devis', { exact: true }).click()
  await page.getByRole('dialog', { name: 'Importer vers devis' }).waitFor()
}

async function runEngine(name, browserType, contextOptions) {
  const browser = await browserType.launch({ headless: true })
  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', error => pageErrors.push(String(error)))
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

  try {
    await seedAndOpen(page, app.url)
    await page.locator('.quote-file-input').setInputFiles({
      name: 'devis-incomplet.pdf',
      mimeType: 'application/pdf',
      buffer: incompletePdf()
    })
    await page.locator('.quote-review-heading').waitFor({ timeout: 20000 })

    const clientLabel = page.getByText('Client à vérifier.', { exact: true }).locator('..')
    const objectLabel = page.getByText('Objet du devis à vérifier.', { exact: true }).locator('..')
    const clientInput = clientLabel.locator('input')
    const objectInput = objectLabel.locator('input')

    await clientInput.fill('Piraclinique')
    await page.screenshot({ path: join(artifactDir, `before-${name}-390.png`), fullPage: true })

    await objectInput.focus()
    await objectInput.type('Changement')
    await objectInput.press('Space')
    const afterSpace = await objectInput.inputValue()
    await objectInput.type('toile')
    const finalValue = await objectInput.inputValue()

    await page.screenshot({ path: join(artifactDir, `after-${name}-390.png`), fullPage: true })

    return {
      engine: name,
      afterSpace,
      finalValue,
      exact: finalValue === 'Changement toile',
      trailingSpacePreserved: afterSpace === 'Changement ',
      pageErrors,
      consoleErrors
    }
  } finally {
    await context.close()
    await browser.close()
  }
}

const app = await serve()
const results = []
let failure = null

try {
  results.push(await runEngine('chromium', chromium, {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  }))
  results.push(await runEngine('webkit', webkit, {
    ...devices['iPhone 14 Pro'],
    viewport: { width: 390, height: 844 }
  }))

  const bad = results.filter(result =>
    !result.exact ||
    !result.trailingSpacePreserved ||
    result.pageErrors.length ||
    result.consoleErrors.length
  )
  if (bad.length) failure = `Runtime input-space failure: ${JSON.stringify(bad)}`
} catch (error) {
  failure = error instanceof Error ? error.stack : String(error)
} finally {
  app.server.closeAllConnections?.()
  await new Promise(resolveClose => app.server.close(resolveClose))
}

const report = { results, failure }
writeFileSync(join(artifactDir, 'report.json'), JSON.stringify(report, null, 2))

if (failure) {
  console.error(failure)
  process.exit(1)
}

console.log('REVIEW INPUT SPACE CERTIFIED:', JSON.stringify(results))
