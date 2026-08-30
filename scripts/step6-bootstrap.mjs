import fs from 'node:fs'

const replace = (path, search, replacement, label) => {
  const source = fs.readFileSync(path, 'utf8')
  if (!source.includes(search)) throw new Error(`Missing patch anchor: ${label}`)
  fs.writeFileSync(path, source.replace(search, replacement))
}

const inputPath = 'src/inputExtractors.ts'
replace(inputPath,
  "import { importDebug } from './importDebug'\n",
  "import { importDebug } from './importDebug'\nimport { assertImportFileSize, assertPdfPageCount, raceWithImportAbort, runWithImportGuards, throwIfImportAborted } from './importGuards'\n",
  'input guard imports')

replace(inputPath,
`const extractTextFile = async (file: File): Promise<ExtractedInput> => ({
  kind: 'TEXT', name: file.name, mimeType: file.type, text: cleanText(await file.text()), tables: [], warnings: []
})`,
`const extractTextFile = async (file: File, signal?: AbortSignal): Promise<ExtractedInput> => ({
  kind: 'TEXT', name: file.name, mimeType: file.type, text: cleanText(await raceWithImportAbort(file.text(), signal)), tables: [], warnings: []
})`,
  'text extractor')

replace(inputPath,
`const extractExcel = async (file: File): Promise<ExtractedInput> => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })`,
`const extractExcel = async (file: File, signal?: AbortSignal): Promise<ExtractedInput> => {
  throwIfImportAborted(signal)
  const XLSX = await raceWithImportAbort(import('xlsx'), signal)
  const workbook = XLSX.read(await raceWithImportAbort(file.arrayBuffer(), signal), { type: 'array', cellDates: true })`,
  'excel extractor')

replace(inputPath,
`const extractWord = async (file: File): Promise<ExtractedInput> => {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()`,
`const extractWord = async (file: File, signal?: AbortSignal): Promise<ExtractedInput> => {
  throwIfImportAborted(signal)
  const mammoth = await raceWithImportAbort(import('mammoth'), signal)
  const arrayBuffer = await raceWithImportAbort(file.arrayBuffer(), signal)`,
  'word extractor')

replace(inputPath,
`export const readPdfTextItems = async (stream: PdfTextStreamLike): Promise<Array<unknown>> => {
  const reader = stream.getReader()
  const items: Array<unknown> = []
  try {
    while (true) {
      const { value, done } = await reader.read()`,
`export const readPdfTextItems = async (stream: PdfTextStreamLike, signal?: AbortSignal): Promise<Array<unknown>> => {
  const reader = stream.getReader()
  const items: Array<unknown> = []
  try {
    while (true) {
      throwIfImportAborted(signal)
      const { value, done } = await raceWithImportAbort(reader.read(), signal)`,
  'pdf text abort')

replace(inputPath,
`const ocrImages = async (images: Array<Blob | HTMLCanvasElement>) => {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['fra', 'eng'])
  try {
    const pages: string[] = []
    for (const image of images) {
      const result = await worker.recognize(image)
      pages.push(result.data.text)
    }
    return cleanText(pages.join('\\n'))
  } finally {
    await worker.terminate()
  }
}`,
`const ocrImages = async (images: Array<Blob | HTMLCanvasElement>, signal?: AbortSignal) => {
  throwIfImportAborted(signal)
  const { createWorker } = await raceWithImportAbort(import('tesseract.js'), signal)
  const worker = await raceWithImportAbort(createWorker(['fra', 'eng']), signal)
  const terminate = () => { void worker.terminate() }
  signal?.addEventListener('abort', terminate, { once: true })
  try {
    const pages: string[] = []
    for (const image of images) {
      throwIfImportAborted(signal)
      const result = await raceWithImportAbort(worker.recognize(image), signal)
      pages.push(result.data.text)
    }
    return cleanText(pages.join('\\n'))
  } finally {
    signal?.removeEventListener('abort', terminate)
    await worker.terminate().catch(() => undefined)
  }
}`,
  'ocr abort')

replace(inputPath,
`const extractPdf = async (file: File): Promise<ExtractedInput> => {
  importDebug('pdf.start', { fileSize: file.size, mimeType: file.type })
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  importDebug('pdf.loaded', { numPages: pdf.numPages })`,
`const extractPdf = async (file: File, signal?: AbortSignal): Promise<ExtractedInput> => {
  importDebug('pdf.start', { fileSize: file.size, mimeType: file.type })
  throwIfImportAborted(signal)
  const pdfjs = await raceWithImportAbort(import('pdfjs-dist'), signal)
  const workerUrl = (await raceWithImportAbort(import('pdfjs-dist/build/pdf.worker.min.mjs?url'), signal)).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const data = new Uint8Array(await raceWithImportAbort(file.arrayBuffer(), signal))
  const loadingTask = pdfjs.getDocument({ data })
  const destroyLoading = () => { void loadingTask.destroy() }
  signal?.addEventListener('abort', destroyLoading, { once: true })
  let pdf
  try {
    pdf = await raceWithImportAbort(loadingTask.promise, signal)
  } finally {
    signal?.removeEventListener('abort', destroyLoading)
  }
  throwIfImportAborted(signal)
  assertPdfPageCount(pdf.numPages)
  importDebug('pdf.loaded', { numPages: pdf.numPages })`,
  'pdf load guard')

