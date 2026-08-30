import { chromium } from 'playwright'
import { jsPDF } from 'jspdf'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const [baselineRoot, featureRoot] = process.argv.slice(2)
if (!baselineRoot || !featureRoot) throw new Error('Usage: node script baselineRoot featureRoot')

const artifactDir = resolve('artifacts/import-guards')
mkdirSync(artifactDir, { recursive: true })
const widths = [390, 430, 768, 1280]
const assertions = []
const failures = []
const report = { assertions, widths: {}, failure: null }
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' }

function serve(root) {
  const dist = resolve(root, 'dist')
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname
    let file = join(dist, pathname === '/' ? 'index.html' : pathname)
    if (!existsSync(file)) file = join(dist, 'index.html')
    try { res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)) }
    catch { res.writeHead(404); res.end('not found') }
  })
  return new Promise(resolveServer => server.listen(0, '127.0.0.1', () => resolveServer({ server, url:`http://127.0.0.1:${server.address().port}` })))
}

async function seedAndOpen(page, url) {
  await page.goto(url)
  await page.waitForTimeout(120)
  await page.evaluate(async () => {
    const req = indexedDB.open('facture-pwa', 3)
    const db = await new Promise((resolve, reject) => { req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error) })
    const tx = db.transaction(['settings'], 'readwrite')
    tx.objectStore('settings').put({
      name:'TAPISTOR',brand:'TAPISTOR',address:'Rabat',cityLabel:'Rabat',phone:'',fax:'',email:'',ice:'001',ifNumber:'001',rc:'',patente:'',cnss:'',bankName:'',rib:'',legalLine:'',defaultVatRate:20,logoDataUrl:'',managerSignatureDataUrl:'',pdfTemplate:'premium',onboardingCompleted:true,
      numberingPrefixes:{DEVIS:'DEV',FACTURE:'F',BL:'BL',BC:'BC'},numberingBaseline:{year:2026,lastUsed:{DEVIS:0,FACTURE:0,BL:0,BC:0}}
    }, 'company')
    await new Promise((resolve, reject) => { tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error) })
    db.close()
  })
  await page.reload()
  await page.getByRole('button', { name:'Nouveau document' }).click()
  await page.getByText('Importer → devis', { exact:true }).click()
  await page.getByRole('dialog', { name:'Importer vers devis' }).waitFor()
}

function check(name, ok, detail='') {
  assertions.push({ name, ok, detail })
  if (!ok) failures.push(`${name}: ${detail}`)
}

function pdfWithPages(pageCount) {
  const pdf = new jsPDF({ compress:true })
  pdf.text('Factea import guard certification', 20, 20)
  for (let page = 2; page <= pageCount; page += 1) {
    pdf.addPage()
    pdf.text(`Page ${page}`, 20, 20)
  }
  return Buffer.from(pdf.output('arraybuffer'))
}

const baseline = await serve(baselineRoot)
const feature = await serve(featureRoot)
const browser = await chromium.launch({ headless:true })

