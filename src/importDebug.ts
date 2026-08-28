type ImportDebugData = Record<string, unknown>

// Diagnostic hook intentionally kept as a no-op in merge candidates.
// Preview-only telemetry can be reintroduced on a dedicated debug branch when needed.
export const importDebug = (_stage: string, _data: ImportDebugData = {}) => undefined
