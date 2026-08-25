import { StrictMode, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import OnboardingScreen from './OnboardingScreen'
import PdfPreviewScreen from './Preview'
import SettingsScreen, { type PwaInstallPrompt } from './SettingsScreen'
import { getCompany, saveCompany } from './storage'
import type { CommercialDocument, CompanySettings } from './types'
import './styles.css'
import './editor.css'
import './history.css'
import './overlay.css'
import './preview-fix.css'

registerSW({ immediate: true })

type PreviewPayload = {
  commercialDocument: CommercialDocument
  company: CompanySettings
}

function Root() {
  const [preview, setPreview] = useState<PreviewPayload | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<PwaInstallPrompt | null>(null)
  const [appRevision, setAppRevision] = useState(0)
  const [bootCompany, setBootCompany] = useState<CompanySettings | null>(null)

  useEffect(() => {
    void getCompany().then(setBootCompany)
  }, [])

  useEffect(() => {
    const openPreview = (event: Event) => {
      const detail = (event as CustomEvent<PreviewPayload>).detail
      if (detail?.commercialDocument && detail?.company) setPreview(detail)
    }
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as PwaInstallPrompt)
    }
    const installed = () => setInstallPrompt(null)

    window.addEventListener('facture:preview', openPreview)
    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('facture:preview', openPreview)
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  const captureSettings = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (!target.closest('.profile-button')) return
    event.preventDefault()
    event.stopPropagation()
    setSettingsOpen(true)
  }

  const refreshAppData = async () => {
    setBootCompany(await getCompany())
    setAppRevision(current => current + 1)
  }

  if (!bootCompany) {
    return <div className="app-boot-screen" aria-label="Chargement">Facture PWA</div>
  }

  if (!bootCompany.onboardingCompleted) {
    return (
      <OnboardingScreen
        initialValue={bootCompany}
        onComplete={async company => {
          await saveCompany(company)
          setBootCompany(company)
          setAppRevision(current => current + 1)
        }}
      />
    )
  }

  return (
    <>
      <div onClickCapture={captureSettings}>
        <App key={appRevision} />
      </div>

      {settingsOpen && (
        <div className="preview-overlay settings-overlay" role="dialog" aria-modal="true" aria-label="Réglages">
          <SettingsScreen
            onBack={() => setSettingsOpen(false)}
            onDataChanged={() => void refreshAppData()}
            installPrompt={installPrompt}
            onInstallConsumed={() => setInstallPrompt(null)}
          />
        </div>
      )}

      {preview && (
        <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Aperçu PDF">
          <PdfPreviewScreen
            document={preview.commercialDocument}
            company={preview.company}
            initialTemplate={preview.company.pdfTemplate ?? 'premium'}
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
