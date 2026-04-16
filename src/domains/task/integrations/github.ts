// ============================================================
// GithubProvider（ADR-008 / ADR-009 / ADR-010）
// GitHub Issues 連携 — /api/tasks/github 経由でタスクを取得する
// isConfigured(): PAT と リポジトリが設定されている場合 true
// fetchTasks(): /api/tasks/github を呼び出して UnifiedTask[] を返す
//
// NOTE: 直接 api.github.com を叩くのではなく、Next.js API Route をプロキシとして使う
//       これにより PAT がブラウザの Network タブに外部ドメイン向けリクエストとして現れない（ADR-010）
// ============================================================

import { getSettings } from '@/profiles'
import type { UnifiedTask, TaskQuery } from '@/shared/types'
import type { TaskIntegrationProvider } from './interface'

function resolveCredentials(): { pat: string; repo: string } | null {
  const profile = getSettings()
  const appSettings = profile.installedApps?.find((a) => a.appId === 'github-issues')?.settings
  const repo = appSettings?.github_issues_repo ?? ''
  const pat = profile.gh_pat ?? ''
  if (!pat || !repo) return null
  return { pat, repo }
}

export class GithubProvider implements TaskIntegrationProvider {
  readonly sourceId = 'github' as const

  isConfigured(): boolean {
    return resolveCredentials() !== null
  }

  async fetchTasks(_query: TaskQuery): Promise<UnifiedTask[]> {
    const creds = resolveCredentials()
    if (!creds) return []

    const res = await fetch('/api/tasks/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pat: creds.pat, repo: creds.repo }),
    })
    if (!res.ok) throw new Error(`GitHub Issues 取得エラー (${res.status})`)
    const data = (await res.json()) as { tasks: UnifiedTask[] }
    return data.tasks
  }
}
