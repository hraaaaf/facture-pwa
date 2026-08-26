import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const outDir = 'artifacts/mobile-audit'
await mkdir(outDir, { recursive: true })

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], { stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', chunk => { serverLog += chunk.toString() })
server.stderr.on('data', chunk => { serverLog += chunk.toString() })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

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

await waitServer()
const browser = await chromium.launch({ headless: true })
const report = { generatedAt: new Date().toISOString(), screens: [], pageErrors: [], consoleErrors: [], autosaveRecovered: {}, serverLog }

async function capture(page, viewport, stage) {
  await page.waitForTimeout(120)
  const metrics = await page.evaluate(() => {
    const root = document.documentElement
    const visible = element => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
    }
    const smallControls = [...document.querySelectorAll('button,input,textarea,select,a[href]')]
      .filter(visible)
      .map(element => {
        const box = element.getBoundingClientRect()
        return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', label: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 80), width: Math.round(box.width), height: Math.round(box.height) }
      })
      .filter(item => item.width < 44 || item.height < 44)
      .slice(0, 80)
    return { viewportWidth: window.innerWidth, scrollWidth: root.scrollWidth, overflowX: root.scrollWidth > window.innerWidth + 1, smallControls }
  })
  report.screens.push({ viewport, stage, ...metrics })
  await page.screenshot({ path: `${outDir}/${viewport.width}-${stage}.png`, fullPage: false, animations: 'disabled' })
}

async function configureCompany(page) {
  await page.getByText('Configure ton entreprise', { exact: true }).waitFor()
  await page.getByLabel(/Nom \/ raison sociale/).fill('Benmoussa Rachid')
  await page.getByLabel(/Nom commercial/).fill('TAPISTOR SABRE')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel(/Adresse/).fill('484, Cit Amal 5, 040 163, MASSIRA, CYM, RABAT')
  await page.getByLabel('Ville').fill('RABAT')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel('ICE').fill('001806241000086')
  await page.getByLabel('IF').fill('35789182')
  await page.getByLabel('RC').fill('82972 RABAT')
  await page.getByLabel('Patente').fill('26450045')
  await page.getByLabel('CNSS').fill('7121982')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel('RIB').fill('181 810 21211 52654410108 03')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: 'Original' }).click()
  await page.getByRole('button', { name: 'Terminer la configuration' }).click()
  await page.getByText('Tableau de bord', { exact: true }).waitFor()
}

const viewports = [{ width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }]

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    page.on('pageerror', error => report.pageErrors.push({ viewport, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ viewport, message: message.text() }) })
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })
    await page.getByText('Configure ton entreprise', { exact: true }).waitFor()
    await capture(page, viewport, 'e0-onboarding')
    await configureCompany(page)
    await capture(page, viewport, 'e1-dashboard')
    await page.getByLabel('Nouveau document').click()
    await page.getByRole('dialog', { name: 'Nouveau document' }).waitFor()
    await capture(page, viewport, 'e2-new-document')
    await page.getByRole('dialog', { name: 'Nouveau document' }).getByRole('button', { name: /Facture/ }).click()
    await page.getByRole('heading', { name: 'Facture', exact: true }).waitFor()
    await page.getByPlaceholder('Nom du client ou organisme').fill('SECRÉTARIAT D’ETAT CHARGÉ DE L’ARTISANAT ET DE L’ECONOMIE SOCIALE ET SOLIDAIRE')
    await page.getByPlaceholder('Objet du document').fill('Enretien de batiment administratif: Capitonnage de porte en similicuir au niveau du secrétariat general')
    await page.getByPlaceholder('Prestation ou article').fill('Capitonnage de porte en similicuir 70cm/200cm')
    await page.getByLabel('Qté').fill('10')
    await page.getByLabel('PU HT').fill('800')
    await page.getByLabel('TVA %').fill('20')
    await page.waitForTimeout(1100)
    await capture(page, viewport, 'e3-editor')
    await page.getByRole('button', { name: /Aperçu PDF/ }).click()
    await page.getByRole('dialog', { name: 'Aperçu PDF' }).waitFor()
    await capture(page, viewport, 'e4-preview')
    await page.getByRole('dialog', { name: 'Aperçu PDF' }).getByRole('button', { name: 'Retour' }).click()
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByText('Tableau de bord', { exact: true }).waitFor()
    const recovered = await page.getByText('SECRÉTARIAT D’ETAT CHARGÉ DE L’ARTISANAT ET DE L’ECONOMIE SOCIALE ET SOLIDAIRE', { exact: true }).count() > 0
    report.autosaveRecovered[String(viewport.width)] = recovered
    await capture(page, viewport, 'e1-dashboard-recovered')
    await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Historique' }).click()
    await page.getByRole('heading', { name: 'Historique' }).waitFor()
    await capture(page, viewport, 'e5-history')
    await page.locator('.bottom-nav .nav-item').filter({ hasText: 'Accueil' }).click()
    await page.getByRole('button', { name: 'Réglages' }).click()
    await page.getByRole('dialog', { name: 'Réglages' }).waitFor()
    await capture(page, viewport, 'e6-settings')
    await context.close()
  }
} finally {
  await browser.close()
  server.kill('SIGTERM')
}

await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
const overflows = report.screens.filter(screen => screen.overflowX)
const autosaveFailures = Object.entries(report.autosaveRecovered).filter(([, ok]) => !ok)
if (report.pageErrors.length || report.consoleErrors.length || overflows.length || autosaveFailures.length) {
  console.error(JSON.stringify({ pageErrors: report.pageErrors, consoleErrors: report.consoleErrors, overflows, autosaveFailures }, null, 2))
  process.exit(1)
}
console.log(`Mobile audit OK: ${report.screens.length} captures, no overflow, autosave recovered on 390/430/768.`)
