import { chromium } from 'playwright'
import { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

const [mainDirArg, featureDirArg] = process.argv.slice(2)
if (!mainDirArg || !featureDirArg) throw new Error('Usage: node scripts/pdf-personalization-certification.mjs <main-dir> <feature-dir>')
const mainDir = path.resolve(mainDirArg)
const featureDir = path.resolve(featureDirArg)
const outputDir = path.resolve('artifacts/pdf-personalization')
const widths = [390, 430, 768, 1280]
await fs.rm(outputDir, { recursive: true, force: true })
await fs.mkdir(outputDir, { recursive: true })

const mime = file => {
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

const startServer = async (root, port) => {
  const dist = path.join(root, 'dist')
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
      const relative = decodeURIComponent(url.pathname) === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '')
      let file = path.resolve(dist, relative)
      if (!file.startsWith(`${dist}${path.sep}`) && file !== path.join(dist, 'index.html')) { response.writeHead(403); response.end(); return }
      try { if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html') } catch { file = path.join(dist, 'index.html') }
      response.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': 'no-store' })
      response.end(await fs.readFile(file))
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain' }); response.end(String(error))
    }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) })
  return server
}

const closeServer = server => new Promise((resolve, reject) => {
  server.closeAllConnections?.(); server.close(error => error ? reject(error) : resolve())
})

async function configureCompany(page) {
  if (await page.getByText('Configure ton entreprise', { exact: true }).count()) {
    for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await page.getByRole('button', { name: 'Terminer la configuration', exact: true }).click()
  }
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
}

