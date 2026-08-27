import { extractInputFile, extractedInputToRawQuote } from './inputExtractors'
import { buildF2RuntimeFixtures } from './f2RuntimeFixtures'
import { normalizeQuotePayload } from './quoteImport'

export type F2HarnessResult = Record<string, {
  kind: string
  text: string
  tables: Array<Array<Array<string | number | null>>>
  warnings: string[]
  raw: ReturnType<typeof extractedInputToRawQuote>
  canonical: ReturnType<typeof normalizeQuotePayload>
}>

declare global {
  interface Window {
    f2HarnessReady?: boolean
    runF2RuntimeCertification?: () => Promise<F2HarnessResult>
  }
}

window.runF2RuntimeCertification = async () => {
  const fixtures = await buildF2RuntimeFixtures()
  const output: F2HarnessResult = {}
  for (const [key, file] of Object.entries(fixtures)) {
    const extracted = await extractInputFile(file)
    const raw = extractedInputToRawQuote(extracted)
    output[key] = {
      kind: extracted.kind,
      text: extracted.text,
      tables: extracted.tables,
      warnings: extracted.warnings,
      raw,
      canonical: normalizeQuotePayload(raw, { defaultUnit: 'Pièce' })
    }
  }
  return output
}

window.f2HarnessReady = true
