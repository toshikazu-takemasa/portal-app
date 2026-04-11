// ============================================================
// App Registry（ADR-007）
// 利用可能なアプリのカタログ定義
// ポータルに追加・削除できる機能パッケージをここで一元管理する
// ============================================================

import type { AppManifest } from '@/shared/types'

export const APP_REGISTRY: AppManifest[] = [
  {
    id: 'journal',
    label: '日記',
    icon: '📓',
    category: 'core',
    capabilities: ['journal'],
    defaultEnabled: true,
    requiredSettings: [],
  },
  {
    id: 'checklist',
    label: 'チェックリスト',
    icon: '✅',
    category: 'core',
    capabilities: ['task'],
    defaultEnabled: true,
    requiredSettings: [],
  },
  {
    id: 'calendar',
    label: 'カレンダー',
    icon: '📅',
    category: 'core',
    capabilities: ['calendar'],
    defaultEnabled: true,
    requiredSettings: [],
  },
  {
    id: 'chat',
    label: 'AIチャット',
    icon: '💬',
    category: 'core',
    capabilities: ['chat'],
    defaultEnabled: true,
    requiredSettings: [],
  },
  {
    id: 'finance',
    label: '家計管理',
    icon: '💰',
    category: 'personal',
    capabilities: ['finance'],
    defaultEnabled: false,
    requiredSettings: [],
  },
  {
    id: 'backlog',
    label: 'Backlog',
    icon: '📋',
    category: 'work',
    capabilities: ['task', 'external-integration'],
    defaultEnabled: false,
    requiredSettings: ['backlog_space_id', 'backlog_api_key'],
  },
  {
    id: 'google-calendar',
    label: 'Google Calendar',
    icon: '🗓',
    category: 'core',
    capabilities: ['calendar', 'external-integration'],
    defaultEnabled: false,
    requiredSettings: ['google_client_id', 'google_refresh_token'],
  },
  {
    id: 'github-issues',
    label: 'GitHub Issues',
    icon: '🐙',
    category: 'work',
    capabilities: ['task', 'external-integration'],
    defaultEnabled: false,
    requiredSettings: ['github_issues_repo'],
  },
]

export function getAppManifest(appId: string): AppManifest | undefined {
  return APP_REGISTRY.find((a) => a.id === appId)
}