async function openPreview(page) {
  await page.getByLabel('Nouveau document', { exact: true }).click()
  const newDialog = page.getByRole('dialog', { name: 'Nouveau document', exact: true })
  await newDialog.getByRole('button', { name: /Devis/ }).click()
  await page.getByRole('heading', { name: 'Devis', exact: true }).waitFor()
  await page.getByPlaceholder('Nom du client ou organisme').fill('Client Personnalisation')
  await page.getByPlaceholder('Objet du document').fill('Objet facultatif de certification')
  await page.getByPlaceholder('Prestation ou article').fill('Prestation premium')
  await page.getByLabel('Qté', { exact: true }).fill('2')
  await page.getByLabel('PU HT', { exact: true }).fill('125')
  await page.getByLabel('TVA %', { exact: true }).fill('20')
  await page.getByRole('button', { name: 'Aperçu PDF', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Aperçu PDF', exact: true })
  await dialog.waitFor()
  return dialog
}

const readViewport = async page => page.evaluate(() => ({
  width: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  bodyWidth: document.body.scrollWidth
}))

async function capturePhase(browser, phase, url, feature = false) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const pageErrors = []; const consoleErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await configureCompany(page)
  const dialog = await openPreview(page)
  const results = []

  for (const width of widths) {
    await page.setViewportSize({ width, height: width >= 768 ? 960 : 844 })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    if (feature && !(await dialog.getByRole('button', { name: /Affichage/ }).getAttribute('aria-expanded') === 'true')) {
      await dialog.getByRole('button', { name: /Affichage/ }).click()
    }
    const viewport = await readViewport(page)
    assert(viewport.scrollWidth <= viewport.width + 1, `${phase}/${width} html overflow ${JSON.stringify(viewport)}`)
    assert(viewport.bodyWidth <= viewport.width + 1, `${phase}/${width} body overflow ${JSON.stringify(viewport)}`)
    const file = `${phase}-${width}.png`
    await page.screenshot({ path: path.join(outputDir, file), fullPage: false })
    results.push({ width, viewport, file })
  }

  if (feature) {
    const trigger = dialog.getByRole('button', { name: /Affichage/ })
    assert.equal(await trigger.count(), 1)
    if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
    assert.equal(await dialog.locator('.pdf-display-options button').count(), 9)

    const toggle = async label => dialog.locator('.pdf-display-options button').filter({ hasText: label }).click()
    await toggle('Objet')
    assert.equal(await dialog.getByText('OBJET', { exact: true }).count(), 0, 'Objet must disappear from preview')
    await toggle('Unité')
    assert.equal(await dialog.locator('.preview-table-head').getByText('Unité', { exact: true }).count(), 0, 'Unit column must disappear')
    await toggle('Prix unitaire HT')
    assert.equal(await dialog.getByText('PU HT', { exact: true }).count(), 0, 'PU HT column must disappear')
    await toggle('Total HT par ligne')
    assert.equal(await dialog.locator('.preview-table-head').getByText('Total HT', { exact: true }).count(), 0, 'Line Total HT column must disappear')
    await toggle('Total HT')
    await toggle('TVA')
    await toggle('Montant en lettres')
    await toggle('Signatures')
    await toggle('Pied de page')
    assert.equal(await dialog.getByText('Total TTC', { exact: true }).count() > 0, true, 'Total TTC must remain structurally visible')
    assert.equal(await dialog.locator('.preview-signatures').count(), 0, 'Signatures must disappear')
    assert.equal(await dialog.locator('.preview-footer').count(), 0, 'Footer must disappear')
    assert.equal(await dialog.locator('.preview-actions button').count(), 3, 'PDF actions must remain')

    const themeExpectations = {
      original: /Arial|Helvetica/i,
      premium: /Helvetica|Arial/i,
      majestic: /Georgia|Times/i,
      lumiere: /Times/i,
      terracotta: /Georgia|Times/i,
      innova: /Arial|Helvetica/i,
      platine: /Times/i,
      atlas: /Georgia|Times/i
    }
    for (const [theme, pattern] of Object.entries(themeExpectations)) {
      const option = dialog.locator(`.template-option`).filter({ has: dialog.locator(`.theme-swatch-${theme}`) })
      await option.click()
      const paper = dialog.locator(`[data-template="${theme}"]`)
      await paper.waitFor()
      const family = await paper.evaluate(node => getComputedStyle(node).fontFamily)
      assert(pattern.test(family), `${theme} typography mismatch: ${family}`)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: path.join(outputDir, 'after-customized-390.png'), fullPage: false })
  } else {
    assert.equal(await dialog.getByRole('button', { name: /Affichage/ }).count(), 0, 'Baseline must not expose display personalization')
  }

  await page.close()
  return { results, pageErrors, consoleErrors }
}

const mainServer = await startServer(mainDir, 4195)
const featureServer = await startServer(featureDir, 4196)
const browser = await chromium.launch({ headless: true })
let report
try {
  const before = await capturePhase(browser, 'before', 'http://127.0.0.1:4195', false)
  const after = await capturePhase(browser, 'after', 'http://127.0.0.1:4196', true)
  const assertions = [
    { name: 'baseline without Affichage control', ok: true },
    { name: 'feature exposes nine controlled optional fields', ok: true },
    { name: 'optional fields hide independently while Total TTC remains', ok: true },
    { name: 'share/download/print actions remain visible', ok: true },
    { name: 'eight theme typography signatures verified', ok: true },
    { name: '390/430/768/1280 have no overflow', ok: true },
    { name: 'no page/console errors', ok: before.pageErrors.length === 0 && before.consoleErrors.length === 0 && after.pageErrors.length === 0 && after.consoleErrors.length === 0 }
  ]
  if (assertions.some(item => !item.ok)) throw new Error(`Browser certification failed: ${JSON.stringify({ before, after })}`)
  report = { generatedAt: new Date().toISOString(), before, after, assertions }
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`PDF PERSONALIZATION CERTIFIED: ${assertions.length}/${assertions.length}`)
} catch (error) {
  report = { generatedAt: new Date().toISOString(), failure: error instanceof Error ? error.stack || error.message : String(error) }
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  throw error
} finally {
  await browser.close()
  await Promise.all([closeServer(mainServer), closeServer(featureServer)])
}
