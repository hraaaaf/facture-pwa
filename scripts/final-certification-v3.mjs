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
  assertions: [], screenshots: [], pageErrors: [], consoleErrors: [], touchTargets: {}, numbers: {}, backup: {}, offline: false, securityHardening: {}
}
const ok = (name, detail = true) => report.assertions.push({ name, ok: true, detail })

async function configureCompany(page) {
  await page.getByText('Configure ton entreprise', { exact: true }).waitFor()
  for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('button', { name: 'Terminer la configuration', exact: true }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
  ok('Onboarding société')
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

async function finalizeCurrent(page, expected) {
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Finaliser', exact: true }).click()
  await page.locator('.editor-readonly').waitFor({ timeout: 8000 })
  const number = await page.locator('.editor-meta input').first().inputValue()
  assert.equal(number, expected)
  await page.getByText('Document verrouillé', { exact: false }).waitFor()
  return number
}

async function backHome(page) {
  await page.getByRole('button', { name: 'Retour', exact: true }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
}

async function history(page) {
  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Historique' }).click()
  await page.getByRole('heading', { name: 'Historique', exact: true }).waitFor()
}

async function openHistoryDocument(page, text) {
  await history(page)
  const card = page.locator('.premium-history-card').filter({ hasText: text }).first()
  await card.getByRole('button', { name: 'Ouvrir', exact: true }).click()
  await page.locator('.editor-screen').waitFor()
}

async function simpleFinalize(page, type, expected, options = {}) {
  await startDocument(page, type)
  await fillCurrent(page, { client: `Client ${type}`, object: `Objet ${type}`, designation: `Service ${type}`, ...options })
  const number = await finalizeCurrent(page, expected)
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

  await history(page)
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
let offlinePhase = false
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
  const page = await context.newPage()
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (offlinePhase && text.includes('ERR_INTERNET_DISCONNECTED')) return
    report.consoleErrors.push(text)
  })
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })
  await configureCompany(page)

  await startDocument(page, 'FACTURE')
  await fillCurrent(page, { client: 'Client Certification', object: 'Objet facture 1', designation: 'Service Certification', qty: 2, pu: 800 })
  await page.getByRole('button', { name: '+ Mémoriser', exact: true }).click()
  const clientDialog = page.getByRole('dialog', { name: 'Fiche client', exact: true })
  await clientDialog.getByRole('textbox', { name: 'Adresse', exact: true }).fill('Adresse certification préservée')
  await clientDialog.getByRole('textbox', { name: 'ICE', exact: true }).fill('001122334455667')
  await clientDialog.getByRole('textbox', { name: 'IF', exact: true }).fill('99887766')
  await clientDialog.getByRole('button', { name: 'Mémoriser le client', exact: true }).click()
  await clientDialog.waitFor({ state: 'hidden' })
  report.numbers.f1 = await finalizeCurrent(page, 'F-2026-001')
  ok('Facture F-2026-001')
  await backHome(page)

  await startDocument(page, 'FACTURE')
  await fillCurrent(page, { client: 'Client Certification', object: 'Objet facture 2', designation: 'Service Certification', pu: 100 })
  report.numbers.f2 = await finalizeCurrent(page, 'F-2026-002')
  ok('Facture F-2026-002')
  await backHome(page)

  await history(page)
  const card001 = page.locator('.premium-history-card').filter({ hasText: 'F-2026-001' })
  page.once('dialog', dialog => dialog.accept())
  await card001.getByRole('button', { name: 'Annuler', exact: true }).click()
  await card001.getByText('Annulé', { exact: true }).waitFor()
  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Accueil' }).click()
  report.numbers.f3 = await simpleFinalize(page, 'FACTURE', 'F-2026-003')
  report.numbers.devis = await simpleFinalize(page, 'DEVIS', 'DEV-2026-001')
  report.numbers.bl = await simpleFinalize(page, 'BL', 'BL-2026-001')
  report.numbers.bc = await simpleFinalize(page, 'BC', 'BC-2026-001')
  report.numbers.f2027 = await simpleFinalize(page, 'FACTURE', 'F-2027-001', { date: '2027-01-02' })
  ok('Séquences indépendantes, annulation sans réutilisation et reset annuel', report.numbers)

  await openHistoryDocument(page, 'F-2026-003')
  assert.equal(await page.locator('.editor-meta input').first().inputValue(), 'F-2026-003')
  ok('Finalisation + réouverture')
  await backHome(page)
  await history(page)
  const card003 = page.locator('.premium-history-card').filter({ hasText: 'F-2026-003' })
  await card003.getByRole('button', { name: 'Payé', exact: true }).click()
  await card003.getByText('Payé', { exact: true }).waitFor()
  ok('Lifecycle facture PAYÉ')
  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Accueil' }).click()

  const beforeDedupeState = await readDb(page)
  const beforeDedupe = beforeDedupeState.clients.length
  await startDocument(page, 'FACTURE')
  await page.getByPlaceholder('Nom du client ou organisme').fill('  Clïent   Certification  ')
  await page.getByRole('button', { name: '+ Mémoriser', exact: true }).click()
  const dedupeDialog = page.getByRole('dialog', { name: 'Fiche client', exact: true })
  await dedupeDialog.getByRole('button', { name: 'Mémoriser le client', exact: true }).click()
  await dedupeDialog.waitFor({ state: 'hidden' })
  const dedupeState = await readDb(page)
  assert.equal(dedupeState.clients.length, beforeDedupe)
  const canonicalClient = dedupeState.clients.find(client => client.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase() === 'client certification')
  assert(canonicalClient)
  assert.equal(canonicalClient.address, 'Adresse certification préservée')
  assert.equal(canonicalClient.ice, '001122334455667')
  assert.equal(canonicalClient.ifNumber, '99887766')
  report.securityHardening.clientDedupePreserved = true
  ok('Déduplication canonique sans effacement des données client')
  await backHome(page)

  const learnedState = await readDb(page)
  const learnedCatalog = learnedState.catalog.find(item => item.designation === 'Service Certification')
  assert(learnedCatalog && learnedCatalog.usageCount >= 2)
  assert.equal(learnedCatalog.lastUnitPriceHT, 100)
  assert.equal(learnedCatalog.vatRate, 20)
  ok('Catalogue fréquence + dernier PU/TVA/unité', { usageCount: learnedCatalog.usageCount, lastUnitPriceHT: learnedCatalog.lastUnitPriceHT })

  await startDocument(page, 'FACTURE')
  await fillCurrent(page, { client: 'Client Stale', object: 'Objet stale original', designation: 'Service Stale', date: '2028-01-02' })
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await sleep(900)
  await backHome(page)
  const stateWithStale = await readDb(page)
  const staleDoc = stateWithStale.documents.find(document => document.object === 'Objet stale original' && document.status === 'DRAFT')
  assert(staleDoc, 'Draft stale fixture missing')

  const page2 = await context.newPage()
  await page2.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })
  await page2.getByText('Tableau de bord', { exact: true }).waitFor()
  await openHistoryDocument(page2, 'Objet stale original')
  await openHistoryDocument(page, 'Objet stale original')
  report.numbers.staleFinal = await finalizeCurrent(page, 'F-2028-001')
  await page2.getByPlaceholder('Objet du document').fill('Objet stale écrasé')
  await page2.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await page2.locator('.toast').filter({ hasText: /finalisé|déjà/i }).waitFor({ timeout: 5000 })
  const staleStored = (await readDb(page)).documents.find(document => document.id === staleDoc.id)
  assert.equal(staleStored?.status, 'FINALIZED')
  assert.equal(staleStored?.number, 'F-2028-001')
  assert.equal(staleStored?.object, 'Objet stale original')
  ok('Stale draft ne peut pas écraser un finalisé')
  await page2.close()
  await backHome(page)

  await page.getByRole('button', { name: 'Réglages', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Réglages', exact: true })
  await settings.waitFor()
  const [download] = await Promise.all([page.waitForEvent('download'), settings.getByRole('button', { name: /Exporter/ }).click()])
  const backupPath = `${outDir}/backup-v2.json`
  await download.saveAs(backupPath)
  const backup = JSON.parse(await readFile(backupPath, 'utf8'))
  assert.equal(backup.version, 2)
  assert(backup.documents.length >= 9)
  assert(backup.clients.length >= 1)
  assert(backup.catalog.length >= 1)
  report.backup.v2 = { documents: backup.documents.length, clients: backup.clients.length, catalog: backup.catalog.length }
  ok('Backup v2 export runtime', report.backup.v2)

  const legacyDocuments = structuredClone(backup.documents)
  const legacyTarget = legacyDocuments.find(document => document.number)
  assert(legacyTarget)
  delete legacyTarget.status
  delete legacyTarget.finalizedAt
  delete legacyTarget.paidAt
  delete legacyTarget.cancelledAt
  const legacyId = legacyTarget.id
  const v1Path = `${outDir}/backup-v1.json`
  await writeFile(v1Path, JSON.stringify({ version: 1, exportedAt: backup.exportedAt, documents: legacyDocuments, company: backup.company }, null, 2))
  await clearStores(page)
  const restoreInput = settings.locator('input[type="file"][accept*="json"]')
  const successFeedback = page.getByText('Sauvegarde restaurée avec succès', { exact: true })
  page.once('dialog', dialog => dialog.accept())
  await restoreInput.setInputFiles(v1Path)
  await successFeedback.waitFor()
  let restored = await readDb(page)
  assert.equal(restored.documents.length, backup.documents.length)
  assert.equal(restored.clients.length, 0)
  assert.equal(restored.catalog.length, 0)
  assert.equal(restored.documents.find(document => document.id === legacyId)?.status, 'FINALIZED')
  ok('Restore v1 + migration legacy')
  await successFeedback.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

  page.once('dialog', dialog => dialog.accept())
  await restoreInput.setInputFiles(backupPath)
  await successFeedback.waitFor()
  restored = await readDb(page)
  assert.equal(restored.documents.length, backup.documents.length)
  assert(restored.clients.length >= 1)
  assert(restored.catalog.length >= 1)
  ok('Restore v2 runtime')
  await successFeedback.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

  const finalized = backup.documents.find(document => document.status !== 'DRAFT' && document.number)
  assert(finalized)
  const duplicateBackup = structuredClone(backup)
  duplicateBackup.documents.push({ ...structuredClone(finalized), id: `${finalized.id}-duplicate-cert` })
  const duplicatePath = `${outDir}/backup-duplicate-number.json`
  await writeFile(duplicatePath, JSON.stringify(duplicateBackup, null, 2))
  const beforeReject = await readDb(page)
  page.once('dialog', dialog => dialog.accept())
  await restoreInput.setInputFiles(duplicatePath)
  const duplicateFeedback = page.locator('.settings-feedback').filter({ hasText: /numéro final dupliqué/i })
  await duplicateFeedback.waitFor({ timeout: 5000 })
  const afterReject = await readDb(page)
  assert.equal(afterReject.documents.length, beforeReject.documents.length)
  report.securityHardening.duplicateFinalNumberRejected = true
  ok('Backup avec numéro final dupliqué rejeté sans écriture')
  await settings.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByText('Tableau de bord', { exact: true }).waitFor()
  }
  offlinePhase = true
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Tableau de bord', { exact: true }).waitFor({ timeout: 7000 })
  report.offline = true
  ok('Offline reload via service worker')
  await context.setOffline(false)
  offlinePhase = false

  for (const width of [390, 430, 768]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : width === 430 ? 932 : 1024 })
    await measureTouch(page, width)
  }
  ok('Cibles tactiles >=44 sur 390/430/768')

  assert.equal(report.pageErrors.length, 0, `Page errors: ${JSON.stringify(report.pageErrors)}`)
  assert.equal(report.consoleErrors.length, 0, `Console errors: ${JSON.stringify(report.consoleErrors)}`)
  report.serverLog = serverLog
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
  console.log(`FINAL CERTIFICATION OK: ${report.assertions.length} assertions; offline=${report.offline}; numbers=${JSON.stringify(report.numbers)}`)
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
