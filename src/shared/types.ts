// ============================================================
// Portal App — Core Type Definitions
// 仕様駆動: 実装より先に型を定義する
// ============================================================

// ------------------------------------------------------------
// Feature Flags
// プロファイル別機能ON/OFF制御
// ------------------------------------------------------------
export interface FeatureFlags {
  backlog: boolean       // Backlog連携（仕事のみ）
  finance: boolean       // 家計管理（個人のみ）
  ai_ticker: boolean     // AIティッカー表示
  ai_summary: boolean    // AIサマリー
  voice_input: boolean   // 音声入力（将来）
  calendar: boolean      // カレンダー表示
}

// ------------------------------------------------------------
// Profile
// 仕事 / 個人のデータ接続先と機能フラグをまとめた設定
// ------------------------------------------------------------
export type ProfileId = 'work' | 'personal'

// ------------------------------------------------------------
// AI Persona（AI人格設定）
// portalのキモ: AI名・システムプロンプト・アバター・ユーザー呼称
// ------------------------------------------------------------
export interface AiPersona {
  name: string           // AI名（例: "パートナー"）
  systemPrompt: string   // システムプロンプト（AIの性格・口調）
  avatarUrl: string      // アバター画像URL or パス（空文字でデフォルト）
  userCallName: string   // ユーザーの呼び方（例: "あんた"）
}

export interface Profile {
  id: ProfileId
  label: string          // 表示名（例: "仕事", "プライベート"）
  emoji: string          // アイコン（例: "💼", "🏠"）
  gh_pat: string         // GitHub Personal Access Token
  github_repo: string    // データリポジトリ（例: "owner/repo"）
  github_branch: string  // ブランチ（例: "main", "master"）
  vault_path: string     // データルートディレクトリ（例: "vault"）
  diary_path: string     // 日記保存パス（例: "vault/diary"）
  report_path: string    // 日報保存パス（例: "vault/reports"）
  config_path: string    // portal-config.json のパス
  features: FeatureFlags
  ai_persona: AiPersona
}

export type ProfilesMap = Record<ProfileId, Profile>

// ------------------------------------------------------------
// Journal（日記・日報）
// UC-01: 今日の日記を書いて保存する
// UC-02: 過去の日記を日付で読む
// ------------------------------------------------------------
export interface JournalEntry {
  date: string           // YYYY-MM-DD
  content: string        // Markdownテキスト
  profile: ProfileId
  sha?: string           // GitHub API用（更新時に必要）
}

// ------------------------------------------------------------
// Checklist（チェックリスト）
// UC-05: チェックリストを完了状態で保存する
// ------------------------------------------------------------
export interface ChecklistItem {
  id: string
  title: string
  completed: boolean
}

export interface DailyChecklist {
  date: string           // YYYY-MM-DD
  items: ChecklistItem[]
  profile: ProfileId
}

// ------------------------------------------------------------
// Finance（家計管理）
// UC-06: 家計を記録する（個人プロファイルのみ）
// ------------------------------------------------------------
export type FinanceType = 'income' | 'expense'

export interface FinanceRecord {
  id: string
  date: string           // YYYY-MM-DD
  type: FinanceType
  category: string
  amount: number
  note?: string
}

// ------------------------------------------------------------
// Quick Links（クイックリンク）
// ------------------------------------------------------------
export interface QuickLink {
  id: string
  emoji: string
  name: string
  url: string
  category?: string
  sortOrder: number
}

// ------------------------------------------------------------
// Portal Config（リポジトリに保存する設定）
// ------------------------------------------------------------
export interface PortalConfig {
  links: QuickLink[]
  dailyTasks: ChecklistItem[]
  pillars: ChecklistItem[]   // 3つの柱
  kintaiUrl?: string
}

// ------------------------------------------------------------
// AI Chat
// UC-04: AIに今日の記録をサマリーさせる
// ------------------------------------------------------------
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}
