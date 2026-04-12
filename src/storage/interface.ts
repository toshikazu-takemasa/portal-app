// ============================================================
// StorageAdapter Interface
// DDD Lite の核心: この型を経由しないストレージアクセスは禁止
// 現実装: GitHubStorageAdapter (storage/github.ts)
// 将来実装: D1StorageAdapter (storage/d1.ts)
// ============================================================

import type { JournalEntry, PortalConfig, AiPersona } from '@/shared/types'

export interface StorageAdapter {
  // --- Journal ---
  /** 指定日の日記/日報を取得する */
  getJournal(date: string): Promise<JournalEntry | null>
  /** 日記/日報を保存する（新規作成 or 更新） */
  saveJournal(entry: JournalEntry): Promise<void>
  /** 日記ファイルの一覧を取得する（YYYY-MM-DD の配列） */
  listJournalDates(limit?: number): Promise<string[]>

  // --- Config ---
  /** portal-config.json を取得する */
  getPortalConfig(): Promise<PortalConfig>
  /** portal-config.json を保存する */
  savePortalConfig(config: PortalConfig): Promise<void>

  // --- AI Persona ---
  /**
   * vault/persona/persona.md を読み込み AiPersona を返す。
   * frontmatter(name/userCallName/avatarUrl) + 本文(systemPrompt) で構成。
   * ファイルが存在しない場合は null を返す。
   */
  getAiPersona(): Promise<Partial<AiPersona> | null>

  // --- Files（汎用） ---
  /** 任意パスのファイルを取得する（Markdown等） */
  getFile(path: string): Promise<{ content: string; sha: string } | null>
  /** 任意パスにファイルを保存する */
  saveFile(path: string, content: string, sha?: string): Promise<void>
}
