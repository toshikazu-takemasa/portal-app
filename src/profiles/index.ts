// ============================================================
// Profiles Module
// ADR-002: PAT + リポジトリ設定によるプロファイル切り替え
// 既存の gh_pat / github_repo localStorage キーからマイグレーション
// ============================================================

import type { Profile, FeatureFlags, AiPersona } from '@/shared/types'
import { GitHubStorageAdapter } from '@/storage/github'
import type { StorageAdapter } from '@/storage/interface'

const SETTINGS_KEY = 'portal_settings'

// ------------------------------------------------------------
// Default Settings（単一プロファイル＋機能ON/OFF）
// ------------------------------------------------------------

const DEFAULT_FEATURES: FeatureFlags = {
  backlog: false,
  finance: false,
  ai_ticker: true,
  ai_summary: true,
  voice_input: false,
  calendar: true,
}

const DEFAULT_AI_PERSONA: AiPersona = {
  name: 'パートナー',
  systemPrompt: 'あなたは気さくで頼りになるAIアシスタントです。',
  avatarUrl: '',
  userCallName: 'あんた',
  providerId: 'anthropic',
  model: 'claude-haiku-4-5-20251001',
  apiKey: '',
}

const DEFAULT_SETTINGS: Profile = {
  id: 'default',
  label: 'ポータル',
  emoji: '🌀',
  gh_pat: '',
  github_repo: '',
  github_branch: 'main',
  vault_path: 'vault',
  diary_path: 'vault/diary',
  report_path: 'vault/reports',
  config_path: 'vault/config.json',
  features: DEFAULT_FEATURES,
  ai_persona: { ...DEFAULT_AI_PERSONA },
}

// ------------------------------------------------------------
// Storage helpers（localStorage はブラウザのみ）
// ------------------------------------------------------------


function isClient(): boolean {
  return typeof window !== 'undefined'
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------


/** 設定（単一プロファイル）を取得する */
export function getSettings(): Profile {
  if (!isClient()) return { ...DEFAULT_SETTINGS }
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      features: { ...DEFAULT_FEATURES, ...(parsed.features ?? {}) },
      ai_persona: { ...DEFAULT_AI_PERSONA, ...(parsed.ai_persona ?? {}) },
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** 設定を保存する */
export function saveSettings(settings: Profile): void {
  if (!isClient()) return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}


/** 機能フラグを確認する */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getSettings().features[feature] ?? false
}

/** StorageAdapter を生成する */
export function createStorageAdapter(): StorageAdapter {
  const settings = getSettings()
  return new GitHubStorageAdapter({
    pat: settings.gh_pat,
    repo: settings.github_repo,
    branch: settings.github_branch,
    diaryPath: settings.diary_path,
    configPath: settings.config_path,
  })
}
