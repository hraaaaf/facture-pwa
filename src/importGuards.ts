export const MAX_IMPORT_BYTES = 15 * 1024 * 1024
export const MAX_PDF_PAGES = 20
export const IMPORT_TIMEOUT_MS = 45_000

export type ImportGuardCode = 'FILE_TOO_LARGE' | 'PDF_TOO_LONG' | 'TIMEOUT' | 'CANCELLED'

const guardMessages: Record<ImportGuardCode, string> = {
  FILE_TOO_LARGE: 'Fichier trop lourd. Limite : 15 Mo.',
  PDF_TOO_LONG: 'PDF trop long. Limite : 20 pages.',
  TIMEOUT: 'Analyse interrompue après 45 s. Essayez un fichier plus léger.',
  CANCELLED: 'Analyse annulée.'
}

export class ImportGuardError extends Error {
  code: ImportGuardCode

  constructor(code: ImportGuardCode, message = guardMessages[code]) {
    super(message)
    this.name = 'ImportGuardError'
    this.code = code
  }
}

export const assertImportFileSize = (file: Pick<File, 'size'>) => {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportGuardError('FILE_TOO_LARGE')
}

export const assertPdfPageCount = (pageCount: number) => {
  if (!Number.isFinite(pageCount) || pageCount < 1) return
  if (pageCount > MAX_PDF_PAGES) throw new ImportGuardError('PDF_TOO_LONG')
}

export const importAbortError = (signal?: AbortSignal) => {
  const reason = signal?.reason
  if (reason instanceof ImportGuardError) return reason
  return new ImportGuardError('CANCELLED')
}

export const throwIfImportAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw importAbortError(signal)
}

export const raceWithImportAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return promise
  throwIfImportAborted(signal)
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      signal.addEventListener('abort', () => reject(importAbortError(signal)), { once: true })
    })
  ])
}

export const runWithImportGuards = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<T> => {
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? IMPORT_TIMEOUT_MS
  const cancelFromParent = () => {
    if (!controller.signal.aborted) controller.abort(importAbortError(options.signal))
  }

  if (options.signal?.aborted) cancelFromParent()
  else options.signal?.addEventListener('abort', cancelFromParent, { once: true })

  const timer = window.setTimeout(() => {
    if (!controller.signal.aborted) controller.abort(new ImportGuardError('TIMEOUT'))
  }, timeoutMs)

  try {
    return await raceWithImportAbort(operation(controller.signal), controller.signal)
  } finally {
    window.clearTimeout(timer)
    options.signal?.removeEventListener('abort', cancelFromParent)
  }
}
