import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import process from 'node:process'
import { chromium } from 'playwright'

const port = 4174
const origin = `http://127.0.0.1:${port}`

const startServer = () => new Promise((resolve, reject) => {
  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  })
  let log = ''
  const timeout = setTimeout(() => {
    server.kill('SIGTERM')
    reject(new Error(`Vite indisponible.\n${log}`))
  }, 30_000)

  const onData = chunk => {
    const text = chunk.toString()
    log += text
    if (text.includes(`http://127.0.0.1:${port}`)) {
      clearTimeout(timeout)
      resolve({ server, log: () => log })
    }
  }
  server.stdout.on('data', onData)
  server.stderr.on('data', onData)
  server.on('exit', code => {
    if (code && code !== 0) {
      clearTimeout(timeout)
      reject(new Error(`Vite arrêté (${code}).\n${log}`))
    }
  })
})

let runtime
let browser
try {
  runtime = await startServer()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => consoleErrors.push(error.message))
  await page.goto(origin, { waitUntil: 'domcontentloaded' })

  const result = await page.evaluate(async () => {
    const [extractors, fixturesModule, quoteImport] = await Promise.all([
      import('/src/inputExtractors.ts'),
      import('/src/f2RuntimeFixtures.ts'),
      import('/src/quoteImport.ts')
    ])
    const fixtures = await fixturesModule.buildF2RuntimeFixtures()
    const output = {}
    for (const [key, file] of Object.entries(fixtures)) {
      const extracted = await extractors.extractInputFile(file)
      const raw = extractors.extractedInputToRawQuote(extracted)
      const canonical = quoteImport.normalizeQuotePayload(raw, { defaultUnit: 'Pièce' })
      output[key] = {
        kind: extracted.kind,
        text: extracted.text,
        tables: extracted.tables,
        warnings: extracted.warnings,
        raw,
        canonical: {
          status: canonical.status,
          client: canonical.client,
          quote: canonical.quote,
          lines: canonical.lines,
          issues: canonical.issues
        }
      }
    }
    return output
  })

  const expected = {
    excel: 'EXCEL',
    word: 'WORD',
    pdf: 'PDF',
    image: 'IMAGE',
    scannedPdf: 'PDF'
  }

  for (const [key, kind] of Object.entries(expected)) {
    const item = result[key]
    assert.equal(item.kind, kind, `${key}: kind`)
    assert.match(String(item.canonical.client.name ?? ''), /Atlas/i, `${key}: client`)
    assert.match(String(item.canonical.quote.object ?? ''), /Fourniture/i, `${key}: objet`)
    assert.equal(item.canonical.quote.currency, 'MAD', `${key}: devise`)
    assert.equal(item.canonical.status, 'READY', `${key}: canonical status ${JSON.stringify(item.canonical.issues)}`)
    assert.equal(item.canonical.lines.length, 2, `${key}: 2 lignes attendues`)
    assert.equal(item.canonical.lines[0].quantity, 10, `${key}: quantité ligne 1`)
    assert.equal(item.canonical.lines[0].unitPriceHT, 50, `${key}: PU ligne 1`)
    assert.equal(item.canonical.lines[0].vatRate, 20, `${key}: TVA ligne 1`)
    assert.equal(item.canonical.lines[1].quantity, 20, `${key}: quantité ligne 2`)
    assert.equal(item.canonical.lines[1].unitPriceHT, 25, `${key}: PU ligne 2`)
    assert.equal(item.canonical.lines[1].vatRate, 20, `${key}: TVA ligne 2`)
  }

  assert.ok(result.word.tables.length >= 1, 'Word: tableau structurel non extrait')
  assert.ok(result.pdf.tables.length >= 1, 'PDF texte: tableau non reconstruit')
  assert.ok(result.image.tables.length >= 1, 'Image OCR: tableau non reconstruit')
  assert.ok(result.scannedPdf.tables.length >= 1, 'PDF scanné OCR: tableau non reconstruit')
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
  if (runtime?.server) runtime.server.kill('SIGTERM')
}
