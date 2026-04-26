// ============================================================
// BacklogProvider（ADR-008 / ADR-009）
// Backlog API から自分にアサインされた課題を取得し UnifiedTask に正規化する
// getBacklogIssues は後方互換のためにエクスポートを継続する
// ============================================================

import { getSettings } from '@/profiles'
import type { UnifiedTask, TaskQuery } from '@/shared/types'
import type { TaskIntegrationProvider } from './interface'

// ------------------------------------------------------------
// 後方互換型（pages/backlog.tsx が直接使うため残す）
// ------------------------------------------------------------
export interface BacklogIssue {
  id: number
  issueKey: string
  summary: string
  status: { name: string }
  priority: { name: string }
  dueDate: string | null
  updated: string
  project: { name: string }
}

// ------------------------------------------------------------
// 正規化マップ
// ------------------------------------------------------------
const STATUS_MAP: Record<string, UnifiedTask['status']> = {
  未対応: 'open',
  処理中: 'in_progress',
  処理済み: 'resolved',
  完了: 'completed',
}

const PRIORITY_MAP: Record<string, UnifiedTask['priority']> = {
  高: 'high',
  中: 'medium',
  低: 'low',
}

// ------------------------------------------------------------
// 認証情報解決（ADR-007 InstalledApp.settings → Profile フォールバック）
// ------------------------------------------------------------
function resolveCredentials(): { spaceId: string; apiKey: string } | null {
  const profile = getSettings()
  const appSettings = profile.installedApps?.find((a) => a.appId === 'backlog')?.settings
  const spaceId = appSettings?.backlog_space_id ?? profile.backlog_space_id ?? ''
  const apiKey = appSettings?.backlog_api_key ?? profile.backlog_api_key ?? ''
  if (!spaceId || !apiKey) return null
  return { spaceId, apiKey }
}

/** 認証情報を返す（pages/backlog.tsx 後方互換用） */
export function getBacklogCredentials(): { spaceId: string; apiKey: string } | null {
  return resolveCredentials()
}

// ------------------------------------------------------------
// Provider 実装（ADR-009: TaskIntegrationProvider）
// ------------------------------------------------------------
export class BacklogProvider implements TaskIntegrationProvider {
  readonly sourceId = 'backlog' as const

  isConfigured(): boolean {
    return resolveCredentials() !== null
  }

  async fetchTasks(_query: TaskQuery): Promise<UnifiedTask[]> {
    const creds = resolveCredentials()
    if (!creds) return []
    const issues = await getBacklogIssues(creds.spaceId, creds.apiKey)
    return issues.map((issue) => ({
      id: String(issue.id),
      source: 'backlog' as const,
      title: issue.summary,
      status: STATUS_MAP[issue.status.name] ?? 'open',
      dueDate: issue.dueDate?.split('T')[0] ?? undefined,
      priority: PRIORITY_MAP[issue.priority.name] ?? undefined,
      externalRef: { key: issue.issueKey },
      labels: [],
      projectName: issue.project.name,
      systemStatus: { label: issue.status.name },
    }))
  }
}

// ------------------------------------------------------------
// 後方互換関数（pages/backlog.tsx が直接呼び出す用）
// ------------------------------------------------------------

/** Backlog の課題一覧を取得する */
export async function getBacklogIssues(
  spaceId: string,
  apiKey: string
): Promise<BacklogIssue[]> {
  const myselfRes = await fetch(
    `https://${spaceId}/api/v2/users/myself?apiKey=${encodeURIComponent(apiKey)}`
  )
  if (!myselfRes.ok) throw new Error('Backlog API 認証エラー')
  const myself = (await myselfRes.json()) as { id: number }

  const params = new URLSearchParams({
    apiKey,
    count: '50',
    order: 'updated',
  })
  // Open / In Progress / Resolved（配列パラメータは append で正しく設定）
  params.append('statusId[]', '1')
  params.append('statusId[]', '2')
  params.append('statusId[]', '3')
  params.append('assigneeId[]', String(myself.id))

  const issuesRes = await fetch(
    `https://${spaceId}/api/v2/issues?${params.toString()}`
  )
  if (!issuesRes.ok) throw new Error('Backlog 課題取得エラー')
  return issuesRes.json() as Promise<BacklogIssue[]>
}
