// ============================================================
// Domain: AI
// UC-04: AIに今日の記録をサマリーさせる
// /api/summarize を経由して Anthropic Claude を呼ぶ
// ============================================================

import { getActiveProfile } from '@/profiles'

/** 日記内容を AI にサマリーさせる */
export async function summarizeJournal(content: string): Promise<string> {
  const profile = getSettings()
  const persona = profile.ai_persona

  if (!persona.apiKey) {
    throw new Error('AI API キーが設定されていません。設定画面で Anthropic API キーを入力してください。')
  }

  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      systemPrompt: persona.systemPrompt,
      aiName: persona.name,
      userCallName: persona.userCallName,
      apiKey: persona.apiKey,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? 'AI API エラー')
  }

  const data = await res.json()
  return data.summary as string
}

/** Backlog の課題一覧を取得する */
export async function getBacklogIssues(
  spaceId: string,
  apiKey: string
): Promise<BacklogIssue[]> {
  // 自分の userId を取得
  const myselfRes = await fetch(
    `https://${spaceId}/api/v2/users/myself?apiKey=${encodeURIComponent(apiKey)}`
  )
  if (!myselfRes.ok) throw new Error('Backlog API 認証エラー')
  const myself = await myselfRes.json()

  // 自分にアサインされた未完了課題を取得
  const params = new URLSearchParams({
    apiKey,
    'statusId[]': ['1', '2', '3'].join('&statusId[]='), // Open, In Progress, Resolved
    'assigneeId[]': String(myself.id),
    count: '50',
    order: 'updated',
  })

  const issuesRes = await fetch(
    `https://${spaceId}/api/v2/issues?${params.toString().replace('statusId%5B%5D=1%26statusId%5B%5D%3D2%26statusId%5B%5D%3D3', 'statusId[]=1&statusId[]=2&statusId[]=3')}`
  )
  if (!issuesRes.ok) throw new Error('Backlog 課題取得エラー')
  return issuesRes.json()
}

export interface BacklogIssue {
  id: number
  issueKey: string
  summary: string
  status: { name: string }
  priority: { name: string }
  dueDate: string | null
  updated: string
}
