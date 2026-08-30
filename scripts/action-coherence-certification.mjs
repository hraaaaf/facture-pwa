import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const [baselineRoot, featureRoot] = process.argv.slice(2)
if (!baselineRoot || !featureRoot) throw new Error('Usage: node script baselineRoot featureRoot')

const artifactDir = resolve('artifacts/action-coherence')
mkdirSync(artifactDir, { recursive: true })
const widths = [390, 430, 768, 1280]
const assertions = []
const failures = []
const report = { assertions, widths: {}, failure: null }
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
}

function serve(root) {
  const dist = resolve(root, 'dist')
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname
    let file = join(dist, pathname === '/' ? 'index.html' : pathname)
    if (!existsSync(file)) file = join(dist, 'index.html')
    try {
      res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' })
      res.end(readFileSync(file))
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  })
  return new Promise(resolveListen => server.listen(0, '127.0.0.1', () => resolveListen({ server, url: `http://127.0.0.1:${server.address().port}` })))
}

function check(name, ok, detail = '') {
  assertions.push({ name, ok, detail })
  if (!ok) failures.push(`${name}: ${detail}`)
}

async function seed(page, url) {
  await page.goto(url)
  await page.evaluate(async () => {
    const req = indexedDB.open('facture-pwa', 3)
    const db = await new Promise((resolveDb, reject) => {
      req.onsuccess = () => resolveDb(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction(['settings', 'documents', 'clients', 'catalog'], 'readwrite')
    tx.objectStore('settings').put({
      name: 'TAPISTOR', brand: 'TAPISTOR', address: 'Rabat', cityLabel: 'Rabat', phone: '', fax: '', email: '',
      ice: '001', ifNumber: '001', rc: '', patente: '', cnss: '', bankName: '', rib: '', legalLine: '',
      defaultVatRate: 20, logoDataUrl: '', managerSignatureDataUrl: '', pdfTemplate: 'premium', onboardingCompleted: true,
      numberingPrefixes: { DEVIS: 'DEV', FACTURE: 'F', BL: 'BL', BC: 'BC' },
      numberingBaseline: { year: 2026, lastUsed: { DEVIS: 0, FACTURE: 0, BL: 0, BC: 0 } }
    }, 'company')
    for (const name of ['documents', 'clients', 'catalog']) tx.objectStore(name).clear()
    await new Promise((resolveTx, reject) => {
      tx.oncomplete = resolveTx
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  })
  await page.reload()
  await page.waitForTimeout(180)
}

async function openEditor(page) {
  await page.getByRole('button', { name: 'Nouveau document' }).click()
  await page.locator('.new-option').first().click()
  await page.getByRole('heading', { name: 'Devis' }).waitFor({ state: 'visible' })
  await page.waitForTimeout(80)
}

async function snapshot(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const more = document.querySelector('.editor-more')
    const title = document.querySelector('.editor-title')
    const titleRect = title?.getBoundingClientRect()
    const moreStyle = more ? getComputedStyle(more) : null
    return {
      innerWidth,
      scrollWidth: root.scrollWidth,
      moreVisible: Boolean(more && moreStyle && moreStyle.display !== 'none' && moreStyle.visibility !== 'hidden' && more.getBoundingClientRect().width > 0),
      moreTabIndex: more instanceof HTMLElement ? more.tabIndex : null,
      titleCenter: titleRect ? titleRect.left + titleRect.width / 2 : null,
      viewportCenter: innerWidth / 2,
      actionText: Array.from(document.querySelectorAll('.editor-bottom-bar button')).map(node => node.textContent?.trim() || '')
    }
  })
}

const baseline = await serve(baselineRoot)
const feature = await serve(featureRoot)
const browser = await chromium.launch({ headless: true })

try {
  for (const width of widths) {
    const row = report.widths[width] = {}
    for (const phase of ['before', 'after']) {
      const page = await browser.newPage({ viewport: { width, height: width <= 430 ? 844 : 900 } })
      const pageErrors = []
      const consoleErrors = []
      page.on('pageerror', error => pageErrors.push(String(error)))
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
      await seed(page, phase === 'before' ? baseline.url : feature.url)
      await openEditor(page)
      await page.screenshot({ path: join(artifactDir, `${phase}-${width}.png`), fullPage: true })
      row[phase] = { ...(await snapshot(page)), pageErrors, consoleErrors }
      await page.close()
    }
  }

  const before390 = report.widths[390].before
  const after390 = report.widths[390].after
  check('baseline_dead_control_visible', before390.moreVisible === true, 'current main must expose the dead More options control')
  check('dead_control_removed', after390.moreVisible === false, 'More options must not be visible after Step 7')
  check('document_actions_preserved', ['Aperçu PDF', 'Enregistrer', 'Finaliser'].every(label => after390.actionText.includes(label)), JSON.stringify(after390.actionText))

  const centered = widths.every(width => {
    const after = report.widths[width].after
    return typeof after.titleCenter === 'number' && Math.abs(after.titleCenter - after.viewportCenter) <= 2
  })
  check('editor_title_centered', centered, JSON.stringify(Object.fromEntries(widths.map(width => [width, { title: report.widths[width].after.titleCenter, viewport: report.widths[width].after.viewportCenter }])))

  const settingsPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const settingsErrors = []
  const settingsConsoleErrors = []
  settingsPage.on('pageerror', error => settingsErrors.push(String(error)))
  settingsPage.on('console', message => { if (message.type() === 'error') settingsConsoleErrors.push(message.text()) })
  await seed(settingsPage, feature.url)
  await settingsPage.getByRole('button', { name: 'Réglages' }).click()
  const settingsVisible = await settingsPage.getByRole('heading', { name: 'Réglages' }).isVisible()
  check('settings_action_functional', settingsVisible, 'dashboard settings button must open SettingsScreen')
  await settingsPage.screenshot({ path: join(artifactDir, 'after-settings-390.png'), fullPage: true })
  check('settings_clean', settingsErrors.length === 0 && settingsConsoleErrors.length === 0, JSON.stringify({ settingsErrors, settingsConsoleErrors }))
  await settingsPage.close()

  const responsiveClean = widths.every(width => ['before', 'after'].every(phase => {
    const state = report.widths[width][phase]
    return state.scrollWidth === state.innerWidth && state.pageErrors.length === 0 && state.consoleErrors.length === 0
  }))
  check('responsive_clean', responsiveClean, '390/430/768/1280 exact width and zero browser errors')
} catch (error) {
  report.failure = error instanceof Error ? error.stack : String(error)
  failures.push(report.failure)
} finally {
  await browser.close()
  baseline.server.closeAllConnections?.()
  feature.server.closeAllConnections?.()
  await Promise.all([
    new Promise(resolveClose => baseline.server.close(resolveClose)),
    new Promise(resolveClose => feature.server.close(resolveClose))
  ])
}

writeFileSync(join(artifactDir, 'report.json'), JSON.stringify(report, null, 2))
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`ACTION COHERENCE CERTIFIED: ${assertions.length}/${assertions.length} assertions`)
