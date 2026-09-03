import { useState } from 'react'
import { amountToFrenchDirhams, documentLabel, documentTotals, lineSubtotalHT, lineTotalHT } from './lib'
import {
  downloadThemedPdf,
  premiumThemeOptions,
  printThemedPdf,
  shareThemedPdf,
  type PremiumThemeId
} from './pdfThemes'
import {
  defaultPdfDisplayOptions,
  pdfDisplayOptionLabels,
  withPdfDisplayOption,
  type PdfDisplayOptions,
  type PdfDisplayOptionKey
} from './pdfDisplayOptions'
import { companyLegalLine } from './types'
import type { CommercialDocument, CompanySettings } from './types'
import './preview.css'
import './premium-themes.css'
import './pdf-personalization.css'

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

const formattedDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    .format(new Date(`${iso}T12:00:00`))

const brandInitials = (brand: string, name: string) => {
  const source = brand.trim() || name.trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase() || 'TS'
}

const vatLabel = (document: CommercialDocument) => {
  const rates = [...new Set(document.lines.map(line => line.vatRate))]
  return rates.length === 1 ? `TVA ${String(rates[0]).replace('.', ',')}%` : 'TVA'
}

const stoppedAtLabel = (document: CommercialDocument) => {
  if (document.type === 'FACTURE') return 'ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE'
  if (document.type === 'DEVIS') return 'ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE'
  if (document.type === 'BL') return 'ARRÊTÉ LE PRÉSENT BON DE LIVRAISON À LA SOMME DE'
  return 'ARRÊTÉ LE PRÉSENT BON DE COMMANDE À LA SOMME DE'
}

const lineDiscountTotal = (document: CommercialDocument) =>
  Math.max(0, document.lines.reduce((sum, line) => sum + lineSubtotalHT(line) - lineTotalHT(line), 0))

const shownNumber = (document: CommercialDocument) => document.number || 'Brouillon · numéro à la finalisation'

const priceOptionKeys = new Set<PdfDisplayOptionKey>(['unitPriceHT', 'lineTotalHT', 'summaryTotalHT', 'vat', 'amountInWords'])

