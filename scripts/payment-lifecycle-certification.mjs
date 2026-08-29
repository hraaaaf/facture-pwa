import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const [baselineRoot, featureRoot] = process.argv.slice(2)
if (!baselineRoot || !featureRoot) throw new Error('Usage: node script baselineRoot featureRoot')
const artifactDir = resolve('artifacts/payment-lifecycle')
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

async function seed(page) {
  await page.goto(currentUrl)
  await page.evaluate(async () => {
    const req = indexedDB.open('facture-pwa', 3)
    const db = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })
    const tx = db.transaction(['settings', 'documents'], 'readwrite')
    tx.objectStore('documents').clear()
    tx.objectStore('settings').put({
      name:'TAPISTOR',brand:'TAPISTOR',address:'Rabat',cityLabel:'Rabat',phone:'',fax:'',email:'',ice:'001',ifNumber:'001',rc:'',patente:'',cnss:'',bankName:'',rib:'',legalLine:'',defaultVatRate:20,logoDataUrl:'',managerSignatureDataUrl:'',pdfTemplate:'premium',onboardingCompleted:true,
      numberingPrefixes:{DEVIS:'DEV',FACTURE:'F',BL:'BL',BC:'BC'},numberingBaseline:{year:2026,lastUsed:{DEVIS:0,FACTURE:202,BL:0,BC:0}}
    }, 'company')
    const base = {
      type:'FACTURE',date:'2026-08-01',clientId:'',clientAddress:'',clientIce:'',clientIfNumber:'',object:'Fourniture',blShowPrices:false,globalDiscountPercent:0,status:'FINALIZED',finalizedAt:'2026-08-01T09:00:00.000Z',paidAt:'',cancelledAt:'',sourceDocumentId:'',createdAt:'2026-08-01T09:00:00.000Z',updatedAt:'2026-08-01T09:00:00.000Z',
      lines:[{id:'l1',designation:'Service',unit:'Pièce',quantity:1,unitPriceHT:1000,vatRate:20,discountPercent:0}]
    }
    tx.objectStore('documents').put({ ...base, id:'invoice-pay', number:'F-2026-201', client:'Client Paiement', dueDate:'2099-12-31', paymentMethod:'BANK_TRANSFER', payments:[] })
    tx.objectStore('documents').put({ ...base, id:'invoice-overdue', number:'F-2026-202', client:'Client Retard', lines:[{...base.lines[0],unitPriceHT:500}], dueDate:'2026-08-10', paymentMethod:'CHECK', payments:[] })
    await new Promise((resolve, reject) => { tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error) })
    db.close()
  })
  await page.reload()
  await page.getByText('Historique', { exact: true }).last().click()
  await page.waitForTimeout(250)
}

async function rawInvoice(page) {
  return page.evaluate(async () => {
    const req = indexedDB.open('facture-pwa', 3)
    const db = await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})
    const tx = db.transaction('documents','readonly')
    const r = tx.objectStore('documents').get('invoice-pay')
    const value = await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
    db.close()
    return value
  })
}

function check(name, ok, detail='') { assertions.push({ name, ok, detail }); if (!ok) failures.push(`${name}: ${detail}`) }

const baseline = await serve(baselineRoot)
const feature = await serve(featureRoot)
const browser = await chromium.launch({ headless: true })
let currentUrl = baseline.url
try {
  for (const width of widths) {
    const row = report.widths[width] = {}
    for (const phase of ['before','after']) {
      currentUrl = phase === 'before' ? baseline.url : feature.url
      const page = await browser.newPage({ viewport: { width, height: width <= 430 ? 844 : 900 } })
      const pageErrors = []; const consoleErrors = []
      page.on('pageerror', error => pageErrors.push(String(error)))
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
      await seed(page)
      const screenshot = join(artifactDir, `${phase}-${width}.png`)
      await page.screenshot({ path: screenshot, fullPage: true })
      row[phase] = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, text: document.body.innerText }))
      row[phase].pageErrors = pageErrors; row[phase].consoleErrors = consoleErrors
      await page.close()
    }
  }

  check('baseline_payment_lifecycle', report.widths[390].before.text.includes('À encaisser') && report.widths[390].before.text.includes('En retard') && report.widths[390].before.text.includes('Encaisser'), 'main baseline must preserve the certified payment lifecycle')
  check('operational_states', report.widths[390].after.text.includes('À encaisser') && report.widths[390].after.text.includes('En retard'), 'feature must distinguish unpaid and overdue')
  check('balance_visibility', report.widths[390].after.text.includes('Reste') && report.widths[390].after.text.includes('1 200,00') && report.widths[390].after.text.includes('600,00'), 'remaining balances must be visible')

  currentUrl = feature.url
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await seed(page)
  const card = page.locator('.premium-history-card').filter({ hasText: 'Client Paiement' })
  await card.getByText('Encaisser', { exact: true }).click()
  check('payment_sheet', await page.getByRole('dialog', { name: 'Encaissement facture' }).isVisible(), 'payment sheet should open')

  await page.getByLabel('Montant').fill('1300')
  await page.getByLabel('Mode de règlement').selectOption('BANK_TRANSFER')
  await page.getByLabel('Date').fill('2026-08-20')
  await page.getByRole('button', { name: 'Enregistrer le paiement' }).click()
  await page.getByText(/dépasse le reste dû/i).waitFor()
  let raw = await rawInvoice(page)
  check('overpayment_rejected', raw.payments?.length === 0 && raw.status === 'FINALIZED', JSON.stringify({status:raw.status,payments:raw.payments?.length}))

  await page.getByLabel('Montant').fill('400')
  await page.getByLabel('Date').fill('2026-07-31')
  await page.getByRole('button', { name: 'Enregistrer le paiement' }).click()
  await page.getByText(/ne peut pas précéder la date de facture/i).waitFor()
  raw = await rawInvoice(page)
  check('pre_invoice_payment_rejected', raw.payments?.length === 0 && raw.status === 'FINALIZED', JSON.stringify({status:raw.status,payments:raw.payments?.length}))

  await page.getByLabel('Date').fill('2026-08-20')
  await page.getByRole('button', { name: 'Enregistrer le paiement' }).click()
  await page.waitForTimeout(200)
  check('partial_payment', (await page.locator('.payment-sheet').innerText()).includes('800,00') && (await page.locator('.payment-sheet').innerText()).includes('400,00'), '400 payment should leave 800')

  await page.getByLabel('Montant').fill('800')
  await page.getByLabel('Date').fill('2026-08-21')
  await page.getByRole('button', { name: 'Ajouter le paiement' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Fermer' }).click()
  await page.reload()
  await page.getByText('Historique', { exact: true }).last().click()
  await page.waitForTimeout(200)
  const paidCard = page.locator('.premium-history-card').filter({ hasText: 'Client Paiement' })
  check('full_payment_persists', (await paidCard.innerText()).includes('Payé') && !(await paidCard.innerText()).includes('Reste'), 'second payment should settle and persist')
  raw = await rawInvoice(page)
  check('ledger_atomicity', raw.status === 'PAID' && raw.payments?.length === 2 && Math.abs(raw.payments.reduce((sum,payment)=>sum+payment.amount,0)-1200)<0.001, JSON.stringify({status:raw.status,payments:raw.payments?.length}))
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
console.log(`PAYMENT LIFECYCLE CERTIFIED: ${assertions.length}/${assertions.length} assertions`)
