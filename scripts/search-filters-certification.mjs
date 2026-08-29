import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const [baselineRoot, featureRoot] = process.argv.slice(2)
if (!baselineRoot || !featureRoot) throw new Error('Usage: node script baselineRoot featureRoot')
const artifactDir = resolve('artifacts/search-filters')
mkdirSync(artifactDir, { recursive: true })
const widths = [390, 430, 768, 1280]
const failures = []
const assertions = []
const report = { assertions, widths: {}, failure: null }

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
function serve(root) {
  const dist = resolve(root, 'dist')
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname
    let file = join(dist, pathname === '/' ? 'index.html' : pathname)
    if (!existsSync(file)) file = join(dist, 'index.html')
    try { res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)) }
    catch { res.writeHead(404); res.end('not found') }
  })
  return new Promise(resolveServer => server.listen(0, '127.0.0.1', () => resolveServer({ server, url: `http://127.0.0.1:${server.address().port}` })))
}

async function seed(page, url) {
  await page.goto(url)
  await page.evaluate(async () => {
    const req = indexedDB.open('facture-pwa', 3)
    const db = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })
    const tx = db.transaction(['settings', 'documents'], 'readwrite')
    tx.objectStore('documents').clear()
    tx.objectStore('settings').put({
      name:'TAPISTOR',brand:'TAPISTOR',address:'Rabat',cityLabel:'Rabat',phone:'',fax:'',email:'',ice:'001',ifNumber:'001',rc:'',patente:'',cnss:'',bankName:'',rib:'',legalLine:'',defaultVatRate:20,logoDataUrl:'',managerSignatureDataUrl:'',pdfTemplate:'premium',onboardingCompleted:true,
      numberingPrefixes:{DEVIS:'DEV',FACTURE:'F',BL:'BL',BC:'BC'},numberingBaseline:{year:2026,lastUsed:{DEVIS:0,FACTURE:3,BL:0,BC:0}}
    }, 'company')
    const common = {
      type:'FACTURE',clientId:'',clientAddress:'Rabat',clientIfNumber:'',object:'Fourniture',blShowPrices:false,globalDiscountPercent:0,dueDate:'',paymentMethod:'UNSPECIFIED',payments:[],status:'FINALIZED',finalizedAt:'2026-08-01T09:00:00.000Z',paidAt:'',cancelledAt:'',sourceDocumentId:'',createdAt:'2026-08-01T09:00:00.000Z',updatedAt:'2026-08-01T09:00:00.000Z'
    }
    tx.objectStore('documents').put({ ...common, id:'d1', number:'F-2026-001', date:'2026-08-05', client:'Atlas Hôtel', clientIce:'001111111111111', lines:[{id:'l1',designation:'Nettoyage tapis premium',unit:'Forfait',quantity:1,unitPriceHT:1000,vatRate:20,discountPercent:0}] })
    tx.objectStore('documents').put({ ...common, id:'d2', number:'F-2026-002', date:'2026-08-17', client:'Riad Bleu', clientIce:'002222222222222', lines:[{id:'l2',designation:'Rideaux chambre',unit:'Pièce',quantity:2,unitPriceHT:200,vatRate:20,discountPercent:0}] })
    tx.objectStore('documents').put({ ...common, id:'d3', number:'F-2026-003', date:'2026-07-10', client:'Maison Rouge', clientIce:'003333333333333', lines:[{id:'l3',designation:'Canapé réception',unit:'Pièce',quantity:1,unitPriceHT:300,vatRate:20,discountPercent:0}] })
    await new Promise((resolve, reject) => { tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error) })
    db.close()
  })
  await page.reload()
  await page.getByText('Historique', { exact: true }).last().click()
  await page.waitForTimeout(200)
}

function check(name, ok, detail='') { assertions.push({ name, ok, detail }); if (!ok) failures.push(`${name}: ${detail}`) }

const baseline = await serve(baselineRoot)
const feature = await serve(featureRoot)
const browser = await chromium.launch({ headless: true })
try {
  for (const width of widths) {
    const row = report.widths[width] = {}
    for (const phase of ['before','after']) {
      const url = phase === 'before' ? baseline.url : feature.url
      const page = await browser.newPage({ viewport: { width, height: width <= 430 ? 844 : 900 } })
      const pageErrors = []; const consoleErrors = []
      page.on('pageerror', error => pageErrors.push(String(error)))
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
      await seed(page, url)
      const screenshot = join(artifactDir, `${phase}-${width}.png`)
      await page.screenshot({ path: screenshot, fullPage: true })
      row[phase] = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, text: document.body.innerText }))
      row[phase].pageErrors = pageErrors; row[phase].consoleErrors = consoleErrors
      await page.close()
    }
  }

  const baselinePage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await seed(baselinePage, baseline.url)
  await baselinePage.locator('.history-search input').fill('001111111111111')
  await baselinePage.waitForTimeout(100)
  check('baseline_defect', await baselinePage.locator('.premium-history-card').count() === 0, 'baseline should not find ICE')
  await baselinePage.close()

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await seed(page, feature.url)
  const input = page.locator('.history-search input')
  await input.fill('001111111111111')
  await page.waitForTimeout(100)
  check('search_ice', await page.locator('.premium-history-card').count() === 1 && (await page.locator('.premium-history-card').first().innerText()).includes('Atlas Hôtel'), 'ICE should find Atlas')

  await input.fill('TAPIS PREMIUM')
  await page.waitForTimeout(100)
  check('search_designation', await page.locator('.premium-history-card').count() === 1 && (await page.locator('.premium-history-card').first().innerText()).includes('Atlas Hôtel'), 'line designation should find Atlas')

  await input.fill('')
  await page.getByRole('button', { name: /^Filtres/ }).click()
  await page.getByLabel('Période').selectOption('THIS_MONTH')
  await page.waitForTimeout(100)
  check('period_filter', await page.locator('.premium-history-card').count() === 2, 'current month should keep two August documents')

  await page.getByLabel('Période').selectOption('ALL')
  await page.getByLabel('Montant min. TTC').fill('1000')
  await page.waitForTimeout(100)
  check('amount_filter', await page.locator('.premium-history-card').count() === 1 && (await page.locator('.premium-history-card').first().innerText()).includes('Atlas Hôtel'), 'minimum TTC should keep 1200 MAD document')
  await page.close()

  const layoutsOk = widths.every(width => ['before','after'].every(phase => { const x=report.widths[width][phase]; return x.scrollWidth === x.innerWidth && x.pageErrors.length === 0 && x.consoleErrors.length === 0 }))
  check('responsive_clean', layoutsOk, 'all viewports require exact width and zero browser errors')
} catch (error) { report.failure = error instanceof Error ? error.stack : String(error); failures.push(report.failure) }
finally {
  await browser.close()
  baseline.server.closeAllConnections?.(); feature.server.closeAllConnections?.()
  await Promise.all([new Promise(resolveClose=>baseline.server.close(resolveClose)),new Promise(resolveClose=>feature.server.close(resolveClose))])
}
writeFileSync(join(artifactDir,'report.json'), JSON.stringify(report,null,2))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log(`SEARCH FILTERS CERTIFIED: ${assertions.length}/${assertions.length} assertions`)

// Step 4 final certification trigger. No runtime behavior.
