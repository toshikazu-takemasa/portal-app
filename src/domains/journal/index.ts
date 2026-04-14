// ============================================================
// Domain: Journal
// UC-01: 今日の日記を書いて保存する
// UC-02: 過去の日記を日付で読む
// StorageAdapter 経由のみ — 直接 fetch 禁止
// ============================================================

import { createStorageAdapter } from '@/profiles'
import type { JournalEntry } from '@/shared/types'

/** 今日の日付文字列 (YYYY-MM-DD, JST基準) */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
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

/**
 * 日記エントリの末尾にスニペットを追記して保存する（ADR-012）
 * SHA 不整合（409）が発生した場合は最新 SHA で1回リトライする
 */
export async function appendToJournal(date: string, snippet: string): Promise<void> {
  const adapter = createStorageAdapter()
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await adapter.getJournal(date)
    const newContent = (existing?.content ?? '') + snippet
    try {
      await adapter.saveJournal({ date, content: newContent, sha: existing?.sha })
      return
    } catch (e) {
      if (attempt === 0 && String(e).includes('409')) continue
      throw e
    }
  }
}

/**
 * 日記内の指定セクションを差分更新する（差分登録）
 * - sectionHeader（例: `## タスク（2026-04-14）`）が既に存在すれば上書き
 * - 存在しなければ末尾に追記
 * セクション境界は `\n---\n` で判定する
 * SHA 不整合（409）が発生した場合は最新 SHA で1回リトライする
 */
export async function upsertJournalSection(date: string, snippet: string, sectionHeader: string): Promise<void> {
  const adapter = createStorageAdapter()
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await adapter.getJournal(date)
    const newContent = upsertSection(existing?.content ?? '', snippet, sectionHeader)
    try {
      await adapter.saveJournal({ date, content: newContent, sha: existing?.sha })
      return
    } catch (e) {
      if (attempt === 0 && String(e).includes('409')) continue
      throw e
    }
  }
}

/**
 * 文字列内のセクションを差分更新する純粋関数
 * sectionHeader が存在すれば、直前の `\n---\n` から次の `\n---\n`（または末尾）までを snippet で置換する
 */
export function upsertSection(currentContent: string, snippet: string, sectionHeader: string): string {
  const sectionIdx = currentContent.indexOf(sectionHeader)
  if (sectionIdx === -1) {
    return currentContent + snippet
  }

  // セクション開始: sectionHeader より前にある最後の \n---\n（なければ先頭）
  const sep = '\n---\n'
  const sepIdx = currentContent.lastIndexOf(sep, sectionIdx)
  const blockStart = sepIdx !== -1 ? sepIdx : 0

  // セクション終了: sectionHeader より後にある最初の \n---\n（なければ末尾）
  const nextSepIdx = currentContent.indexOf(sep, sectionIdx + sectionHeader.length)
  const blockEnd = nextSepIdx !== -1 ? nextSepIdx : currentContent.length

  return currentContent.slice(0, blockStart) + snippet + currentContent.slice(blockEnd)
}

// Reflection formatters（ADR-012）
export { buildTaskReflectionMarkdown, buildFinanceReflectionMarkdown } from './reflection'
