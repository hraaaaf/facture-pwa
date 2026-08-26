import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const outDir = 'artifacts/final-certification'
await mkdir(outDir, { recursive: true })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], { stdio: ['ignore', 'pipe', 'pipe'] })
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
      const response = await fetch('http://127.0.0.1:4173')
      if (response.ok) return
    } catch {}
    await sleep(250)
  }
  throw new Error(`Vite preview unavailable\n${serverLog}`)
}

const report = {
  generatedAt: new Date().toISOString(),
  assertions: [], screenshots: [], pageErrors: [], consoleErrors: [], touchTargets: {}, numbers: {}, backup: {}, offline: false, serverLog: ''
}
const ok = (name, detail = true) => report.assertions.push({ name, ok: true, detail })

async function configureCompany(page) {
  await page.getByText('Configure ton entreprise', { exact: true }).waitFor()
  for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('button', { name: 'Terminer la configuration', exact: true }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
}

async function startDocument(page, type) {
  const label = { FACTURE: 'Facture', DEVIS: 'Devis', BL: 'Bon de livraison', BC: 'Bon de commande' }[type]
  await page.getByLabel('Nouveau document', { exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nouveau document', exact: true })
  await dialog.waitFor()
  await dialog.getByRole('button', { name: new RegExp(label) }).click()
  await page.getByRole('heading', { name: label, exact: true }).waitFor()
}

async function fillCurrent(page, { client = 'Client Certification', object = 'Objet certification', designation = 'Service Certification', qty = 1, pu = 100, vat = 20, date = '2026-08-26' } = {}) {
  await page.locator('.editor-meta input[type="date"]').fill(date)
  await page.getByPlaceholder('Nom du client ou organisme').fill(client)
  await page.getByPlaceholder('Objet du document').fill(object)
  await page.getByPlaceholder('Prestation ou article').fill(designation)
  await page.getByLabel('Qté', { exact: true }).fill(String(qty))
  const puField = page.getByLabel('PU HT', { exact: true })
  if (await puField.count()) await puField.fill(String(pu))
  const vatField = page.getByLabel('TVA %', { exact: true })
  if (await vatField.count()) await vatField.fill(String(vat))
}

async function finalizeCurrent(page) {
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Finaliser', exact: true }).click()
  await page.getByText('Document verrouillé', { exact: false }).waitFor()
  return page.locator('.editor-meta input').first().inputValue()
}

async function backHome(page) {
  await page.getByRole('button', { name: 'Retour', exact: true }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
}

async function simpleFinalize(page, type, expected, date = '2026-08-26') {
  await startDocument(page, type)
  await fillCurrent(page, { client: `Client ${type}`, object: `Objet ${type}`, designation: `Service ${type}`, date })
  const number = await finalizeCurrent(page)
  assert.equal(number, expected)
  ok(`${type} ${expected}`)
  await backHome(page)
  return number
}

async function readDb(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('facture-pwa', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const readAll = storeName => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const request = tx.objectStore(storeName).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const [documents, clients, catalog, counters] = await Promise.all([readAll('documents'), readAll('clients'), readAll('catalog'), readAll('counters')])
    db.close()
    return { documents, clients, catalog, counters }
  })
}

async function clearStores(page) {
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('facture-pwa', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['documents', 'clients', 'catalog', 'counters'], 'readwrite')
      for (const name of ['documents', 'clients', 'catalog', 'counters']) tx.objectStore(name).clear()
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  })
}

async function measureTouch(page, viewport) {
  await page.getByLabel('Nouveau document', { exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Nouveau document', exact: true })
  await sheet.waitFor()
  const closeBox = await sheet.getByRole('button', { name: 'Fermer', exact: true }).boundingBox()
  assert(closeBox && closeBox.width >= 44 && closeBox.height >= 44, `sheet-close ${viewport}: ${JSON.stringify(closeBox)}`)
  report.touchTargets[`${viewport}-sheet-close`] = closeBox
  await page.screenshot({ path: `${outDir}/${viewport}-touch-new.png`, fullPage: false })
  report.screenshots.push(`${viewport}-touch-new.png`)
  await sheet.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Historique' }).click()
  await page.getByRole('heading', { name: 'Historique', exact: true }).waitFor()
  const boxes = await page.locator('.history-card-actions button').evaluateAll(elements => elements.slice(0, 12).map(element => {
    const box = element.getBoundingClientRect()
    return { text: element.textContent?.trim(), width: box.width, height: box.height }
  }))
  assert(boxes.length > 0, `No history actions at ${viewport}`)
  assert(boxes.every(box => box.height >= 44), `History targets ${viewport}: ${JSON.stringify(boxes)}`)
  report.touchTargets[`${viewport}-history`] = boxes
  await page.screenshot({ path: `${outDir}/${viewport}-touch-history.png`, fullPage: false })
  report.screenshots.push(`${viewport}-touch-history.png`)
  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Accueil' }).click()
}

await waitServer()
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
  const page = await context.newPage()
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()) })
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })
  await configureCompany(page)

  await startDocument(page, 'FACTURE')
  await fillCurrent(page, { client: 'Client Certification', object: 'Objet facture 1', designation: 'Service Certification', qty: 2, pu: 800 })
  await page.getByRole('button', { name: '+ Mémoriser', exact: true }).click()
  const clientDialog = page.getByRole('dialog', { name: 'Fiche client', exact: true })
  await clientDialog.waitFor()
  await clientDialog.getByRole('textbox', { name: 'Adresse', exact: true }).fill('Ancienne adresse certification')
  await clientDialog.getByRole('textbox', { name: 'ICE', exact: true }).fill('001122334455667')
  await clientDialog.getByRole('textbox', { name: 'IF', exact: true }).fill('99887766')
  await clientDialog.getByRole('button', { name: 'Mémoriser le client', exact: true }).click()
  const f1 = await finalizeCurrent(page)
  assert.equal(f1, 'F-2026-001')
  report.numbers.f1 = f1
  ok('Facture 001 runtime')
  await backHome(page)

  await startDocument(page, 'FACTURE')
  const clientSuggestion = page.locator('.memory-suggestions button').filter({ hasText: 'Client Certification' }).first()
  await clientSuggestion.waitFor()
  await clientSuggestion.click()
  assert.equal(await page.locator('.client-snapshot span').textContent(), 'Ancienne adresse certification')
  const catalogButton = page.locator('.catalog-quick-row button').filter({ hasText: 'Service Certification' }).first()
  await catalogButton.waitFor()
  await catalogButton.click()
  assert.equal(await page.getByLabel('PU HT', { exact: true }).inputValue(), '800')
  ok('Client autocomplete + catalogue runtime')
  await page.getByRole('button', { name: 'Fiche', exact: true }).click()
  const editClientDialog = page.getByRole('dialog', { name: 'Fiche client', exact: true })
  await editClientDialog.getByRole('textbox', { name: 'Adresse', exact: true }).fill('Nouvelle adresse certification')
  await editClientDialog.getByRole('button', { name: 'Mémoriser le client', exact: true }).click()
  await page.getByPlaceholder('Objet du document').fill('Objet facture 2')
  const f2 = await finalizeCurrent(page)
  assert.equal(f2, 'F-2026-002')
  report.numbers.f2 = f2
  ok('Facture 002 runtime')
  await backHome(page)

  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Historique' }).click()
  const firstCard = page.locator('.premium-history-card').filter({ hasText: 'F-2026-001' })
  await firstCard.getByRole('button', { name: 'Ouvrir', exact: true }).click()
  await page.getByText('Ancienne adresse certification', { exact: true }).waitFor()
  ok('Snapshot client historique immuable')
  await backHome(page)

  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Historique' }).click()
  const card001 = page.locator('.premium-history-card').filter({ hasText: 'F-2026-001' })
  page.once('dialog', dialog => dialog.accept())
  await card001.getByRole('button', { name: 'Annuler', exact: true }).click()
  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Accueil' }).click()
  report.numbers.f3 = await simpleFinalize(page, 'FACTURE', 'F-2026-003')
  report.numbers.devis = await simpleFinalize(page, 'DEVIS', 'DEV-2026-001')
  report.numbers.bl = await simpleFinalize(page, 'BL', 'BL-2026-001')
  report.numbers.bc = await simpleFinalize(page, 'BC', 'BC-2026-001')
  report.numbers.f2027 = await simpleFinalize(page, 'FACTURE', 'F-2027-001', '2027-01-02')

  const dbState = await readDb(page)
  const learnedClient = dbState.clients.find(client => client.name === 'Client Certification')
  const learnedCatalog = dbState.catalog.find(item => item.designation === 'Service Certification')
  assert(learnedClient && learnedClient.address === 'Nouvelle adresse certification')
  assert(learnedCatalog && learnedCatalog.lastUnitPriceHT === 800 && learnedCatalog.vatRate === 20)
  assert(learnedCatalog.usageCount >= 2)
  ok('Client/catalogue IndexedDB learned state')

  await page.getByRole('button', { name: 'Réglages', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Réglages', exact: true })
  await settings.waitFor()
  const [download] = await Promise.all([page.waitForEvent('download'), settings.getByRole('button', { name: /Exporter/ }).click()])
  const backupPath = `${outDir}/backup-v2.json`
  await download.saveAs(backupPath)
  const backup = JSON.parse(await readFile(backupPath, 'utf8'))
  assert.equal(backup.version, 2)
  assert(backup.documents.length >= 7)
  assert(backup.clients.length >= 1)
  assert(backup.catalog.length >= 1)
  report.backup.v2 = { documents: backup.documents.length, clients: backup.clients.length, catalog: backup.catalog.length }
  ok('Backup v2 export runtime', report.backup.v2)

  const v1Path = `${outDir}/backup-v1.json`
  await writeFile(v1Path, JSON.stringify({ version: 1, exportedAt: backup.exportedAt, documents: backup.documents, company: backup.company }, null, 2))
  await clearStores(page)
  const restoreInput = settings.locator('input[type="file"][accept*="json"]')
  const feedback = page.getByText('Sauvegarde restaurée avec succès', { exact: true })
  page.once('dialog', dialog => dialog.accept())
  await restoreInput.setInputFiles(v1Path)
  await feedback.waitFor()
  let restored = await readDb(page)
  assert.equal(restored.documents.length, backup.documents.length)
  assert.equal(restored.clients.length, 0)
  assert.equal(restored.catalog.length, 0)
  report.backup.v1Restore = { documents: restored.documents.length, clients: restored.clients.length, catalog: restored.catalog.length }
  ok('Restore v1 runtime', report.backup.v1Restore)
  await feedback.waitFor({ state: 'hidden', timeout: 5000 })

  page.once('dialog', dialog => dialog.accept())
  await restoreInput.setInputFiles(backupPath)
  await feedback.waitFor()
  restored = await readDb(page)
  assert.equal(restored.documents.length, backup.documents.length)
  assert(restored.clients.length >= 1)
  assert(restored.catalog.length >= 1)
  report.backup.v2Restore = { documents: restored.documents.length, clients: restored.clients.length, catalog: restored.catalog.length }
  ok('Restore v2 runtime', report.backup.v2Restore)
  await settings.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByText('Tableau de bord', { exact: true }).waitFor()
  }
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Tableau de bord', { exact: true }).waitFor({ timeout: 7000 })
  report.offline = true
  ok('Offline reload via service worker')
  await context.setOffline(false)

  for (const width of [390, 430, 768]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : width === 430 ? 932 : 1024 })
    await measureTouch(page, width)
  }
  ok('Touch targets >=44 on measured AFTER screens')

  assert.equal(report.pageErrors.length, 0, `Page errors: ${JSON.stringify(report.pageErrors)}`)
  assert.equal(report.consoleErrors.length, 0, `Console errors: ${JSON.stringify(report.consoleErrors)}`)
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
  console.log(`FINAL CERTIFICATION OK: ${report.assertions.length} assertions, numbers ${JSON.stringify(report.numbers)}, offline=${report.offline}`)
  await context.close()
} catch (error) {
  report.failure = error instanceof Error ? error.stack || error.message : String(error)
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
  throw error
} finally {
  report.serverLog = serverLog
  await browser.close()
  await stopServer()
}
