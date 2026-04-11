// ============================================================
// Domain: Journal
// UC-01: 今日の日記を書いて保存する
// UC-02: 過去の日記を日付で読む
// StorageAdapter 経由のみ — 直接 fetch 禁止
// ============================================================

import { createStorageAdapter } from '@/profiles'
import type { JournalEntry } from '@/shared/types'

/** 今日の日付文字列 (YYYY-MM-DD) */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/** 指定日の日記を取得する */
export async function getJournalByDate(date: string): Promise<JournalEntry | null> {
  const adapter = createStorageAdapter()
  return adapter.getJournal(date)
}

/** 日記を保存する */
export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const adapter = createStorageAdapter()
  return adapter.saveJournal(entry)
}

/** 直近の日記日付一覧を取得する */
export async function getRecentDates(limit = 60): Promise<string[]> {
  const adapter = createStorageAdapter()
  return adapter.listJournalDates(limit)
}

/** 今日の日記エントリを作成する（空） */
export function createEmptyEntry(date: string): JournalEntry {
  return {
    date,
    content: '',
  }
}
