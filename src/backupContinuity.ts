export const BACKUP_REMINDER_AFTER_DAYS = 7
export const BACKUP_URGENT_AFTER_DAYS = 30
export const BACKUP_SNOOZE_HOURS = 24

const STORAGE_KEY = 'factea:backup-continuity:v1'
const DAY_MS = 24 * 60 * 60 * 1000

export type BackupHealth = 'empty' | 'fresh' | 'due' | 'urgent'
export type BackupReminderUrgency = 'due' | 'urgent'

export type BackupContinuityMeta = {
  lastBackupAt: string
  snoozedUntil: string
}

const emptyMeta = (): BackupContinuityMeta => ({ lastBackupAt: '', snoozedUntil: '' })

const validIso = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : ''

export const evaluateBackupHealth = (
  documentsCount: number,
  lastBackupAt: string,
  nowMs = Date.now()
): BackupHealth => {
  if (documentsCount <= 0) return 'empty'
  const parsed = Date.parse(lastBackupAt)
  if (!Number.isFinite(parsed)) return 'urgent'
  const ageDays = Math.max(0, (nowMs - parsed) / DAY_MS)
  if (ageDays < BACKUP_REMINDER_AFTER_DAYS) return 'fresh'
  if (ageDays < BACKUP_URGENT_AFTER_DAYS) return 'due'
  return 'urgent'
}

export const reminderUrgency = (
  documentsCount: number,
  meta: BackupContinuityMeta,
  nowMs = Date.now()
): BackupReminderUrgency | null => {
  const snoozedUntil = Date.parse(meta.snoozedUntil)
  if (Number.isFinite(snoozedUntil) && snoozedUntil > nowMs) return null
  const health = evaluateBackupHealth(documentsCount, meta.lastBackupAt, nowMs)
  return health === 'due' || health === 'urgent' ? health : null
}

export const getBackupContinuity = (): BackupContinuityMeta => {
  if (typeof window === 'undefined') return emptyMeta()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyMeta()
    const value = JSON.parse(raw) as Partial<BackupContinuityMeta>
    return {
      lastBackupAt: validIso(value.lastBackupAt),
      snoozedUntil: validIso(value.snoozedUntil)
    }
  } catch {
    return emptyMeta()
  }
}

const persist = (meta: BackupContinuityMeta) => {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta)) } catch { /* metadata only; backup itself must still work */ }
}

export const markBackupCreated = (now = new Date()): BackupContinuityMeta => {
  const next = { lastBackupAt: now.toISOString(), snoozedUntil: '' }
  persist(next)
  return next
}

export const snoozeBackupReminder = (now = new Date()): BackupContinuityMeta => {
  const current = getBackupContinuity()
  const next = {
    ...current,
    snoozedUntil: new Date(now.getTime() + BACKUP_SNOOZE_HOURS * 60 * 60 * 1000).toISOString()
  }
  persist(next)
  return next
}