try {
  for (const width of widths) {
    const row = report.widths[width] = {}
    for (const phase of ['before','after']) {
      const page = await browser.newPage({ viewport:{ width, height: width <= 430 ? 844 : 900 } })
      const pageErrors = []; const consoleErrors = []
      page.on('pageerror', error => pageErrors.push(String(error)))
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
      await seedAndOpen(page, phase === 'before' ? baseline.url : feature.url)
      await page.screenshot({ path:join(artifactDir, `${phase}-${width}.png`), fullPage:true })
      row[phase] = await page.evaluate(() => ({ innerWidth, scrollWidth:document.documentElement.scrollWidth, text:document.body.innerText }))
      row[phase].pageErrors = pageErrors
      row[phase].consoleErrors = consoleErrors
      await page.close()
    }
  }

  const beforePage = await browser.newPage({ viewport:{ width:390, height:844 } })
  await seedAndOpen(beforePage, baseline.url)
  const baselineText = await beforePage.locator('body').innerText()
  check('baseline_defect', !baselineText.includes('Limites de sécurité') && !baselineText.includes('15 Mo'), 'baseline must not advertise import guardrails')
  await beforePage.close()

  const page = await browser.newPage({ viewport:{ width:390, height:844 } })
  await seedAndOpen(page, feature.url)
  const bodyText = await page.locator('body').innerText()
  check('limits_visible', bodyText.includes('15 Mo') && bodyText.includes('20 pages') && bodyText.includes('45 s'), 'picker must expose configured limits')

  await page.locator('.quote-file-input').setInputFiles({
    name:'trop-lourd.pdf', mimeType:'application/pdf', buffer:Buffer.alloc(15 * 1024 * 1024 + 1, 0x20)
  })
  await page.getByText('Fichier trop lourd. Limite : 15 Mo.', { exact:true }).waitFor({ timeout:3000 })
  check('oversized_rejected', await page.getByText('Fichier trop lourd. Limite : 15 Mo.', { exact:true }).count() === 1, 'oversized file must fail before heavy parsing')

  await page.getByRole('button', { name:'Annuler', exact:true }).click()
  await page.locator('.quote-file-input').setInputFiles({
    name:'21-pages.pdf', mimeType:'application/pdf', buffer:pdfWithPages(21)
  })
  await page.getByText('PDF trop long. Limite : 20 pages.', { exact:true }).waitFor({ timeout:10000 })
  check('pdf_page_limit', await page.getByText('PDF trop long. Limite : 20 pages.', { exact:true }).count() === 1, '21-page PDF must be rejected before page rendering/OCR')

  await page.getByRole('button', { name:'Annuler', exact:true }).click()
  await page.locator('.quote-file-input').setInputFiles({
    name:'cancel.pdf', mimeType:'application/pdf', buffer:pdfWithPages(20)
  })
  const cancelButton = page.getByRole('button', { name:'Annuler l’analyse', exact:true })
  await cancelButton.waitFor({ state:'visible', timeout:3000 })
  await page.screenshot({ path:join(artifactDir, 'after-processing-390.png'), fullPage:true })
  await cancelButton.click()
  await page.getByText('Analyse annulée.', { exact:true }).waitFor({ timeout:3000 })
  check('cancel_controlled', await page.getByText('Analyse annulée.', { exact:true }).count() === 1, 'user cancellation must surface as controlled cancellation')
  check('cancel_no_create', await page.getByText('Devis importé en brouillon', { exact:true }).count() === 0, 'cancelled import must never create a draft')

  await page.getByRole('button', { name:'Annuler', exact:true }).click()
  const csv = 'Client: Atlas SARL\nObjet: Test garde-fous\nDate: 2026-08-30\nDésignation;Qte;P.U;TVA\nService test;1;100;20\n'
  await page.locator('.quote-file-input').setInputFiles({ name:'devis.csv', mimeType:'text/csv', buffer:Buffer.from(csv) })
  await page.getByRole('button', { name:'Créer le devis', exact:true }).waitFor({ timeout:10000 })
  check('normal_import_unchanged', await page.getByRole('button', { name:'Créer le devis', exact:true }).count() === 1, 'normal under-limit CSV import must still reach READY')
  await page.close()

  const responsive = widths.every(width => ['before','after'].every(phase => {
    const x = report.widths[width][phase]
    return x.scrollWidth === x.innerWidth && x.pageErrors.length === 0 && x.consoleErrors.length === 0
  }))
  check('responsive_clean', responsive, 'all viewports require exact width and zero browser errors')
} catch (error) {
  report.failure = error instanceof Error ? error.stack : String(error)
  failures.push(report.failure)
} finally {
  await browser.close()
  baseline.server.closeAllConnections?.(); feature.server.closeAllConnections?.()
  await Promise.all([new Promise(r=>baseline.server.close(r)), new Promise(r=>feature.server.close(r))])
}

writeFileSync(join(artifactDir, 'report.json'), JSON.stringify(report, null, 2))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log(`IMPORT GUARDS CERTIFIED: ${assertions.length}/${assertions.length} assertions`)
