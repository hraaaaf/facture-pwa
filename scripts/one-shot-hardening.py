from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}')
    target.write_text(text.replace(old, new, 1))


replace_once(
    'src/pdf.ts',
    "const money = (value: number) =>\n  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)",
    "const money = (value: number) =>\n  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })\n    .format(value)\n    .replace(/[\\u202f\\u00a0]/g, ' ')"
)
replace_once('src/pdf.ts', "  if (company.brand) {", "  if (company.brand && !company.logoDataUrl) {")
replace_once(
    'src/referenceFixture.ts',
    "import { temporaryTapistorLogoDataUrl } from './brand'",
    "import { sourceTapistorLogoDataUrl } from './sourceReferenceLogo'"
)
replace_once(
    'src/referenceFixture.ts',
    '  logoDataUrl: temporaryTapistorLogoDataUrl,',
    '  logoDataUrl: sourceTapistorLogoDataUrl,'
)

replace_once(
    'src/App.tsx',
    "import { useEffect, useMemo, useState, type ReactNode } from 'react'",
    "import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'"
)
replace_once(
    'src/App.tsx',
    "  const [newOpen, setNewOpen] = useState(false)\n",
    "  const [newOpen, setNewOpen] = useState(false)\n  const autosaveTimer = useRef<number | null>(null)\n  const autosaveGeneration = useRef(0)\n"
)
show_notice = """  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2400)
  }
"""
autosave = show_notice + """
  const cancelAutosave = () => {
    autosaveGeneration.current += 1
    if (autosaveTimer.current !== null) {
      window.clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
  }

  const updateDraft = (next: CommercialDocument) => {
    setDraft(next)
    if (next.status !== 'DRAFT') return
    cancelAutosave()
    const generation = autosaveGeneration.current
    autosaveTimer.current = window.setTimeout(() => {
      const saved = { ...next, updatedAt: new Date().toISOString() }
      void saveDocument(saved)
        .then(() => {
          if (generation !== autosaveGeneration.current) return
          setDocuments(current => {
            const without = current.filter(document => document.id !== saved.id)
            return [saved, ...without].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          })
          setDraft(current =>
            current?.id === saved.id && current.status === 'DRAFT'
              ? { ...current, updatedAt: saved.updatedAt }
              : current
          )
        })
        .catch(error => {
          if (generation !== autosaveGeneration.current) return
          if (error instanceof Error && error.message.includes('finalisé')) void refresh()
        })
    }, 800)
  }
"""
replace_once('src/App.tsx', show_notice, autosave)
replace_once(
    'src/App.tsx',
    "  const persistDraft = async (document: CommercialDocument) => {\n    try {",
    "  const persistDraft = async (document: CommercialDocument) => {\n    cancelAutosave()\n    try {"
)
replace_once(
    'src/App.tsx',
    "      if (!window.confirm('Finaliser ce document ? Son numéro deviendra définitif et ne sera jamais réutilisé.')) return\n      const saved = await finalizeDocument(document, company)",
    "      if (!window.confirm('Finaliser ce document ? Son numéro deviendra définitif et ne sera jamais réutilisé.')) return\n      cancelAutosave()\n      const saved = await finalizeDocument(document, company)"
)
replace_once('src/App.tsx', '          onChange={setDraft}', '          onChange={updateDraft}')

old_remove = """export const removeDocument = async (id: string) => {
  const documents = await getDocuments()
  const current = documents.find(document => document.id === id)
  if (current && current.status !== 'DRAFT') throw new Error('Un document finalisé ne peut pas être supprimé. Utilisez Annuler.')
  return transact<undefined>(DOCS_STORE, 'readwrite', store => store.delete(id))
}
"""
new_remove = """export const removeDocument = async (id: string): Promise<void> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE, 'readwrite')
    const store = tx.objectStore(DOCS_STORE)
    const request = store.get(id) as IDBRequest<unknown>
    let settled = false
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      try { tx.abort() } catch { /* transaction already finished */ }
      db.close()
      reject(error ?? new Error('Suppression impossible'))
    }
    request.onerror = () => fail(request.error)
    request.onsuccess = () => {
      try {
        if (request.result === undefined) return
        const current = normalizeDocument(request.result)
        if (current.status !== 'DRAFT') throw new Error('Un document finalisé ne peut pas être supprimé. Utilisez Annuler.')
        const deletion = store.delete(id)
        deletion.onerror = () => fail(deletion.error)
      } catch (error) { fail(error) }
    }
    tx.onerror = () => fail(tx.error)
    tx.onabort = () => fail(tx.error)
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      db.close()
      resolve()
    }
  })
}
"""
replace_once('src/storage.ts', old_remove, new_remove)
