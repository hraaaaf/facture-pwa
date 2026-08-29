import { useEffect, useState } from 'react'
import { createLocalBackup, getDocuments, type LocalBackup } from './storage'
import {
  getBackupContinuity,
  markBackupCreated,
  reminderUrgency,
  snoozeBackupReminder,
  type BackupReminderUrgency
} from './backupContinuity'
import './backup-continuity.css'

const backupFileName = () => `facture-pwa-backup-${new Date().toISOString().slice(0, 10)}.json`

const downloadBackup = (file: File) => {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function BackupReminder() {
  const [urgency, setUrgency] = useState<BackupReminderUrgency | null>(null)
  const [prepared, setPrepared] = useState<LocalBackup | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const refresh = async () => {
    const documents = await getDocuments()
    const nextUrgency = reminderUrgency(documents.length, getBackupContinuity())
    setUrgency(nextUrgency)
    if (nextUrgency) setPrepared(await createLocalBackup())
  }

  useEffect(() => {
    void refresh()
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
    const onExternalBackupDownload = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[download]') as HTMLAnchorElement | null : null
      if (!target?.download.startsWith('facture-pwa-backup-')) return
      markBackupCreated()
      setUrgency(null)
    }
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('click', onExternalBackupDownload, true)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('click', onExternalBackupDownload, true)
    }
  }, [])

  const backupNow = async () => {
    if (!prepared || busy) return
    setBusy(true)
    setFeedback('')
    const file = new File([JSON.stringify(prepared, null, 2)], backupFileName(), { type: 'application/json' })
    const navigatorWithShare = navigator as Navigator & { canShare?: (data?: ShareData) => boolean }
    try {
      if (
        typeof navigator.share === 'function'
        && typeof navigatorWithShare.canShare === 'function'
        && navigatorWithShare.canShare({ files: [file] })
      ) {
        await navigator.share({ title: 'Sauvegarde Factea', text: 'Sauvegarde complète Factea', files: [file] })
        markBackupCreated()
      } else {
        downloadBackup(file)
        markBackupCreated()
      }
      setUrgency(null)
      setFeedback('Sauvegarde créée')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') setFeedback('Partage annulé')
      else setFeedback('Sauvegarde impossible')
    } finally {
      setBusy(false)
    }
  }

  if (!urgency && !feedback) return null

  return (
    <aside className={`backup-reminder-shell ${urgency ? `backup-${urgency}` : 'backup-success'}`} aria-label="Continuité des données">
      {urgency ? (
        <>
          <div className="backup-reminder-copy">
            <span className="backup-reminder-kicker">Sauvegarde locale</span>
            <strong>{urgency === 'urgent' ? 'Sauvegarde à faire' : 'Sauvegarde à renouveler'}</strong>
            <small>{urgency === 'urgent' ? 'Garde une copie hors du téléphone.' : 'La dernière copie a plus de 7 jours.'}</small>
          </div>
          <div className="backup-reminder-actions">
            <button className="backup-reminder-primary" disabled={!prepared || busy} onClick={() => void backupNow()}>{busy ? 'Préparation…' : 'Sauvegarder'}</button>
            <button className="backup-reminder-later" onClick={() => { snoozeBackupReminder(); setUrgency(null) }}>Demain</button>
          </div>
        </>
      ) : (
        <div className="backup-reminder-copy"><strong>{feedback}</strong><small>Copie externe marquée comme récente.</small></div>
      )}
    </aside>
  )
}
