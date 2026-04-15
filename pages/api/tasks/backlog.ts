// ============================================================
// API Route: /api/tasks/backlog（ADR-010）
// Backlog API プロキシ — クライアントの代わりにサーバーサイドで Backlog を呼び出す
// POST body: { spaceId: string, apiKey: string }
// Response: { tasks: UnifiedTask[] } | { error: string }
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next'
import type { UnifiedTask } from '@/shared/types'

interface BacklogIssueRaw {
  id: number
  issueKey: string
  summary: string
  status: { name: string }
  priority: { name: string }
  dueDate: string | null
}

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ tasks: UnifiedTask[] } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { spaceId, apiKey } = req.body as { spaceId?: string; apiKey?: string }

  if (!spaceId || !apiKey) {
    return res.status(400).json({ error: '認証情報が不足しています（spaceId / apiKey）' })
  }

  try {
    // 自分のユーザー ID を取得
    const myselfRes = await fetch(
      `https://${spaceId}/api/v2/users/myself?apiKey=${encodeURIComponent(apiKey)}`
    )
    if (!myselfRes.ok) throw new Error('Backlog API 認証エラー')
    const myself = (await myselfRes.json()) as { id: number }

    // 全プロジェクトのステータスを並列取得し、「完了」以外の statusId を収集
    // /api/v2/statuses はプロジェクト指定必須のため /api/v2/projects 経由で取得する
    const projectsRes = await fetch(
      `https://${spaceId}/api/v2/projects?apiKey=${encodeURIComponent(apiKey)}&archived=false`
    )
    const nonCompletedStatusIds = new Set<string>(['1', '2', '3']) // 標準ステータスをフォールバックとして含む
    if (projectsRes.ok) {
      const projects = (await projectsRes.json()) as Array<{ id: number }>
      const allStatuses = await Promise.all(
        projects.map((p) =>
          fetch(`https://${spaceId}/api/v2/projects/${p.id}/statuses?apiKey=${encodeURIComponent(apiKey)}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        )
      )
      for (const statuses of allStatuses) {
        for (const s of statuses as Array<{ id: number; name: string }>) {
          if (s.name !== '完了') nonCompletedStatusIds.add(String(s.id))
        }
      }
    }

    const params = new URLSearchParams({ apiKey, count: '100', order: 'updated' })
    for (const id of nonCompletedStatusIds) params.append('statusId[]', id)
    params.append('assigneeId[]', String(myself.id))

    const issuesRes = await fetch(`https://${spaceId}/api/v2/issues?${params.toString()}`)
    if (!issuesRes.ok) throw new Error('Backlog 課題取得エラー')
    const issues = (await issuesRes.json()) as BacklogIssueRaw[]

    const tasks: UnifiedTask[] = issues.map((issue) => ({
      id: String(issue.id),
      source: 'backlog' as const,
      title: issue.summary,
      status: STATUS_MAP[issue.status.name] ?? 'open',
      dueDate: issue.dueDate?.split('T')[0] ?? undefined,
      priority: PRIORITY_MAP[issue.priority.name] ?? undefined,
      externalRef: {
        key: issue.issueKey,
        url: `https://${spaceId}/view/${issue.issueKey}`,
      },
      labels: [],
    }))

    res.status(200).json({ tasks })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
