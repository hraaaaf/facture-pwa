import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const outDir = 'artifacts/pdf-themes-ui'
const themes = ['majestic', 'lumiere', 'terracotta', 'innova', 'platine', 'atlas']
const labels = {
  majestic: 'Majestic', lumiere: 'Lumière', terracotta: 'Terracotta', innova: 'Innova', platine: 'Platine', atlas: 'Atlas Prestige'
}
const viewports = [[390, 844], [430, 932], [768, 1024]]
await mkdir(outDir, { recursive: true })

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4176'], { stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', chunk => { serverLog += chunk.toString() })
server.stderr.on('data', chunk => { serverLog += chunk.toString() })

async function stopServer() {
  if (server.exitCode !== null) return
  server.kill('SIGTERM')
  await Promise.race([new Promise(resolve => server.once('exit', resolve)), sleep(1200)])
  if (server.exitCode === null) server.kill('SIGKILL')
}

async function waitServer() {
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch('http://127.0.0.1:4176')).ok) return } catch {}
    await sleep(250)
  }
  throw new Error(`Vite preview unavailable\n${serverLog}`)
}

const report = { generatedAt: new Date().toISOString(), assertions: [], screenshots: [], themes: {}, pageErrors: [], consoleErrors: [] }
const ok = (name, detail = true) => report.assertions.push({ name, ok: true, detail })

async function configureCompany(page) {
  await page.getByText('Configure ton entreprise', { exact: true }).waitFor()
  for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('button', { name: 'Terminer la configuration', exact: true }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
}

async function startAndFinalizeInvoice(page) {
  await page.getByLabel('Nouveau document', { exact: true }).click()
  const newDialog = page.getByRole('dialog', { name: 'Nouveau document', exact: true })
  await newDialog.getByRole('button', { name: /Facture/ }).click()
  await page.getByRole('heading', { name: 'Facture', exact: true }).waitFor()
  await page.locator('.editor-meta input[type="date"]').fill('2026-08-26')
  await page.getByPlaceholder('Nom du client ou organisme').fill('Client Design Premium')
  await page.getByPlaceholder('Objet du document').fill('Collection de modèles premium haut de gamme')
  await page.getByPlaceholder('Prestation ou article').fill('Conception et fourniture premium')
  await page.getByLabel('Qté', { exact: true }).fill('2')
  await page.getByLabel('PU HT', { exact: true }).fill('1250')
  await page.getByLabel('TVA %', { exact: true }).fill('20')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Finaliser', exact: true }).click()
  await page.locator('.editor-readonly').waitFor({ timeout: 8000 })
  const number = await page.locator('.editor-meta input').first().inputValue()
  assert.equal(number, 'F-2026-001')
  ok('Numérotation finalisée matérialisée', number)
}

async function noOverflow(page, label) {
  const metrics = await page.evaluate(() => ({ viewport: window.innerWidth, body: document.body.scrollWidth, html: document.documentElement.scrollWidth }))
  assert(metrics.body <= metrics.viewport + 1, `${label} body overflow ${JSON.stringify(metrics)}`)
  assert(metrics.html <= metrics.viewport + 1, `${label} html overflow ${JSON.stringify(metrics)}`)
  return metrics
}

await waitServer()
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()) })

  await page.goto('http://127.0.0.1:4176', { waitUntil: 'networkidle' })
  await configureCompany(page)
  await startAndFinalizeInvoice(page)
  await page.getByRole('button', { name: 'Aperçu PDF', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Aperçu PDF', exact: true })
  await dialog.waitFor()

  assert.equal(await dialog.locator('.template-option').count(), 8)
  ok('Sélecteur expose Original + Premium + 6 nouveaux modèles', 8)

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height })
    const galleryFile = `gallery-${width}.png`
    await page.screenshot({ path: `${outDir}/${galleryFile}`, fullPage: false })
    report.screenshots.push(galleryFile)

    for (const theme of themes) {
      await dialog.getByRole('button', { name: new RegExp(`^${labels[theme]}`) }).click()
      const paper = dialog.locator(`[data-template="${theme}"]`)
      await paper.waitFor()
      const paperBox = await paper.boundingBox()
      assert(paperBox, `${theme} paper missing ${width}`)
      assert(paperBox.x >= -1 && paperBox.x + paperBox.width <= width + 1, `${theme}/${width} paper overflow ${JSON.stringify(paperBox)}`)
      const metrics = await noOverflow(page, `${theme}-${width}`)
      const actions = await dialog.locator('.preview-actions button').evaluateAll(buttons => buttons.map(button => {
        const box = button.getBoundingClientRect(); return { text: button.textContent?.trim(), width: box.width, height: box.height }
      }))
      assert(actions.every(action => action.height >= 44), `${theme}/${width} action <44px ${JSON.stringify(actions)}`)
      const file = `${theme}-${width}.png`
      await page.screenshot({ path: `${outDir}/${file}`, fullPage: false })
      report.screenshots.push(file)
      report.themes[`${theme}-${width}`] = { paperBox, metrics, actions }
    }
  }

  assert.equal(report.pageErrors.length, 0, `Page errors ${JSON.stringify(report.pageErrors)}`)
  assert.equal(report.consoleErrors.length, 0, `Console errors ${JSON.stringify(report.consoleErrors)}`)
  ok('6 thèmes certifiés sur 390/430/768', themes.length * viewports.length)
  report.serverLog = serverLog
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
  console.log(`PDF THEMES UI AUDIT OK: ${report.assertions.length} assertions, ${report.screenshots.length} captures`)
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
