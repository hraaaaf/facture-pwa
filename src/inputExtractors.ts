import type { QuoteInputKind, RawQuotePayload } from './quoteImport'
import { extractDocumentDate, extractMultilineClientName } from './importMetadata'
import { pdfItemsToCandidateTables } from './pdfLayout'
import { importDebug } from './importDebug'

export interface ExtractedInput {
  kind: QuoteInputKind
  name: string
  mimeType: string
  text: string
  tables: Array<Array<Array<string | number | null>>>
  warnings: string[]
}

const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif'])

export const detectInputKind = (file: Pick<File, 'name' | 'type'>): QuoteInputKind => {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'PDF'
  if (file.type.includes('spreadsheet') || file.type.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'EXCEL'
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) return 'WORD'
  if (imageTypes.has(file.type) || /\.(png|jpe?g|webp|bmp|gif)$/i.test(name)) return 'IMAGE'
  if (file.type.startsWith('text/') || name.endsWith('.txt')) return 'TEXT'
  return 'UNKNOWN'
}

const cleanText = (value: string) => value
  .replace(/\r\n?/g, '\n')
  .replace(/[ \u00a0\u202f]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const splitTableLine = (line: string): Array<string | number | null> => {
  const trimmed = line.trim()
  if (!trimmed) return []
  const delimiter = trimmed.includes('\t')
    ? /\t+/
    : trimmed.includes('|')
      ? /\s*\|\s*/
      : trimmed.includes(';')
        ? /\s*;\s*/
        : /\s{2,}/
  const cells = trimmed.split(delimiter).map(value => value.trim()).filter(Boolean)
  if (cells.length >= 2) return cells

  const header = trimmed.toLowerCase()
  const hasDesignation = /\b(article|designation|désignation|libelle|libellé|description)\b/.test(header)
  const hasQuantity = /\b(qte|qté|qty|quantité|quantite)\b/.test(header)
  const hasPrice = /\b(p\.?u\.?|prix)\b/.test(header)
  const hasVat = /\btva\b/.test(header)
  if (hasDesignation && hasQuantity && hasPrice && hasVat) return ['Article', 'Qte', 'P.U', 'TVA']

  const looseRow = trimmed.match(/^(.*?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?%?)$/)
  return looseRow ? [looseRow[1].trim(), looseRow[2], looseRow[3], looseRow[4]] : []
}

export const textToCandidateTables = (text: string): ExtractedInput['tables'] => {
  const tables: ExtractedInput['tables'] = []
  let current: Array<Array<string | number | null>> = []

  const flush = () => {
    if (current.length >= 2) tables.push(current)
    current = []
  }

  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const cells = splitTableLine(line)
    if (cells.length >= 2) {
      if (current.length && Math.abs(current[0].length - cells.length) > 1) flush()
      current.push(cells)
    } else if (current.length) {
      flush()
    }
  }
  flush()
  return tables
}

export const matrixToObjects = (matrix: Array<Array<unknown>>): Array<Record<string, unknown>> => {
  if (matrix.length < 2) return []
  const headers = matrix[0].map((value, index) => String(value ?? '').trim() || `col_${index + 1}`)
  return matrix.slice(1)
    .filter(row => row.some(value => String(value ?? '').trim()))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])))
}

const scoreHeader = (row: Array<unknown>) => {
  const joined = row.map(value => String(value ?? '').toLowerCase()).join(' ')
  const needles = ['designation', 'désignation', 'article', 'libellé', 'description', 'qte', 'qté', 'quantité', 'qty', 'pu', 'p.u', 'prix', 'tva']
  return needles.reduce((score, needle) => score + (joined.includes(needle) ? 1 : 0), 0)
}

export const pickBestQuoteTable = (tables: ExtractedInput['tables']): Array<Record<string, unknown>> => {
  let best: Array<Array<string | number | null>> | null = null
  let bestScore = -1
  for (const table of tables) {
    if (table.length < 2) continue
    const score = scoreHeader(table[0]) * 100 + table.length
    if (score > bestScore) {
      best = table
      bestScore = score
    }
  }
  return best && scoreHeader(best[0]) > 0 ? matrixToObjects(best) : []
}

const tableDebugSummary = (tables: ExtractedInput['tables']) => tables.slice(0, 10).map(table => ({
  rows: Math.max(0, table.length - 1),
  columns: table[0]?.length ?? 0,
  headers: (table[0] ?? []).slice(0, 8).map(value => String(value ?? '').slice(0, 80))
}))