export default function PdfPreviewScreen({
  document,
  company,
  initialTemplate = 'premium',
  onBack
}: {
  document: CommercialDocument
  company: CompanySettings
  initialTemplate?: PremiumThemeId
  onBack: () => void
}) {
  const [template, setTemplate] = useState<PremiumThemeId>(initialTemplate)
  const [displayOpen, setDisplayOpen] = useState(false)
  const [displayOptions, setDisplayOptions] = useState<PdfDisplayOptions>(defaultPdfDisplayOptions)
  const pricingVisible = document.type !== 'BL' || document.blShowPrices
  const totals = documentTotals(document)
  const selected = premiumThemeOptions.find(option => option.id === template) ?? premiumThemeOptions[1]
  const hiddenCount = Object.values(displayOptions).filter(value => !value).length

  const toggleDisplay = (key: PdfDisplayOptionKey) => {
    if (!pricingVisible && priceOptionKeys.has(key)) return
    setDisplayOptions(current => withPdfDisplayOption(current, key, !current[key]))
  }

  return (
    <main className="preview-screen">
      <header className="preview-header">
        <button className="preview-back" onClick={onBack} aria-label="Retour">‹</button>
        <div>
          <span>Aperçu PDF</span>
          <strong>{documentLabel(document.type)} · {shownNumber(document)}</strong>
        </div>
        <span className="preview-header-space" />
      </header>

      <section aria-label="Choisir le modèle PDF">
        <div className="template-gallery" role="group" aria-label="Modèles PDF">
          {premiumThemeOptions.map(option => (
            <button
              key={option.id}
              className={`template-option ${template === option.id ? 'active' : ''}`}
              onClick={() => setTemplate(option.id)}
              aria-pressed={template === option.id}
              aria-label={`${option.label} · ${option.subtitle}`}
            >
              <span className={`theme-swatch theme-swatch-${option.id}`} />
              <strong>{option.label}</strong>
              <small>{option.subtitle}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="pdf-display-control" aria-label="Personnaliser l’affichage du PDF">
        <button
          className={`pdf-display-trigger ${displayOpen ? 'active' : ''}`}
          onClick={() => setDisplayOpen(open => !open)}
          aria-expanded={displayOpen}
        >
          <span><strong>Affichage</strong><small>{hiddenCount ? `${hiddenCount} élément${hiddenCount > 1 ? 's' : ''} masqué${hiddenCount > 1 ? 's' : ''}` : 'Standard premium'}</small></span>
          <b>{displayOpen ? '−' : '+'}</b>
        </button>
        {displayOpen && (
          <div className="pdf-display-panel">
            <div className="pdf-display-panel-head">
              <div><strong>Éléments facultatifs</strong><small>Les données restent enregistrées. Seul le rendu change.</small></div>
              <span>Ce document</span>
            </div>
            <div className="pdf-display-options">
              {pdfDisplayOptionLabels.map(option => {
                const disabled = !pricingVisible && priceOptionKeys.has(option.key)
                return (
                  <button
                    key={option.key}
                    className={displayOptions[option.key] ? 'visible' : 'hidden'}
                    onClick={() => toggleDisplay(option.key)}
                    aria-pressed={displayOptions[option.key]}
                    disabled={disabled}
                  >
                    <span>{option.label}</span>
                    <i aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            <p className="pdf-display-lock-note">Toujours visibles : type, numéro, date, client, désignation, quantité et Total TTC lorsque les prix sont affichés.</p>
          </div>
        )}
      </section>

      <div className="paper-stage">
        <article className={`pdf-paper ${template === 'original' ? 'original' : 'premium'} theme-${template}`} data-template={template}>
          {template === 'original' ? (
            <OriginalPreview document={document} company={company} pricingVisible={pricingVisible} options={displayOptions} />
          ) : (
            <PremiumPreview document={document} company={company} pricingVisible={pricingVisible} options={displayOptions} />
          )}
        </article>
      </div>

      <nav className="preview-actions" aria-label="Actions PDF">
        <button onClick={() => void shareThemedPdf(document, company, template, displayOptions)}>
          <ActionIcon kind="share" />
          <span>Partager</span>
        </button>
        <button className="download" onClick={() => downloadThemedPdf(document, company, template, displayOptions)}>
          <ActionIcon kind="download" />
          <span>PDF</span>
        </button>
        <button onClick={() => printThemedPdf(document, company, template, displayOptions)}>
          <ActionIcon kind="print" />
          <span>Imprimer</span>
        </button>
      </nav>

      <p className="preview-note"><strong>{selected.label}</strong> · {selected.subtitle}</p>
      <span className="sr-only">Total TTC {money(totals.totalTTC)} MAD</span>
    </main>
  )
}

function OriginalPreview({ document, company, pricingVisible, options }: { document: CommercialDocument; company: CompanySettings; pricingVisible: boolean; options: PdfDisplayOptions }) {
  const totals = documentTotals(document)
  const lineDiscount = lineDiscountTotal(document)
  return (
    <>
      <div className="original-top">
        <div className="original-title"><h1>{documentLabel(document.type).toUpperCase()}</h1><strong>#{shownNumber(document)}</strong></div>
        <CompanyMark company={company} compact />
      </div>
      {document.client && (
        <div className="original-client">
          <strong>Client :</strong> {document.client}
          {document.clientAddress && <small>{document.clientAddress}</small>}
          {document.clientIce && <small>ICE : {document.clientIce}</small>}
          {document.clientIfNumber && <small>IF : {document.clientIfNumber}</small>}
        </div>
      )}
      <div className={`original-meta ${options.object ? '' : 'object-hidden'}`}>
        {options.object && <p><strong>OBJET :</strong> {document.object || '—'}</p>}
        <p><strong>{company.cityLabel} LE :</strong><br />{formattedDate(document.date)}</p>
      </div>
      <PreviewTable document={document} pricingVisible={pricingVisible} variant="original" options={options} />
      {pricingVisible && (
        <div className="original-totals">
          {lineDiscount > 0 && <span>REMISES LIGNES : <strong>{money(lineDiscount)}</strong></span>}
          {totals.globalDiscount > 0 && <span>REMISE GLOBALE : <strong>{money(totals.globalDiscount)}</strong></span>}
          {options.summaryTotalHT && <span>TOTAL HT : <strong>{money(totals.totalHT)}</strong></span>}
          {options.vat && <span>{vatLabel(document)} : <strong>{money(totals.totalVAT)}</strong></span>}
          <span>TOTAL TTC : <strong>{money(totals.totalTTC)}</strong></span>
        </div>
      )}
      {pricingVisible && options.amountInWords && <p className="original-words">{stoppedAtLabel(document)} {amountToFrenchDirhams(totals.totalTTC)} TTC</p>}
      {options.signatures && <PreviewSignatures company={company} />}
      {options.footer && <PreviewFooter company={company} />}
    </>
  )
}

function PremiumPreview({ document, company, pricingVisible, options }: { document: CommercialDocument; company: CompanySettings; pricingVisible: boolean; options: PdfDisplayOptions }) {
  const totals = documentTotals(document)
  const lineDiscount = lineDiscountTotal(document)
  return (
    <>
      <div className="premium-top">
        <CompanyMark company={company} />
        <div className="premium-doc-id">
          <span>{documentLabel(document.type)}</span>
          <h1>#{shownNumber(document)}</h1>
          <small>{formattedDate(document.date)}</small>
        </div>
      </div>
      <div className="premium-rule" />
      <div className={`premium-info-grid ${options.object ? '' : 'object-hidden'}`}>
        <section>
          <span>FACTURÉ À</span><strong>{document.client || 'Client à renseigner'}</strong>
          {document.clientAddress && <small>{document.clientAddress}</small>}
          {document.clientIce && <small>ICE : {document.clientIce}</small>}
          {document.clientIfNumber && <small>IF : {document.clientIfNumber}</small>}
        </section>
        {options.object && <section><span>OBJET</span><strong>{document.object || 'Objet du document'}</strong></section>}
      </div>
      <PreviewTable document={document} pricingVisible={pricingVisible} variant="premium" options={options} />
      {pricingVisible && (
        <div className="premium-summary-wrap">
          {options.amountInWords && <div className="premium-words"><span>Montant en lettres</span><p>{amountToFrenchDirhams(totals.totalTTC)}</p></div>}
          <div className="premium-summary">
            {lineDiscount > 0 && <div><span>Remises lignes</span><strong>- {money(lineDiscount)}</strong></div>}
            {totals.globalDiscount > 0 && <div><span>Remise globale</span><strong>- {money(totals.globalDiscount)}</strong></div>}
            {options.summaryTotalHT && <div><span>Total HT</span><strong>{money(totals.totalHT)}</strong></div>}
            {options.vat && <div><span>{vatLabel(document)}</span><strong>{money(totals.totalVAT)}</strong></div>}
            <div className="premium-summary-total"><span>Total TTC</span><strong>{money(totals.totalTTC)} MAD</strong></div>
          </div>
        </div>
      )}
      {options.signatures && <PreviewSignatures company={company} premium />}
      {options.footer && <PreviewFooter company={company} premium />}
    </>
  )
}

function PreviewTable({ document, pricingVisible, variant, options }: { document: CommercialDocument; pricingVisible: boolean; variant: 'original' | 'premium'; options: PdfDisplayOptions }) {
  const columns = [
    { key: 'designation', visible: true, weight: 2.3 },
    { key: 'unit', visible: options.unit, weight: 0.8 },
    { key: 'quantity', visible: true, weight: 0.7 },
    { key: 'unitPriceHT', visible: pricingVisible && options.unitPriceHT, weight: 1 },
    { key: 'lineTotalHT', visible: pricingVisible && options.lineTotalHT, weight: 1.1 }
  ].filter(column => column.visible)
  const gridTemplateColumns = columns.map(column => `${column.weight}fr`).join(' ')

  return (
    <div className={`preview-table ${variant}`}>
      <div className="preview-table-head" style={{ gridTemplateColumns }}>
        <span>Désignation</span>{options.unit && <span>Unité</span>}<span>Qté</span>{pricingVisible && options.unitPriceHT && <span>PU HT</span>}{pricingVisible && options.lineTotalHT && <span>Total HT</span>}
      </div>
      {document.lines.map(line => (
        <div className="preview-table-row" key={line.id} style={{ gridTemplateColumns }}>
          <span>{line.designation || '—'}{(line.discountPercent ?? 0) > 0 && <small>Remise {line.discountPercent}%</small>}</span>
          {options.unit && <span>{line.unit || '—'}</span>}<span>{line.quantity}</span>{pricingVisible && options.unitPriceHT && <span>{money(line.unitPriceHT)}</span>}{pricingVisible && options.lineTotalHT && <span>{money(lineTotalHT(line))}</span>}
        </div>
      ))}
    </div>
  )
}

function CompanyMark({ company, compact = false }: { company: CompanySettings; compact?: boolean }) {
  return (
    <div className={`company-mark ${compact ? 'compact' : ''}`}>
      {company.logoDataUrl ? <img src={company.logoDataUrl} alt="Logo société" /> : <span className="logo-placeholder">{brandInitials(company.brand, company.name)}</span>}
      <div><strong>{company.name}</strong><small>{company.brand}</small></div>
    </div>
  )
}

function PreviewSignatures({ company, premium = false }: { company: CompanySettings; premium?: boolean }) {
  return (
    <div className={`preview-signatures ${premium ? 'premium' : ''}`}>
      <div><span>Le Client</span><i /></div>
      <div><span>Le gérant</span>{company.managerSignatureDataUrl && <img src={company.managerSignatureDataUrl} alt="Signature gérant" />}<i /></div>
    </div>
  )
}

function PreviewFooter({ company, premium = false }: { company: CompanySettings; premium?: boolean }) {
  const legalLine = companyLegalLine(company)
  return (
    <footer className={`preview-footer ${premium ? 'premium' : ''}`}>
      <strong>{company.address}</strong><span>{legalLine}</span><small>Page 1 / 1</small>
    </footer>
  )
}

function ActionIcon({ kind }: { kind: 'share' | 'download' | 'print' }) {
  if (kind === 'share') return <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4"/></svg>
  if (kind === 'download') return <svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>
  return <svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5h18v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>
}