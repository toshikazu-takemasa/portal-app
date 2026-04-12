// ============================================================
// Profiles Module
// ADR-002: PAT + リポジトリ設定によるプロファイル切り替え
// ADR-007: 互換レイヤー付きアプリカタログモデルへの段階移行
// ============================================================

import type { Profile, FeatureFlags, AiPersona, InstalledApp } from '@/shared/types'
import { GitHubStorageAdapter } from '@/storage/github'
import type { StorageAdapter } from '@/storage/interface'

const SETTINGS_KEY = 'portal_settings'

// ------------------------------------------------------------
// Default Settings
// ------------------------------------------------------------

const DEFAULT_FEATURES: FeatureFlags = {
  backlog: false,
  finance: false,
  ai_ticker: true,
  ai_summary: true,
  voice_input: false,
  calendar: true,
  quick_links: true,
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

/** コアアプリ（常にインストール済み・削除不可）のデフォルト InstalledApp リスト */
const DEFAULT_INSTALLED_APPS: InstalledApp[] = [
  { appId: 'journal',    enabled: true,  settings: {}, installedAt: '' },
  { appId: 'checklist',  enabled: true,  settings: {}, installedAt: '' },
  { appId: 'chat',       enabled: true,  settings: {}, installedAt: '' },
  { appId: 'calendar',   enabled: true,  settings: {}, installedAt: '' },
  { appId: 'quicklinks', enabled: true,  settings: {}, installedAt: '' },
  { appId: 'finance',    enabled: false, settings: {}, installedAt: '' },
  { appId: 'backlog',    enabled: false, settings: {}, installedAt: '' },
]

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
  installedApps: DEFAULT_INSTALLED_APPS,
}

// ------------------------------------------------------------
// ADR-007: FeatureFlags → InstalledApp[] マイグレーション
// 旧 localStorage データを新モデルに変換（初回アクセス時のみ実行）
// ------------------------------------------------------------

/**
 * FeatureFlags と旧 Profile フィールドから InstalledApp[] を生成する
 * 新規ユーザーは DEFAULT_INSTALLED_APPS をそのまま使うためこの関数は通らない
 */
function migrateFeaturesToApps(
  features: FeatureFlags,
  partial: Partial<Profile>
): InstalledApp[] {
  const now = new Date().toISOString()
  return [
    { appId: 'journal',   enabled: true,                      settings: {}, installedAt: now },
    { appId: 'checklist', enabled: true,                      settings: {}, installedAt: now },
    { appId: 'chat',      enabled: true,                      settings: {}, installedAt: now },
    { appId: 'calendar',  enabled: features.calendar ?? true, settings: {}, installedAt: now },
    { appId: 'finance',   enabled: features.finance ?? false,  settings: {}, installedAt: now },
    {
      appId: 'backlog',
      enabled: features.backlog ?? false,
      settings: {
        ...(partial.backlog_space_id ? { backlog_space_id: partial.backlog_space_id } : {}),
        ...(partial.backlog_api_key  ? { backlog_api_key:  partial.backlog_api_key  } : {}),
      },
      installedAt: now,
    },
  ]
}

// ------------------------------------------------------------
// ADR-007: FeatureFlag キー → AppID マッピング（互換レイヤー）
// ここに載っているフラグは InstalledApps から状態を解決する
// ------------------------------------------------------------
const FEATURE_TO_APP_ID: Partial<Record<keyof FeatureFlags, string>> = {
  backlog:     'backlog',
  finance:     'finance',
  calendar:    'calendar',
  quick_links: 'quicklinks',
}

// ------------------------------------------------------------
// Storage helpers
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
    const merged: Profile = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      features:      { ...DEFAULT_FEATURES,    ...(parsed.features    ?? {}) },
      ai_persona:    { ...DEFAULT_AI_PERSONA,   ...(parsed.ai_persona  ?? {}) },
      // ADR-007: InstalledApps がなければ FeatureFlags から移行する（互換レイヤー）
      installedApps:
        parsed.installedApps && parsed.installedApps.length > 0
          ? parsed.installedApps
          : migrateFeaturesToApps(
              { ...DEFAULT_FEATURES, ...(parsed.features ?? {}) },
              parsed
            ),
    }
    return merged
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * vault の ai_persona を primary source として Profile に適用する。
 * vault の値が空でない場合は localStorage より優先する（vault first）。
 * name / userCallName / avatarUrl / systemPrompt は vault が正とする。
 * providerId / model / apiKey は localStorage（設定画面）が正とする。
 */
export function applyVaultPersona(settings: Profile, vaultPersona: Partial<AiPersona>): Profile {
  const vaultFields = Object.fromEntries(
    Object.entries(vaultPersona).filter(([, v]) => v !== '' && v !== undefined)
  ) as Partial<AiPersona>
  return {
    ...settings,
    ai_persona: {
      ...settings.ai_persona,  // providerId / model / apiKey はそのまま
      ...vaultFields,           // name / userCallName / avatarUrl / systemPrompt を vault で上書き
    },
  }
}

/** 設定を保存する */
export function saveSettings(settings: Profile): void {
  if (!isClient()) return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

/**
 * 機能フラグを確認する（ADR-007: InstalledApps を優先参照、未マッピングは features にフォールバック）
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const settings = getSettings()
  const appId = FEATURE_TO_APP_ID[feature]
  if (appId && settings.installedApps && settings.installedApps.length > 0) {
    const app = settings.installedApps.find((a) => a.appId === appId)
    return app?.enabled ?? false
  }
  return settings.features[feature] ?? false
}

// ------------------------------------------------------------
// ADR-007: App Catalog 操作 API
// ------------------------------------------------------------

/** インストール済みアプリ一覧を返す */
export function getInstalledApps(): InstalledApp[] {
  return getSettings().installedApps ?? []
}

/** アプリを追加（既に存在する場合は enabled を true にする） */
export function installApp(appId: string, appSettings: Record<string, string> = {}): void {
  if (!isClient()) return
  const settings = getSettings()
  const apps = settings.installedApps ?? []
  const existing = apps.find((a) => a.appId === appId)
  const now = new Date().toISOString()
  if (existing) {
    existing.enabled = true
    existing.settings = { ...existing.settings, ...appSettings }
  } else {
    apps.push({ appId, enabled: true, settings: appSettings, installedAt: now })
  }
  saveSettings({ ...settings, installedApps: apps })
}

/** アプリを削除（enabled を false にする） */
export function uninstallApp(appId: string): void {
  if (!isClient()) return
  const settings = getSettings()
  const apps = (settings.installedApps ?? []).map((a) =>
    a.appId === appId ? { ...a, enabled: false } : a
  )
  saveSettings({ ...settings, installedApps: apps })
}

/** アプリの有効/無効を切り替える */
export function setAppEnabled(appId: string, enabled: boolean): void {
  if (!isClient()) return
  const settings = getSettings()
  const apps = (settings.installedApps ?? []).map((a) =>
    a.appId === appId ? { ...a, enabled } : a
  )
  saveSettings({ ...settings, installedApps: apps })
}

/** アプリ固有の設定値を返す（Provider が認証情報を取得する際に使う） */
export function getAppSettings(appId: string): Record<string, string> {
  const installed = getSettings().installedApps ?? []
  return installed.find((a) => a.appId === appId)?.settings ?? {}
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
