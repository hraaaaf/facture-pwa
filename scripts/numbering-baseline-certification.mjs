import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const mainDir = process.argv[2]
const featureDir = process.argv[3] ?? '.'
if (!mainDir) throw new Error('Usage: node scripts/numbering-baseline-certification.mjs <main-dir> [feature-dir]')

const outDir = 'artifacts/numbering-baseline'
await mkdir(outDir, { recursive: true })

const year = new Date().getFullYear()
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 }
]
const report = { generatedAt: new Date().toISOString(), year, assertions: [], screenshots: [], pageErrors: [], consoleErrors: [] }
const ok = (name, detail = true) => report.assertions.push({ name, ok: true, detail })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function startServer(cwd, port) {
  const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let log = ''
  server.stdout.on('data', chunk => { log += chunk.toString() })
  server.stderr.on('data', chunk => { log += chunk.toString() })
  const origin = `http://127.0.0.1:${port}`
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(origin)
      if (response.ok) return { server, origin }
    } catch {}
    await sleep(250)
  }
  server.kill('SIGTERM')
  throw new Error(`Preview unavailable in ${cwd}\n${log}`)
}

async function stopServer(server) {
  if (server.exitCode !== null) return
  server.kill('SIGTERM')
  await Promise.race([new Promise(resolve => server.once('exit', resolve)), sleep(1200)])
  if (server.exitCode === null) server.kill('SIGKILL')
}

async function openDocumentsStep(page, origin) {
  await page.goto(origin, { waitUntil: 'networkidle' })
  await page.getByText('Configure ton entreprise', { exact: true }).waitFor()
  for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('heading', { name: 'Documents', exact: true }).waitFor()
}

function collectErrors(page) {
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push(message.text())
  })
}

async function captureBefore(browser) {
  const { server, origin } = await startServer(mainDir, 4181)
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      collectErrors(page)
      await openDocumentsStep(page, origin)
      const path = `${outDir}/before-${viewport.width}.png`
      await page.screenshot({ path, fullPage: true })
      report.screenshots.push(path)
      await context.close()
    }
    ok('BEFORE capturé sur les 4 viewports', viewports.map(item => item.width))
  } finally {
    await stopServer(server)
  }
}

async function readCounter(page, key) {
  return page.evaluate(async counterKey => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('facture-pwa', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction('counters', 'readonly')
      const request = tx.objectStore('counters').get(counterKey)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return value
  }, key)
}

async function clearCounters(page) {
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('facture-pwa', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction('counters', 'readwrite')
      tx.objectStore('counters').clear()
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  })
}

async function captureAfterAndVerify(browser) {
  const { server, origin } = await startServer(featureDir, 4182)
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      collectErrors(page)
      await openDocumentsStep(page, origin)
      await page.getByLabel('Dernier numéro Facture', { exact: true }).fill('13')
      await page.getByText(`Prochain : F-${year}-014`, { exact: true }).waitFor()
      const path = `${outDir}/after-${viewport.width}.png`
      await page.screenshot({ path, fullPage: true })
      report.screenshots.push(path)
      await context.close()
    }
    ok('AFTER capturé sur les 4 viewports', viewports.map(item => item.width))

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    collectErrors(page)
    await openDocumentsStep(page, origin)
    await page.getByLabel('Dernier numéro Facture', { exact: true }).fill('13')
    await page.getByLabel('Dernier numéro Devis', { exact: true }).fill('7')
    await page.getByRole('button', { name: 'Terminer la configuration', exact: true }).click()
    await page.getByText('Tableau de bord', { exact: true }).waitFor()

    const seeded = await readCounter(page, `FACTURE:${year}`)
    assert.equal(seeded?.last, 13)
    ok('Compteur facture initialisé au dernier vrai numéro', seeded)

    await clearCounters(page)
    assert.equal(await readCounter(page, `FACTURE:${year}`), undefined)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByText('Tableau de bord', { exact: true }).waitFor()
    const reseeded = await readCounter(page, `FACTURE:${year}`)
    assert.equal(reseeded?.last, 13)
    ok('Baseline persistée et compteur resynchronisé au redémarrage', reseeded)

    await page.getByLabel('Nouveau document', { exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Nouveau document', exact: true })
    await dialog.getByRole('button', { name: /Facture/ }).click()
    await page.getByRole('heading', { name: 'Facture', exact: true }).waitFor()
    await page.locator('.editor-meta input[type="date"]').fill(`${year}-08-28`)
    await page.getByPlaceholder('Nom du client ou organisme').fill('Client Reprise')
    await page.getByPlaceholder('Objet du document').fill('Test reprise numérotation')
    await page.getByPlaceholder('Prestation ou article').fill('Prestation test')
    await page.getByLabel('Qté', { exact: true }).fill('1')
    await page.getByLabel('PU HT', { exact: true }).fill('100')
    await page.getByLabel('TVA %', { exact: true }).fill('20')
    page.once('dialog', confirm => confirm.accept())
    await page.getByRole('button', { name: 'Finaliser', exact: true }).click()
    await page.locator('.editor-readonly').waitFor({ timeout: 8000 })
    const actual = await page.locator('.editor-meta input').first().inputValue()
    assert.equal(actual, `F-${year}-014`)
    ok('Facture 13 reprise vers facture 14', actual)
    await page.screenshot({ path: `${outDir}/proof-f-${year}-014.png`, fullPage: true })
    report.screenshots.push(`${outDir}/proof-f-${year}-014.png`)
    await context.close()
  } finally {
    await stopServer(server)
  }
}

const browser = await chromium.launch({ headless: true })
try {
  await captureBefore(browser)
  await captureAfterAndVerify(browser)
  assert.equal(report.pageErrors.length, 0)
  assert.equal(report.consoleErrors.length, 0)
  ok('Aucune erreur page/console')
} catch (error) {
  report.failure = error instanceof Error ? error.stack ?? error.message : String(error)
  throw error
} finally {
  await browser.close()
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
}

console.log(`NUMBERING BASELINE CERTIFIED: ${report.assertions.length} assertions`)