replace(inputPath,
`  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const items = await readPdfTextItems(page.streamTextContent() as unknown as PdfTextStreamLike)`,
`  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    throwIfImportAborted(signal)
    const page = await raceWithImportAbort(pdf.getPage(pageNumber), signal)
    const items = await readPdfTextItems(page.streamTextContent() as unknown as PdfTextStreamLike, signal)`,
  'pdf loop guard')

replace(inputPath,
`    await page.render({ canvas, viewport }).promise
    pagesForOcr.push(canvas)`,
`    const renderTask = page.render({ canvas, viewport })
    const cancelRender = () => renderTask.cancel()
    signal?.addEventListener('abort', cancelRender, { once: true })
    try {
      await raceWithImportAbort(renderTask.promise, signal)
    } finally {
      signal?.removeEventListener('abort', cancelRender)
    }
    throwIfImportAborted(signal)
    pagesForOcr.push(canvas)`,
  'pdf render abort')

replace(inputPath,
`  const ocrText = pagesForOcr.length ? await ocrImages(pagesForOcr) : ''`,
`  const ocrText = pagesForOcr.length ? await ocrImages(pagesForOcr, signal) : ''`,
  'pdf ocr signal')

replace(inputPath,
`const extractImage = async (file: File): Promise<ExtractedInput> => {
  const text = await ocrImages([file])`,
`const extractImage = async (file: File, signal?: AbortSignal): Promise<ExtractedInput> => {
  const text = await ocrImages([file], signal)`,
  'image ocr signal')

replace(inputPath,
`export const extractInputFile = async (file: File): Promise<ExtractedInput> => {
  const kind = detectInputKind(file)
  importDebug('import.start', { kind, fileSize: file.size, mimeType: file.type })
  try {
    if (kind === 'TEXT') return await extractTextFile(file)
    if (kind === 'EXCEL') return await extractExcel(file)
    if (kind === 'WORD') return await extractWord(file)
    if (kind === 'PDF') return await extractPdf(file)
    if (kind === 'IMAGE') return await extractImage(file)
    throw new Error('Format de fichier non supporté. Utilisez PDF, Excel, Word, image ou texte.')
  } catch (caught) {`,
`export const extractInputFile = async (
  file: File,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<ExtractedInput> => {
  const kind = detectInputKind(file)
  importDebug('import.start', { kind, fileSize: file.size, mimeType: file.type })
  try {
    assertImportFileSize(file)
    return await runWithImportGuards(async signal => {
      if (kind === 'TEXT') return await extractTextFile(file, signal)
      if (kind === 'EXCEL') return await extractExcel(file, signal)
      if (kind === 'WORD') return await extractWord(file, signal)
      if (kind === 'PDF') return await extractPdf(file, signal)
      if (kind === 'IMAGE') return await extractImage(file, signal)
      throw new Error('Format de fichier non supporté. Utilisez PDF, Excel, Word, image ou texte.')
    }, options)
  } catch (caught) {`,
  'extractInputFile guard wrapper')

const sheetPath = 'src/QuoteImportSheet.tsx'
replace(sheetPath,
  "import { extractInputFile, extractedInputToRawQuote } from './inputExtractors'\n",
  "import { extractInputFile, extractedInputToRawQuote } from './inputExtractors'\nimport { IMPORT_TIMEOUT_MS, MAX_IMPORT_BYTES, MAX_PDF_PAGES } from './importGuards'\n",
  'sheet guard imports')

replace(sheetPath,
`  const fileRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)`,
`  const fileRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const importAbortRef = useRef<AbortController | null>(null)`,
  'sheet abort ref')

replace(sheetPath,
`  const reset = () => {
    recognitionRef.current?.abort()`,
`  const abortImport = () => {
    if (importAbortRef.current && !importAbortRef.current.signal.aborted) importAbortRef.current.abort()
  }

  const closeSheet = () => {
    abortImport()
    onClose()
  }

  const reset = () => {
    abortImport()
    importAbortRef.current = null
    recognitionRef.current?.abort()`,
  'sheet abort helpers')

