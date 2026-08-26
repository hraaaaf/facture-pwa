import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const outDir = 'artifacts/final-premium-mobile'
await mkdir(outDir, { recursive: true })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174'], { stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', chunk => { serverLog += chunk.toString() })
server.stderr.on('data', chunk => { serverLog += chunk.toString() })

async function stopServer() {
  if (server.exitCode !== null) return
  server.kill('SIGTERM')
  await Promise.race([new Promise(resolve => server.once('exit', resolve)), sleep(1500)])
  if (server.exitCode === null) server.kill('SIGKILL')
}

async function waitServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4174')
      if (response.ok) return
    } catch {}
    await sleep(250)
  }
  throw new Error(`Vite preview unavailable\n${serverLog}`)
}

const report = {
  generatedAt: new Date().toISOString(),
  assertions: [],
  screenshots: [],
  pageErrors: [],
  consoleErrors: [],
  premium: {},
  clientFlow: {}
}
const ok = (name, detail = true) => report.assertions.push({ name, ok: true, detail })

async function configureCompany(page) {
  await page.getByText('Configure ton entreprise', { exact: true }).waitFor()
  for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('button', { name: 'Terminer la configuration', exact: true }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
}

async function startInvoice(page) {
  await page.getByLabel('Nouveau document', { exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nouveau document', exact: true })
  await dialog.waitFor()
  await dialog.getByRole('button', { name: /Facture/ }).click()
  await page.getByRole('heading', { name: 'Facture', exact: true }).waitFor()
}

async function finalize(page, expected) {
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Finaliser', exact: true }).click()
  await page.locator('.editor-readonly').waitFor({ timeout: 8000 })
  assert.equal(await page.locator('.editor-meta input').first().inputValue(), expected)
}

async function assertNoViewportOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.body.scrollWidth,
    html: document.documentElement.scrollWidth
  }))
  assert(metrics.body <= metrics.viewport + 1, `${label} body overflow: ${JSON.stringify(metrics)}`)
  assert(metrics.html <= metrics.viewport + 1, `${label} html overflow: ${JSON.stringify(metrics)}`)
  return metrics
}

async function capturePremium(page, width, height) {
  await page.setViewportSize({ width, height })
  await page.getByRole('button', { name: 'Aperçu PDF', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Aperçu PDF', exact: true })
  await dialog.waitFor()
  await dialog.getByRole('button', { name: 'Premium', exact: true }).click()
  const paper = dialog.locator('.pdf-paper.premium')
  await paper.waitFor()
  assert(await dialog.getByRole('button', { name: 'Premium', exact: true }).evaluate(button => button.classList.contains('active')))

  const paperBox = await paper.boundingBox()
  assert(paperBox, `Premium paper missing at ${width}`)
  assert(paperBox.x >= -1 && paperBox.x + paperBox.width <= width + 1, `Premium paper overflow ${width}: ${JSON.stringify(paperBox)}`)
  const metrics = await assertNoViewportOverflow(page, `premium-${width}`)

  const actions = await dialog.locator('.preview-actions button').evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect()
    return { text: button.textContent?.trim(), width: box.width, height: box.height }
  }))
  assert.equal(actions.length, 3)
  assert(actions.every(action => action.height >= 44), `Premium actions <44px at ${width}: ${JSON.stringify(actions)}`)

  const file = `premium-${width}.png`
  await page.screenshot({ path: `${outDir}/${file}`, fullPage: false })
  report.screenshots.push(file)
  report.premium[width] = { paperBox, metrics, actions }
  await dialog.getByRole('button', { name: 'Retour', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
}

async function captureClientFlow(page, width, height) {
  await page.setViewportSize({ width, height })
  const suggestions = page.locator('.memory-suggestions')
  await suggestions.waitFor()
  await suggestions.scrollIntoViewIfNeeded()
  const suggestionCount = await suggestions.locator('button').count()
  assert(suggestionCount > 0, `No client suggestion at ${width}`)
  const metrics = await assertNoViewportOverflow(page, `client-suggestions-${width}`)
  const suggestionsFile = `client-suggestions-${width}.png`
  await page.screenshot({ path: `${outDir}/${suggestionsFile}`, fullPage: false })
  report.screenshots.push(suggestionsFile)

  await page.getByRole('button', { name: '+ Mémoriser', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Fiche client', exact: true })
  await dialog.waitFor()
  const closeBox = await dialog.getByRole('button', { name: 'Fermer', exact: true }).boundingBox()
  assert(closeBox && closeBox.width >= 44 && closeBox.height >= 44, `Client sheet close <44px at ${width}: ${JSON.stringify(closeBox)}`)
  await assertNoViewportOverflow(page, `client-sheet-${width}`)
  const sheetFile = `client-sheet-${width}.png`
  await page.screenshot({ path: `${outDir}/${sheetFile}`, fullPage: false })
  report.screenshots.push(sheetFile)
  report.clientFlow[width] = { suggestionCount, metrics, closeBox }
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
}

await waitServer()
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push(message.text())
  })

  await page.goto('http://127.0.0.1:4174', { waitUntil: 'networkidle' })
  await configureCompany(page)
  await startInvoice(page)
  await page.locator('.editor-meta input[type="date"]').fill('2026-08-26')
  await page.getByPlaceholder('Nom du client ou organisme').fill('Client Premium Mobile')
  await page.getByPlaceholder('Objet du document').fill('Certification Premium mobile')
  await page.getByPlaceholder('Prestation ou article').fill('Service Premium')
  await page.getByLabel('Qté', { exact: true }).fill('2')
  await page.getByLabel('PU HT', { exact: true }).fill('450')
  await page.getByLabel('TVA %', { exact: true }).fill('20')

  await page.getByRole('button', { name: '+ Mémoriser', exact: true }).click()
  const clientDialog = page.getByRole('dialog', { name: 'Fiche client', exact: true })
  await clientDialog.getByRole('textbox', { name: 'Adresse', exact: true }).fill('Adresse Premium Mobile')
  await clientDialog.getByRole('button', { name: 'Mémoriser le client', exact: true }).click()
  await clientDialog.waitFor({ state: 'hidden' })
  await finalize(page, 'F-2026-001')

  for (const [width, height] of [[390, 844], [430, 932], [768, 1024]]) {
    await capturePremium(page, width, height)
  }
  ok('Aperçu Premium explicite certifié sur 390/430/768')

  await page.getByRole('button', { name: 'Retour', exact: true }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
  await startInvoice(page)
  await page.getByPlaceholder('Nom du client ou organisme').fill('Client Premium')
  await page.locator('.memory-suggestions').waitFor()

  for (const [width, height] of [[390, 844], [430, 932], [768, 1024]]) {
    await captureClientFlow(page, width, height)
  }
  ok('Suggestions + fiche client certifiées sur 390/430/768')

  assert.equal(report.pageErrors.length, 0, `Page errors: ${JSON.stringify(report.pageErrors)}`)
  assert.equal(report.consoleErrors.length, 0, `Console errors: ${JSON.stringify(report.consoleErrors)}`)
  report.serverLog = serverLog
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
  console.log(`FINAL PREMIUM MOBILE CERTIFICATION OK: ${report.assertions.length} assertions`)
  await context.close()
} catch (error) {
  report.failure = error instanceof Error ? error.stack || error.message : String(error)
  report.serverLog = serverLog
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
  throw error
} finally {
  await browser.close()
  await stopServer()
}
