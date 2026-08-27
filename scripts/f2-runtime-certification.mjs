import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import process from 'node:process'
import { chromium } from 'playwright'

const port = 4174
const origin = `http://127.0.0.1:${port}`
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env },
  detached: process.platform !== 'win32'
})
let serverLog = ''
server.stdout.on('data', chunk => { serverLog += chunk.toString() })
server.stderr.on('data', chunk => { serverLog += chunk.toString() })

const waitForServer = async () => {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/f2-runtime.html`)
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Vite indisponible.\n${serverLog}`)
}

const stopServer = () => {
  if (!server.pid) return
  try {
    if (process.platform === 'win32') server.kill('SIGTERM')
    else process.kill(-server.pid, 'SIGTERM')
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error
  }
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => consoleErrors.push(error.message))
  await page.goto(`${origin}/f2-runtime.html`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.f2HarnessReady === true)

  const result = await page.evaluate(async () => {
    if (!window.runF2RuntimeCertification) throw new Error('Harness F2 indisponible.')
    return window.runF2RuntimeCertification()
  })

  const expected = { excel: 'EXCEL', word: 'WORD', pdf: 'PDF', image: 'IMAGE', scannedPdf: 'PDF' }
  for (const [key, kind] of Object.entries(expected)) {
    const item = result[key]
    assert.equal(item.kind, kind, `${key}: kind`)
    assert.match(String(item.canonical.client.name ?? ''), /Atlas/i, `${key}: client`)
    assert.match(String(item.canonical.quote.object ?? ''), /Fourniture/i, `${key}: objet`)
    assert.equal(item.canonical.quote.currency, 'MAD', `${key}: devise`)
    assert.equal(item.canonical.status, 'READY', `${key}: ${JSON.stringify(item.canonical.issues)}`)
    assert.equal(item.canonical.lines.length, 2, `${key}: 2 lignes attendues`)
    assert.equal(item.canonical.lines[0].quantity, 10, `${key}: qte ligne 1`)
    assert.equal(item.canonical.lines[0].unitPriceHT, 50, `${key}: PU ligne 1`)
    assert.equal(item.canonical.lines[0].vatRate, 20, `${key}: TVA ligne 1`)
    assert.equal(item.canonical.lines[1].quantity, 20, `${key}: qte ligne 2`)
    assert.equal(item.canonical.lines[1].unitPriceHT, 25, `${key}: PU ligne 2`)
    assert.equal(item.canonical.lines[1].vatRate, 20, `${key}: TVA ligne 2`)
  }

  assert.ok(result.word.tables.length >= 1, 'Word: tableau structurel absent')
  assert.ok(result.pdf.tables.length >= 1, 'PDF texte: tableau absent')
  assert.ok(result.image.tables.length >= 1, 'Image OCR: tableau absent')
  assert.ok(result.scannedPdf.tables.length >= 1, 'PDF scanné OCR: tableau absent')
  assert.ok(result.scannedPdf.warnings.some(warning => /OCR utilisé/i.test(warning)), 'PDF scanné: warning OCR absent')
  assert.equal(consoleErrors.length, 0, `Erreurs navigateur: ${consoleErrors.join(' | ')}`)

  console.log(JSON.stringify({
    ok: true,
    certified: Object.keys(expected),
    canonicalReady: Object.fromEntries(Object.keys(expected).map(key => [key, result[key].canonical.status])),
    lineCounts: Object.fromEntries(Object.keys(expected).map(key => [key, result[key].canonical.lines.length])),
    scannedPdfWarnings: result.scannedPdf.warnings,
    consoleErrors
  }, null, 2))
} finally {
  if (browser) await browser.close()
  stopServer()
}
