import { describe, expect, it } from 'vitest'
import {
  ImportGuardError,
  MAX_IMPORT_BYTES,
  MAX_PDF_PAGES,
  assertImportFileSize,
  assertPdfPageCount,
  runWithImportGuards
} from './importGuards'

describe('import guardrails', () => {
  it('accepts a file at the configured size limit', () => {
    expect(() => assertImportFileSize({ size: MAX_IMPORT_BYTES })).not.toThrow()
  })

  it('rejects a file larger than the configured size limit', () => {
    expect(() => assertImportFileSize({ size: MAX_IMPORT_BYTES + 1 })).toThrowError(
      expect.objectContaining({ code: 'FILE_TOO_LARGE' })
    )
  })

  it('rejects a PDF above the page limit', () => {
    expect(() => assertPdfPageCount(MAX_PDF_PAGES + 1)).toThrowError(
      expect.objectContaining({ code: 'PDF_TOO_LONG' })
    )
  })

  it('turns a processing deadline into a controlled timeout error', async () => {
    await expect(runWithImportGuards(
      () => new Promise<never>(() => undefined),
      { timeoutMs: 5 }
    )).rejects.toEqual(expect.objectContaining<Partial<ImportGuardError>>({ code: 'TIMEOUT' }))
  })

  it('turns user cancellation into a controlled cancellation error', async () => {
    const controller = new AbortController()
    const promise = runWithImportGuards(
      () => new Promise<never>(() => undefined),
      { signal: controller.signal, timeoutMs: 1_000 }
    )
    controller.abort()
    await expect(promise).rejects.toEqual(expect.objectContaining<Partial<ImportGuardError>>({ code: 'CANCELLED' }))
  })
})