const extractLabel = (text: string, labels: string[]) => {
  for (const label of labels) {
    const match = text.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*([^\\n]+)`, 'i'))
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

export const extractedInputToRawQuote = (input: ExtractedInput): RawQuotePayload => {
  const inferredTables = textToCandidateTables(input.text)
  const clientName = extractMultilineClientName(input.text) ?? extractLabel(input.text, ['client', 'raison sociale', 'customer'])
  const objectValue = extractLabel(input.text, ['objet', 'object'])
  const dateValue = extractDocumentDate(input.text) ?? extractLabel(input.text, ['date'])
  const lines = pickBestQuoteTable([...input.tables, ...inferredTables])

  importDebug('quote.raw', {
    kind: input.kind,
    textLength: input.text.length,
    inputTableCount: input.tables.length,
    inferredTableCount: inferredTables.length,
    inputTables: tableDebugSummary(input.tables),
    inferredTables: tableDebugSummary(inferredTables),
    lineCount: lines.length,
    clientDetected: Boolean(clientName),
    objectDetected: Boolean(objectValue),
    dateDetected: Boolean(dateValue)
  })

  return {
    source: { kind: input.kind, name: input.name },
    client: {
      name: clientName,
      address: extractLabel(input.text, ['adresse', 'address']),
      ice: extractLabel(input.text, ['ice']),
      ifNumber: extractLabel(input.text, ['if', 'identifiant fiscal'])
    },
    object: objectValue,
    date: dateValue,
    currency: extractLabel(input.text, ['devise', 'currency']) ?? (/(?:\bMAD\b|\bDHS?\b|dirhams?)/i.test(input.text) ? 'MAD' : undefined),
    lines
  }
}

const extractTextFile = async (file: File): Promise<ExtractedInput> => ({
  kind: 'TEXT', name: file.name, mimeType: file.type, text: cleanText(await file.text()), tables: [], warnings: []
})

const extractExcel = async (file: File): Promise<ExtractedInput> => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  const tables = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    return XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, raw: false, defval: null })
  }).filter(table => table.length > 0)
  const text = tables.flat().map(row => row.filter(value => value != null).join(' | ')).join('\n')
  return { kind: 'EXCEL', name: file.name, mimeType: file.type, text: cleanText(text), tables, warnings: [] }
}

const tableElementToMatrix = (table: HTMLTableElement): Array<Array<string | number | null>> =>
  Array.from(table.rows).map(row =>
    Array.from(row.cells).map(cell => cleanText(cell.textContent ?? ''))
  ).filter(row => row.some(Boolean))

const extractWord = async (file: File): Promise<ExtractedInput> => {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const [raw, html] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer })
  ])
  const documentHtml = new DOMParser().parseFromString(html.value, 'text/html')
  const tables = Array.from(documentHtml.querySelectorAll('table'))
    .map(table => tableElementToMatrix(table))
    .filter(table => table.length > 0)
  return {
    kind: 'WORD',
    name: file.name,
    mimeType: file.type,
    text: cleanText(raw.value),
    tables,
    warnings: [...raw.messages, ...html.messages].map(message => message.message)
  }
}

type PdfTextItemLike = {
  str: string
  transform: number[]
  width?: number
}

type PdfTextChunkLike = {
  items?: Array<unknown>
}

type PdfTextReaderLike = {
  read: () => Promise<{ done: boolean; value?: PdfTextChunkLike }>
  releaseLock?: () => void
}

type PdfTextStreamLike = {
  getReader: () => PdfTextReaderLike
}

const isPdfTextItem = (item: unknown): item is PdfTextItemLike => {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Partial<PdfTextItemLike>
  return typeof candidate.str === 'string'
    && Array.isArray(candidate.transform)
    && candidate.transform.length >= 6
}

const pdfItemDebugSummary = (items: Array<unknown>) => {
  const textItems = items.filter(isPdfTextItem)
  const strings = textItems.map(item => item.str.trim()).filter(Boolean)
  const joined = strings.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return {
    itemCount: items.length,
    textItemCount: textItems.length,
    nonEmptyTextItemCount: strings.length,
    numericItemCount: strings.filter(value => /^[-+]?\d+(?:[.,]\d+)?$/.test(value.replace(/[\s\u00a0\u202f]/g, ''))).length,
    headerSignals: {
      designation: /\b(designation|article|description|libelle)\b/.test(joined),
      quantity: /\b(quantite|qte|qty)\b/.test(joined),
      price: /\b(prix|p\.?u\.?)\b/.test(joined),
      total: /\btotal\b/.test(joined),
      vat: /\b(tva|vat)\b/.test(joined)
    }
  }
}

export const readPdfTextItems = async (stream: PdfTextStreamLike): Promise<Array<unknown>> => {
  const reader = stream.getReader()
  const items: Array<unknown> = []
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value?.items) items.push(...value.items)
    }
  } finally {
    reader.releaseLock?.()
  }
  return items
}

export const pdfItemsToText = (items: Array<unknown>): string => {
  const positioned = items.filter(isPdfTextItem).map(item => ({
    text: item.str.trim(),
    x: item.transform[4],
    y: item.transform[5]
  })).filter(item => item.text)

  positioned.sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x)
  const lines: Array<Array<{ text: string; x: number; y: number }>> = []
  for (const item of positioned) {
    const line = lines.find(existing => Math.abs(existing[0].y - item.y) <= 2)
    if (line) line.push(item)
    else lines.push([item])
  }

  return lines
    .map(line => line.sort((a, b) => a.x - b.x).map(item => item.text).join('\t'))
    .join('\n')
}

const ocrImages = async (images: Array<Blob | HTMLCanvasElement>) => {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['fra', 'eng'])
  try {
    const pages: string[] = []
    for (const image of images) {
      const result = await worker.recognize(image)
      pages.push(result.data.text)
    }
    return cleanText(pages.join('\n'))
  } finally {
    await worker.terminate()
  }
}

const extractPdf = async (file: File): Promise<ExtractedInput> => {
  importDebug('pdf.start', { fileSize: file.size, mimeType: file.type })
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  importDebug('pdf.loaded', { numPages: pdf.numPages })
  const textPages: string[] = []
  const pdfTables: ExtractedInput['tables'] = []
  const pagesForOcr: HTMLCanvasElement[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const items = await readPdfTextItems(page.streamTextContent() as unknown as PdfTextStreamLike)
    const pageTables = pdfItemsToCandidateTables(items)
    pdfTables.push(...pageTables)
    const pageText = cleanText(pdfItemsToText(items))

    importDebug('pdf.page', {
      pageNumber,
      ...pdfItemDebugSummary(items),
      pageTextLength: pageText.length,
      candidateTableCount: pageTables.length,
      candidateTables: tableDebugSummary(pageTables)
    })

    if (pageText) {
      textPages.push(pageText)
      continue
    }
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await page.render({ canvas, viewport }).promise
    pagesForOcr.push(canvas)
    importDebug('pdf.ocr_queued', { pageNumber, width: canvas.width, height: canvas.height })
  }

  const ocrText = pagesForOcr.length ? await ocrImages(pagesForOcr) : ''
  const text = cleanText([...textPages, ocrText].filter(Boolean).join('\n'))
  const textTables = textToCandidateTables(text)
  const tables = [...pdfTables, ...textTables]
  const bestLines = pickBestQuoteTable(tables)

  importDebug('pdf.complete', {
    textLength: text.length,
    pdfTableCount: pdfTables.length,
    textTableCount: textTables.length,
    tableCount: tables.length,
    tables: tableDebugSummary(tables),
    bestLineCount: bestLines.length,
    ocrPageCount: pagesForOcr.length
  })

  return {
    kind: 'PDF',
    name: file.name,
    mimeType: file.type,
    text,
    tables,
    warnings: pagesForOcr.length ? [`OCR utilisé sur ${pagesForOcr.length} page(s) PDF sans couche texte.`] : []
  }
}

const extractImage = async (file: File): Promise<ExtractedInput> => {
  const text = await ocrImages([file])
  return {
    kind: 'IMAGE',
    name: file.name,
    mimeType: file.type,
    text,
    tables: textToCandidateTables(text),
    warnings: ['OCR automatique : vérifier les champs à faible confiance avant génération.']
  }
}

export const extractInputFile = async (file: File): Promise<ExtractedInput> => {
  const kind = detectInputKind(file)
  importDebug('import.start', { kind, fileSize: file.size, mimeType: file.type })
  try {
    if (kind === 'TEXT') return await extractTextFile(file)
    if (kind === 'EXCEL') return await extractExcel(file)
    if (kind === 'WORD') return await extractWord(file)
    if (kind === 'PDF') return await extractPdf(file)
    if (kind === 'IMAGE') return await extractImage(file)
    throw new Error('Format de fichier non supporté. Utilisez PDF, Excel, Word, image ou texte.')
  } catch (caught) {
    importDebug('import.error', {
      kind,
      errorName: caught instanceof Error ? caught.name : 'UnknownError',
      errorMessage: caught instanceof Error ? caught.message : String(caught)
    })
    throw caught
  }
}
