import { describe, expect, it } from 'vitest'
import {
  BACKUP_REMINDER_AFTER_DAYS,
  BACKUP_URGENT_AFTER_DAYS,
  evaluateBackupHealth,
  reminderUrgency
} from './backupContinuity'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-08-29T12:00:00.000Z')
const isoDaysAgo = (days: number) => new Date(NOW - days * DAY_MS).toISOString()

describe('backup continuity policy', () => {
  it('does not nag an empty app', () => {
    expect(evaluateBackupHealth(0, '', NOW)).toBe('empty')
  })

  it('treats existing data without an external backup as urgent', () => {
    expect(evaluateBackupHealth(1, '', NOW)).toBe('urgent')
  })

  it('keeps recent backups fresh until the 7-day threshold', () => {
    expect(evaluateBackupHealth(2, isoDaysAgo(BACKUP_REMINDER_AFTER_DAYS - 1), NOW)).toBe('fresh')
    expect(evaluateBackupHealth(2, isoDaysAgo(BACKUP_REMINDER_AFTER_DAYS), NOW)).toBe('due')
  })

  it('promotes backups to urgent at 30 days', () => {
    expect(evaluateBackupHealth(3, isoDaysAgo(BACKUP_URGENT_AFTER_DAYS - 1), NOW)).toBe('due')
    expect(evaluateBackupHealth(3, isoDaysAgo(BACKUP_URGENT_AFTER_DAYS), NOW)).toBe('urgent')
  })

  it('suppresses a reminder during the 24-hour snooze window', () => {
    expect(reminderUrgency(1, { lastBackupAt: '', snoozedUntil: new Date(NOW + DAY_MS).toISOString() }, NOW)).toBeNull()
    expect(reminderUrgency(1, { lastBackupAt: '', snoozedUntil: new Date(NOW - 1).toISOString() }, NOW)).toBe('urgent')
  })
})