replace(sheetPath,
`  const importFile = async (file: File) => {
    setStep('PROCESSING')
    setError('')
    setSourceName(file.name)
    try {
      const extracted = await extractInputFile(file)
      const raw = extractedInputToRawQuote(extracted)
      const canonical = normalizeImportedRaw(raw, defaultVatRate)
      setWarnings(extracted.warnings)
      setQuote(canonical)
      setReviewIssues(canonical.issues.filter(issue => issue.severity === 'ERROR'))
      setStep(canonical.status === 'READY' ? 'READY' : 'REVIEW')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de lire ce fichier.')
      setStep('ERROR')
    }
  }`,
`  const importFile = async (file: File) => {
    importAbortRef.current?.abort()
    const controller = new AbortController()
    importAbortRef.current = controller
    setStep('PROCESSING')
    setError('')
    setSourceName(file.name)
    try {
      const extracted = await extractInputFile(file, { signal: controller.signal })
      const raw = extractedInputToRawQuote(extracted)
      const canonical = normalizeImportedRaw(raw, defaultVatRate)
      setWarnings(extracted.warnings)
      setQuote(canonical)
      setReviewIssues(canonical.issues.filter(issue => issue.severity === 'ERROR'))
      setStep(canonical.status === 'READY' ? 'READY' : 'REVIEW')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de lire ce fichier.')
      setStep('ERROR')
    } finally {
      if (importAbortRef.current === controller) importAbortRef.current = null
    }
  }`,
  'sheet guarded import')

replace(sheetPath,
`    <div className="quote-import-layer" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="quote-import-sheet" role="dialog" aria-modal="true" aria-label="Importer vers devis">
        <div className="sheet-handle" />
        <header className="quote-import-header">
          <button className="sheet-close" onClick={onClose} aria-label="Fermer">×</button>`,
`    <div className="quote-import-layer" role="presentation" onMouseDown={event => event.target === event.currentTarget && closeSheet()}>
      <section className="quote-import-sheet" role="dialog" aria-modal="true" aria-label="Importer vers devis">
        <div className="sheet-handle" />
        <header className="quote-import-header">
          <button className="sheet-close" onClick={closeSheet} aria-label="Fermer">×</button>`,
  'sheet close abort')

replace(sheetPath,
`            <p className="quote-privacy-note"><span className="status-dot" /> Les documents restent locaux. La dictée native dépend du navigateur et peut utiliser son propre service vocal.</p>`,
`            <p className="quote-privacy-note"><span className="status-dot" /> Les documents restent locaux. La dictée native dépend du navigateur et peut utiliser son propre service vocal.</p>
            <p className="quote-limit-note">Limites de sécurité : {Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} Mo · PDF {MAX_PDF_PAGES} pages max · {Math.round(IMPORT_TIMEOUT_MS / 1000)} s max.</p>`,
  'sheet limits note')

replace(sheetPath,
`        {step === 'PROCESSING' && (
          <div className="quote-processing" aria-live="polite">
            <span className="quote-spinner" />
            <strong>Analyse du document…</strong>
            <span>{sourceName}</span>
            <small>Extraction → dictionnaire → validation → JSON canonique</small>
          </div>
        )}`,
`        {step === 'PROCESSING' && (
          <div className="quote-processing" aria-live="polite">
            <span className="quote-spinner" />
            <strong>Analyse du document…</strong>
            <span>{sourceName}</span>
            <small>Extraction → dictionnaire → validation → JSON canonique</small>
            <button className="quote-cancel-processing" onClick={abortImport}>Annuler l’analyse</button>
          </div>
        )}`,
  'processing cancel button')

const cssPath = 'src/quote-import.css'
replace(cssPath,
`.quote-privacy-note { display: flex; align-items: center; gap: 8px; }

.quote-processing {`,
`.quote-privacy-note { display: flex; align-items: center; gap: 8px; }
.quote-limit-note {
  margin: 7px 2px 0;
  color: #6e7972;
  font-size: .68rem;
  line-height: 1.4;
  text-align: center;
}

.quote-processing {`,
  'limit note style')

replace(cssPath,
`.quote-spinner {
  width: 44px;`,
`.quote-cancel-processing {
  min-height: 44px;
  margin-top: 8px;
  padding: 0 16px;
  border: 1px solid rgba(26, 52, 37, .10);
  border-radius: 14px;
  background: rgba(238,241,239,.94);
  color: #425048;
  font: inherit;
  font-size: .76rem;
  font-weight: 760;
}
.quote-spinner {
  width: 44px;`,
  'cancel button style')

for (const path of ['scripts/step6-bootstrap.mjs', '.github/workflows/step6-bootstrap.yml']) {
  if (fs.existsSync(path)) fs.unlinkSync(path)
}
