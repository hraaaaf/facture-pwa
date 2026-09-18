import { chromium } from 'playwright'
import { jsPDF } from 'jspdf'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const [baselineRoot, featureRoot] = process.argv.slice(2)
if (!baselineRoot || !featureRoot) throw new Error('Usage: node script baselineRoot featureRoot')

const artifactDir = resolve('artifacts/import-selection')
mkdirSync(artifactDir, { recursive: true })
const widths = [390, 430, 768]
const assertions = []
const failures = []
const report = { assertions, widths: {}, behavior: null, failure: null }
const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' }

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

function check(name, ok, detail='') {
  assertions.push({ name, ok, detail })
  if (!ok) failures.push(`${name}: ${detail}`)
}

function sourcePdf() {
  const pdf = new jsPDF({ compress:true })
  pdf.setFontSize(12)
  pdf.text('DEVIS', 20, 18)
  pdf.text('Client: Institut Atlas', 20, 30)
  pdf.text('Adresse: Avenue Mohammed V, Rabat', 20, 38)
  pdf.text('ICE: 001122334455667', 20, 46)
  pdf.text('IF: 12345678', 20, 54)
  pdf.text('Objet: Changement toile', 20, 62)
  pdf.text('Date: 18/09/2026', 20, 70)
  pdf.text('Article', 20, 90)
  pdf.text('Qte', 105, 90)
  pdf.text('P.U', 135, 90)
  pdf.text('TVA', 170, 90)
  pdf.text('Reparation toile', 20, 102)
  pdf.text('1', 105, 102)
  pdf.text('1500', 135, 102)
  pdf.text('20', 170, 102)
  return Buffer.from(pdf.output('arraybuffer'))
}

async function seedAndOpen(page, url) {
  await page.goto(url)
  await page.waitForTimeout(100)
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
  await page.locator('.quote-file-input').setInputFiles({ name:'devis-selection.pdf', mimeType:'application/pdf', buffer:sourcePdf() })
}

async function waitBaseline(page) {
  await page.waitForFunction(() => Boolean(document.querySelector('.quote-ready-hero,.quote-review-heading,.quote-error-card')), null, { timeout:20000 })
}

async function waitFeature(page) {
  await page.getByText('Résumé de l’import', { exact:true }).waitFor({ timeout:20000 })
}

const baseline = await serve(baselineRoot)
const feature = await serve(featureRoot)
const browser = await chromium.launch({ headless:true })

try {
  for (const width of widths) {
    report.widths[width] = {}
    for (const phase of ['before','after']) {
      const page = await browser.newPage({ viewport:{ width, height: width <= 430 ? 844 : 900 } })
      const errors = []
      page.on('pageerror', error => errors.push(String(error)))
      await seedAndOpen(page, phase === 'before' ? baseline.url : feature.url)
      if (phase === 'before') await waitBaseline(page)
      else await waitFeature(page)
      await page.screenshot({ path:join(artifactDir, `${phase}-${width}.png`), fullPage:true })
      report.widths[width][phase] = await page.evaluate(() => ({
        innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        text: document.body.innerText
      }))
      report.widths[width][phase].errors = errors
      await page.close()
    }
  }

  const page = await browser.newPage({ viewport:{ width:390, height:844 } })
  await seedAndOpen(page, feature.url)
  await waitFeature(page)

  const labels = ['Client', 'Objet', 'Date', 'Adresse', 'ICE', 'IF']
  for (const label of labels) {
    const row = page.locator('.quote-selection-row').filter({ hasText: label }).first()
    check(`detected_${label.toLowerCase()}`, await row.count() === 1, `${label} row missing`)
    check(`default_checked_${label.toLowerCase()}`, await row.locator('input').isChecked(), `${label} should be preselected`)
  }
  check('line_default_checked', await page.locator('.quote-selection-line input').first().isChecked(), 'detected complete line should be preselected')

  await page.getByRole('button', { name:'Tout décocher', exact:true }).click()
  const clientRow = page.locator('.quote-selection-row').filter({ hasText:'Institut Atlas' }).first()
  await clientRow.locator('input').check()
  check('client_only_count', await page.getByText('1 élément sélectionné', { exact:true }).count() === 1, 'selection count must be 1')
  await page.screenshot({ path:join(artifactDir, 'selected-client-only-390.png'), fullPage:true })

  await page.getByRole('button', { name:'Importer la sélection', exact:true }).click()
  await page.locator('input[placeholder="Nom du client ou organisme"]').waitFor()
  const client = await page.locator('input[placeholder="Nom du client ou organisme"]').inputValue()
  const object = await page.locator('textarea[placeholder="Objet du document"]').inputValue()
  const snapshots = await page.locator('.client-snapshot').count()
  const articles = await page.locator('.article-card').count()
  report.behavior = { client, object, snapshots, articles }
  check('selected_client_imported', client === 'Institut Atlas', `client=${client}`)
  check('unchecked_object_empty', object === '', `object=${object}`)
  check('unchecked_client_metadata_empty', snapshots === 0, `snapshots=${snapshots}`)
  check('unchecked_lines_empty', articles === 0, `articles=${articles}`)
  await page.screenshot({ path:join(artifactDir, 'draft-client-only-390.png'), fullPage:true })
  await page.close()

  const responsive = widths.every(width => ['before','after'].every(phase => {
    const row = report.widths[width][phase]
    return row.innerWidth === row.scrollWidth && row.errors.length === 0
  }))
  check('responsive_clean', responsive, 'before/after must have no horizontal overflow or page errors')

  for (const width of widths) {
    check(`summary_visible_${width}`, report.widths[width].after.text.includes('Résumé de l’import') && report.widths[width].after.text.includes('Importer la sélection'), 'summary CTA missing')
  }
} catch (error) {
  report.failure = error instanceof Error ? error.stack : String(error)
  failures.push(report.failure)
} finally {
  await browser.close()
  baseline.server.closeAllConnections?.()
  feature.server.closeAllConnections?.()
  await Promise.all([new Promise(r=>baseline.server.close(r)), new Promise(r=>feature.server.close(r))])
}

writeFileSync(join(artifactDir, 'report.json'), JSON.stringify(report, null, 2))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log(`IMPORT SELECTION CERTIFIED: ${assertions.length}/${assertions.length}`)
