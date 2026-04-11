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

export type AiProviderId = 'anthropic' | 'gemini' | (string & {})

// ------------------------------------------------------------
// Profile（単一プロファイル＋機能ON/OFF）
// ------------------------------------------------------------

// ------------------------------------------------------------
// AI Persona（AI人格設定）
// portalのキモ: AI名・システムプロンプト・アバター・ユーザー呼称
// ------------------------------------------------------------
export interface AiPersona {
  name: string           // AI名（例: "パートナー"）
  systemPrompt: string   // システムプロンプト（AIの性格・口調）
  avatarUrl: string      // アバター画像URL or パス（空文字でデフォルト）
  userCallName: string   // ユーザーの呼び方（例: "あんた"）
  providerId: AiProviderId // 利用するAIプロバイダ（将来拡張を想定）
  model: string          // モデルID（プロバイダごとに解釈）
  apiKey: string         // AIプロバイダのAPIキー
}

export interface Profile {
  id: string
  label: string          // 表示名（例: "ポータル"）
  emoji: string          // アイコン（例: "🌀"）
  attribute?: string     // 属性（例: "work", "personal"）
  gh_pat: string         // GitHub Personal Access Token
  github_repo: string    // データリポジトリ（例: "owner/repo"）
  github_branch: string  // ブランチ（例: "main"）
  vault_path: string     // データルートディレクトリ（例: "vault"）
  diary_path: string     // 日記保存パス（例: "vault/diary"）
  report_path: string    // 日報保存パス（例: "vault/reports"）
  config_path: string    // portal-config.json のパス
  features: FeatureFlags
  ai_persona: AiPersona
  backlog_space_id?: string  // Backlog スペース ID（例: "myspace.backlog.com"）
  backlog_api_key?: string   // Backlog API キー
}

// ------------------------------------------------------------
// Journal（日記・日報）
// UC-01: 今日の日記を書いて保存する
// UC-02: 過去の日記を日付で読む
// ------------------------------------------------------------
export interface JournalEntry {
  date: string           // YYYY-MM-DD
  content: string        // Markdownテキスト
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
