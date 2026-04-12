// ============================================================
// Profiles Module
// ADR-002: PAT + リポジトリ設定によるプロファイル切り替え
// ADR-007: App Catalog モデル（FeatureFlags 廃止済み）
// ============================================================

import type { Profile, AiPersona, InstalledApp } from '@/shared/types'
import { GitHubStorageAdapter } from '@/storage/github'
import type { StorageAdapter } from '@/storage/interface'

const SETTINGS_KEY = 'portal_settings'

// ------------------------------------------------------------
// Default Settings
// ------------------------------------------------------------

const DEFAULT_AI_PERSONA: AiPersona = {
  name: 'パートナー',
  systemPrompt: 'あなたは気さくで頼りになるAIアシスタントです。',
  avatarUrl: '',
  userCallName: 'あんた',
  providerId: 'anthropic',
  model: 'claude-haiku-4-5-20251001',
  apiKey: '',
}

/** デフォルトの InstalledApp リスト */
const DEFAULT_INSTALLED_APPS: InstalledApp[] = [
  { appId: 'journal',       enabled: true,  settings: {}, installedAt: '' },
  { appId: 'checklist',     enabled: true,  settings: {}, installedAt: '' },
  { appId: 'chat',          enabled: true,  settings: {}, installedAt: '' },
  { appId: 'calendar',      enabled: true,  settings: {}, installedAt: '' },
  { appId: 'quicklinks',    enabled: true,  settings: {}, installedAt: '' },
  { appId: 'finance',       enabled: false, settings: {}, installedAt: '' },
  { appId: 'backlog',       enabled: false, settings: {}, installedAt: '' },
  { appId: 'github-issues', enabled: false, settings: {}, installedAt: '' },
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
  ai_persona: { ...DEFAULT_AI_PERSONA },
  installedApps: DEFAULT_INSTALLED_APPS,
}

// ------------------------------------------------------------
// Storage helpers
// ------------------------------------------------------------

function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * 旧 localStorage（features フィールド）からの互換マイグレーション
 * installedApps が存在しない旧データを DEFAULT_INSTALLED_APPS に変換する
 */
function migrateOldSettings(parsed: Record<string, unknown>): InstalledApp[] {
  const now = new Date().toISOString()
  const features = (parsed.features ?? {}) as Record<string, boolean>
  return [
    { appId: 'journal',       enabled: true,                        settings: {}, installedAt: now },
    { appId: 'checklist',     enabled: true,                        settings: {}, installedAt: now },
    { appId: 'chat',          enabled: true,                        settings: {}, installedAt: now },
    { appId: 'calendar',      enabled: features.calendar  ?? true,  settings: {}, installedAt: now },
    { appId: 'quicklinks',    enabled: features.quick_links ?? true, settings: {}, installedAt: now },
    { appId: 'finance',       enabled: features.finance   ?? false, settings: {}, installedAt: now },
    { appId: 'backlog',       enabled: features.backlog   ?? false, settings: {}, installedAt: now },
    { appId: 'github-issues', enabled: false,                       settings: {}, installedAt: now },
  ]
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
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const installedApps =
      Array.isArray(parsed.installedApps) && (parsed.installedApps as InstalledApp[]).length > 0
        ? parsed.installedApps as InstalledApp[]
        : migrateOldSettings(parsed)

    // github-issues が installedApps に存在しない場合は追加（移行）
    const hasGithubIssues = installedApps.some((a) => a.appId === 'github-issues')
    if (!hasGithubIssues) {
      installedApps.push({ appId: 'github-issues', enabled: false, settings: {}, installedAt: new Date().toISOString() })
    }

    return {
      ...DEFAULT_SETTINGS,
      ...(parsed as Partial<Profile>),
      ai_persona:   { ...DEFAULT_AI_PERSONA, ...((parsed.ai_persona ?? {}) as Partial<AiPersona>) },
      installedApps,
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

/**
 * アプリが有効かどうかを返す（App Catalog 直結）
 * appId は APP_REGISTRY の id と一致させること
 */
export function isAppEnabled(appId: string): boolean {
  const apps = getSettings().installedApps ?? []
  return apps.find((a) => a.appId === appId)?.enabled ?? false
}

/**
 * vault の ai_persona を primary source として Profile に適用する。
 * name / userCallName / avatarUrl / systemPrompt は vault が正とする。
 * providerId / model / apiKey は localStorage（設定画面）が正とする。
 */
export function applyVaultPersona(settings: Profile, vaultPersona: Partial<AiPersona>): Profile {
  const vaultFields = Object.fromEntries(
    Object.entries(vaultPersona).filter(([, v]) => v !== '' && v !== undefined)
  ) as Partial<AiPersona>
  return {
    ...settings,
    ai_persona: { ...settings.ai_persona, ...vaultFields },
  }
}

// ------------------------------------------------------------
// App Catalog 操作 API
// ------------------------------------------------------------

/** インストール済みアプリ一覧を返す */
export function getInstalledApps(): InstalledApp[] {
  return getSettings().installedApps ?? []
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

/** アプリ固有の設定値を返す */
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
