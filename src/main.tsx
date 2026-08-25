import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import PdfPreviewScreen from './Preview'
import type { CommercialDocument, CompanySettings } from './types'
import './styles.css'
import './editor.css'

registerSW({ immediate: true })

type PreviewPayload = {
  commercialDocument: CommercialDocument
  company: CompanySettings
}

function Root() {
  const [preview, setPreview] = useState<PreviewPayload | null>(null)

  useEffect(() => {
    const openPreview = (event: Event) => {
      const detail = (event as CustomEvent<PreviewPayload>).detail
      if (detail?.commercialDocument && detail?.company) setPreview(detail)
    }
    window.addEventListener('facture:preview', openPreview)
    return () => window.removeEventListener('facture:preview', openPreview)
  }, [])

  return (
    <>
      <App />
      {preview && (
        <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Aperçu PDF">
          <PdfPreviewScreen
            document={preview.commercialDocument}
            company={preview.company}
            initialTemplate="premium"
            onBack={() => setPreview(null)}
          />
        </div>
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
