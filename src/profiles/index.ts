// ============================================================
// Profiles Module
// ADR-002: PAT + リポジトリ設定によるプロファイル切り替え
// 既存の gh_pat / github_repo localStorage キーからマイグレーション
// ============================================================

import type { Profile, ProfileId, ProfilesMap, FeatureFlags, AiPersona } from '@/shared/types'
import { GitHubStorageAdapter } from '@/storage/github'
import type { StorageAdapter } from '@/storage/interface'

const PROFILES_KEY = 'portal_profiles'
const ACTIVE_KEY = 'portal_active_profile'

// ------------------------------------------------------------
// Defaults
// ------------------------------------------------------------

const DEFAULT_FEATURES_WORK: FeatureFlags = {
  backlog: true,
  finance: false,
  ai_ticker: true,
  ai_summary: true,
  voice_input: false,
  calendar: true,
}

const DEFAULT_FEATURES_PERSONAL: FeatureFlags = {
  backlog: false,
  finance: true,
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
}

const DEFAULT_WORK_PROFILE: Profile = {
  id: 'work',
  label: '仕事',
  emoji: '💼',
  gh_pat: '',
  github_repo: '',
  github_branch: 'master',
  vault_path: 'vault',
  diary_path: 'vault/diary',
  report_path: 'vault/reports',
  config_path: 'vault/config.json',
  features: DEFAULT_FEATURES_WORK,
  ai_persona: { ...DEFAULT_AI_PERSONA },
}

const DEFAULT_PERSONAL_PROFILE: Profile = {
  id: 'personal',
  label: 'プライベート',
  emoji: '🏠',
  gh_pat: '',
  github_repo: '',
  github_branch: 'main',
  vault_path: 'vault',
  diary_path: 'vault/diary',
  report_path: 'vault/diary',
  config_path: 'vault/config.json',
  features: DEFAULT_FEATURES_PERSONAL,
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

/** 全プロファイルを取得する */
export function getAllProfiles(): ProfilesMap {
  if (!isClient()) return { work: DEFAULT_WORK_PROFILE, personal: DEFAULT_PERSONAL_PROFILE }

  const raw = localStorage.getItem(PROFILES_KEY)
  if (!raw) return migrateFromLegacy()

  try {
    return JSON.parse(raw) as ProfilesMap
  } catch {
    return { work: DEFAULT_WORK_PROFILE, personal: DEFAULT_PERSONAL_PROFILE }
  }
}

/** アクティブなプロファイルを取得する */
export function getActiveProfile(): Profile {
  const id = getActiveProfileId()
  const profiles = getAllProfiles()
  return profiles[id] ?? DEFAULT_WORK_PROFILE
}

/** アクティブなプロファイルIDを取得する */
export function getActiveProfileId(): ProfileId {
  if (!isClient()) return 'work'
  return (localStorage.getItem(ACTIVE_KEY) as ProfileId) ?? 'work'
}

/** プロファイルを保存する */
export function saveProfile(id: ProfileId, profile: Profile): void {
  if (!isClient()) return
  const profiles = getAllProfiles()
  profiles[id] = profile
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

/** プロファイルを切り替える（ページをリロードして全データを再取得） */
export function switchProfile(id: ProfileId): void {
  if (!isClient()) return
  localStorage.setItem(ACTIVE_KEY, id)
  window.location.reload()
}

/** 機能フラグを確認する */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getActiveProfile().features[feature] ?? false
}

/** アクティブプロファイルの StorageAdapter を生成する */
export function createStorageAdapter(): StorageAdapter {
  const profile = getActiveProfile()
  return new GitHubStorageAdapter({
    pat: profile.gh_pat,
    repo: profile.github_repo,
    branch: profile.github_branch,
    diaryPath: profile.diary_path,
    configPath: profile.config_path,
  })
}

/** 既存の localStorage キー（gh_pat / github_repo）からマイグレーション */
function migrateFromLegacy(): ProfilesMap {
  const profiles: ProfilesMap = {
    work: { ...DEFAULT_WORK_PROFILE },
    personal: { ...DEFAULT_PERSONAL_PROFILE },
  }

  if (!isClient()) return profiles

  const legacyPat = localStorage.getItem('gh_pat')
  const legacyRepo = localStorage.getItem('github_repo')
  const legacyBranch = localStorage.getItem('github_branch')

  if (legacyPat) profiles.work.gh_pat = legacyPat
  if (legacyRepo) profiles.work.github_repo = legacyRepo
  if (legacyBranch) profiles.work.github_branch = legacyBranch

  // マイグレーション済みとして保存
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  return profiles
}
