import { describe, expect, it } from 'vitest'
import {
  ImportGuardError,
  MAX_IMPORT_BYTES,
  MAX_PDF_PAGES,
  assertImportFileSize,
  assertPdfPageCount,
  runWithImportGuards
} from './importGuards'

const captureGuard = (fn: () => void) => {
  try {
    fn()
    throw new Error('Expected import guard to throw')
  } catch (error) {
    expect(error).toBeInstanceOf(ImportGuardError)
    return error as ImportGuardError
  }
}

describe('import guardrails', () => {
  it('accepts a file at the configured size limit', () => {
    expect(() => assertImportFileSize({ size: MAX_IMPORT_BYTES })).not.toThrow()
  })

  it('rejects a file larger than the configured size limit', () => {
    expect(captureGuard(() => assertImportFileSize({ size: MAX_IMPORT_BYTES + 1 })).code).toBe('FILE_TOO_LARGE')
  })

  it('rejects a PDF above the page limit', () => {
    expect(captureGuard(() => assertPdfPageCount(MAX_PDF_PAGES + 1)).code).toBe('PDF_TOO_LONG')
  })

  it('turns a processing deadline into a controlled timeout error', async () => {
    await expect(runWithImportGuards(
      () => new Promise<never>(() => undefined),
      { timeoutMs: 5 }
    )).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  it('turns user cancellation into a controlled cancellation error', async () => {
    const controller = new AbortController()
    const promise = runWithImportGuards(
      () => new Promise<never>(() => undefined),
      { signal: controller.signal, timeoutMs: 1_000 }
    )
    controller.abort()
    await expect(promise).rejects.toMatchObject({ code: 'CANCELLED' })
  })
})
