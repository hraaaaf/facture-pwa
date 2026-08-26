import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const outDir = 'artifacts/final-certification-v4'
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
  assertions: [], screenshots: [], pageErrors: [], consoleErrors: [], touchTargets: {}, backup: {}, offline: false
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

async function fillInvoice(page, { object, pu }) {
  await page.locator('.editor-meta input[type="date"]').fill('2026-08-26')
  await page.getByPlaceholder('Nom du client ou organisme').fill('Client Certification')
  await page.getByPlaceholder('Objet du document').fill(object)
  await page.getByPlaceholder('Prestation ou article').fill('Service Certification')
  await page.getByLabel('Qté', { exact: true }).fill('1')
  await page.getByLabel('PU HT', { exact: true }).fill(String(pu))
  await page.getByLabel('TVA %', { exact: true }).fill('20')
}

async function finalize(page, expected) {
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Finaliser', exact: true }).click()
  await page.locator('.editor-readonly').waitFor({ timeout: 8000 })
  assert.equal(await page.locator('.editor-meta input').first().inputValue(), expected)
  await page.getByText('Document verrouillé', { exact: false }).waitFor()
}

async function backHome(page) {
  await page.getByRole('button', { name: 'Retour', exact: true }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
}

async function history(page) {
  await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Historique' }).click()
  await page.getByRole('heading', { name: 'Historique', exact: true }).waitFor()
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
    const readOne = (storeName, key) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const request = tx.objectStore(storeName).get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const [documents, clients, catalog, counters, company] = await Promise.all([
      readAll('documents'), readAll('clients'), readAll('catalog'), readAll('counters'), readOne('settings', 'company')
    ])
    db.close()
    return { documents, clients, catalog, counters, company }
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

async function deleteDrafts(page) {
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('facture-pwa', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite')
      const store = tx.objectStore('documents')
      const request = store.getAll()
      request.onsuccess = () => {
        for (const document of request.result) if (document.status === 'DRAFT') store.delete(document.id)
      }
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
  await page.screenshot({ path: `${outDir}/${viewport}-new-document.png`, fullPage: false })
  report.screenshots.push(`${viewport}-new-document.png`)
  await sheet.getByRole('button', { name: 'Fermer', exact: true }).click()

  await history(page)
  const boxes = await page.locator('.history-card-actions button').evaluateAll(elements => elements.slice(0, 12).map(element => {
    const box = element.getBoundingClientRect()
    return { text: element.textContent?.trim(), width: box.width, height: box.height }
  }))
  assert(boxes.length > 0, `No history actions at ${viewport}`)
  assert(boxes.every(box => box.height >= 44), `History targets ${viewport}: ${JSON.stringify(boxes)}`)
  report.touchTargets[`${viewport}-history`] = boxes
  await page.screenshot({ path: `${outDir}/${viewport}-history.png`, fullPage: false })
  report.screenshots.push(`${viewport}-history.png`)
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

  await startInvoice(page)
  await fillInvoice(page, { object: 'Objet facture 1', pu: 800 })
  await page.getByRole('button', { name: '+ Mémoriser', exact: true }).click()
  const clientDialog = page.getByRole('dialog', { name: 'Fiche client', exact: true })
  await clientDialog.getByRole('textbox', { name: 'Adresse', exact: true }).fill('Adresse certification préservée')
  await clientDialog.getByRole('textbox', { name: 'ICE', exact: true }).fill('001122334455667')
  await clientDialog.getByRole('textbox', { name: 'IF', exact: true }).fill('99887766')
  await clientDialog.getByRole('button', { name: 'Mémoriser le client', exact: true }).click()
  await clientDialog.waitFor({ state: 'hidden' })
  await finalize(page, 'F-2026-001')
  await backHome(page)

  await startInvoice(page)
  await fillInvoice(page, { object: 'Objet facture 2', pu: 100 })
  await finalize(page, 'F-2026-002')
  await backHome(page)
  ok('Deux factures finalisées avec séquence déterministe')

  const beforeDedupe = await readDb(page)
  const canonicalCountBefore = beforeDedupe.clients.filter(client =>
    (client.name || client.company || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase() === 'client certification'
  ).length
  assert.equal(canonicalCountBefore, 1)

  await startInvoice(page)
  await page.getByPlaceholder('Nom du client ou organisme').fill('  Clïent   Certification  ')
  await page.getByRole('button', { name: '+ Mémoriser', exact: true }).click()
  const dedupeDialog = page.getByRole('dialog', { name: 'Fiche client', exact: true })
  await dedupeDialog.getByRole('button', { name: 'Mémoriser le client', exact: true }).click()
  await dedupeDialog.waitFor({ state: 'hidden' })
  const dedupeState = await readDb(page)
  const canonicalClients = dedupeState.clients.filter(client =>
    (client.name || client.company || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase() === 'client certification'
  )
  assert.equal(canonicalClients.length, 1)
  assert.equal(canonicalClients[0].address, 'Adresse certification préservée')
  assert.equal(canonicalClients[0].ice, '001122334455667')
  assert.equal(canonicalClients[0].ifNumber, '99887766')
  ok('Déduplication canonique préserve les données client')
  await backHome(page)
  await deleteDrafts(page)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByText('Tableau de bord', { exact: true }).waitFor()

  const learned = await readDb(page)
  const catalogItem = learned.catalog.find(item => item.designation === 'Service Certification')
  assert(catalogItem)
  assert.equal(catalogItem.usageCount, 2)
  assert.equal(catalogItem.lastUnitPriceHT, 100)
  assert.equal(catalogItem.vatRate, 20)
  ok('Catalogue mémorise fréquence et dernier PU/TVA', { usageCount: 2, lastUnitPriceHT: 100, vatRate: 20 })

  await page.getByRole('button', { name: 'Réglages', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Réglages', exact: true })
  await settings.waitFor()
  await settings.getByLabel('Préfixe Devis', { exact: true }).fill('F')
  await settings.getByRole('button', { name: 'Enregistrer les réglages', exact: true }).click()
  await page.locator('.settings-feedback').filter({ hasText: /préfixe distinct/i }).waitFor()
  const afterRejectedPrefix = await readDb(page)
  assert.notEqual(afterRejectedPrefix.company.numberingPrefixes.DEVIS, 'F')
  await settings.getByLabel('Préfixe Devis', { exact: true }).fill('DEV')
  await settings.getByRole('button', { name: 'Enregistrer les réglages', exact: true }).click()
  await page.getByText('Réglages enregistrés', { exact: true }).waitFor()
  ok('Préfixes dupliqués refusés sans écriture')
  await page.getByText('Réglages enregistrés', { exact: true }).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    settings.getByRole('button', { name: /Exporter/ }).click()
  ])
  const backupPath = `${outDir}/backup-v2.json`
  await download.saveAs(backupPath)
  const backup = JSON.parse(await readFile(backupPath, 'utf8'))
  assert.equal(backup.version, 2)
  const expectedNumbers = ['F-2026-001', 'F-2026-002']
  const backupNumbers = backup.documents.map(document => document.number).filter(Boolean).sort()
  assert.deepEqual(backupNumbers, expectedNumbers)
  assert.equal(new Set(backupNumbers).size, expectedNumbers.length)
  const backupClient = backup.clients.find(client => (client.name || client.company) === 'Client Certification')
  const backupCatalog = backup.catalog.find(item => item.designation === 'Service Certification')
  assert(backupClient)
  assert.equal(backupClient.address, 'Adresse certification préservée')
  assert(backupCatalog)
  assert.equal(backupCatalog.usageCount, 2)
  assert.equal(backupCatalog.lastUnitPriceHT, 100)
  report.backup.v2 = { documents: backup.documents.length, clients: backup.clients.length, catalog: backup.catalog.length, numbers: backupNumbers }
  ok('Backup v2 exact et cohérent', report.backup.v2)

  const legacyDocuments = structuredClone(backup.documents)
  const legacyTarget = legacyDocuments.find(document => document.number === 'F-2026-001')
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
  assert.deepEqual(restored.documents.map(document => document.number).filter(Boolean).sort(), expectedNumbers)
  assert.equal(restored.clients.length, 0)
  assert.equal(restored.catalog.length, 0)
  assert.equal(restored.documents.find(document => document.id === legacyId)?.status, 'FINALIZED')
  ok('Restore v1 + migration legacy')
  await successFeedback.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

  page.once('dialog', dialog => dialog.accept())
  await restoreInput.setInputFiles(backupPath)
  await successFeedback.waitFor()
  restored = await readDb(page)
  assert.deepEqual(restored.documents.map(document => document.number).filter(Boolean).sort(), expectedNumbers)
  assert.equal(restored.clients.length, backup.clients.length)
  assert.equal(restored.catalog.length, backup.catalog.length)
  const restoredClient = restored.clients.find(client => (client.name || client.company) === 'Client Certification')
  const restoredCatalog = restored.catalog.find(item => item.designation === 'Service Certification')
  assert.equal(restoredClient?.address, 'Adresse certification préservée')
  assert.equal(restoredCatalog?.lastUnitPriceHT, 100)
  ok('Restore v2 conserve documents, clients et catalogue')
  await successFeedback.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

  const duplicateBackup = structuredClone(backup)
  duplicateBackup.documents.push({ ...structuredClone(backup.documents[0]), id: `${backup.documents[0].id}-duplicate-cert` })
  const duplicatePath = `${outDir}/backup-duplicate-number.json`
  await writeFile(duplicatePath, JSON.stringify(duplicateBackup, null, 2))
  const beforeReject = await readDb(page)
  page.once('dialog', dialog => dialog.accept())
  await restoreInput.setInputFiles(duplicatePath)
  await page.locator('.settings-feedback').filter({ hasText: /numéro final dupliqué/i }).waitFor({ timeout: 5000 })
  const afterReject = await readDb(page)
  const snapshot = state => state.documents.map(document => ({ id: document.id, number: document.number, status: document.status })).sort((a, b) => a.id.localeCompare(b.id))
  assert.deepEqual(snapshot(afterReject), snapshot(beforeReject))
  ok('Backup avec numéro final dupliqué rejeté sans mutation')
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
  ok('Reload offline via service worker')
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
  console.log(`FINAL TARGETED CERTIFICATION OK: ${report.assertions.length} assertions; offline=${report.offline}`)
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
