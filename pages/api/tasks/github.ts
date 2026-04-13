// ============================================================
// API Route: /api/tasks/github（ADR-010）
// GitHub Issues API プロキシ — サーバーサイドで GitHub を呼び出す
// POST body: { pat: string, repo: string }  （repo: "owner/repo" 形式）
// Response: { tasks: UnifiedTask[] } | { error: string }
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next'
import type { UnifiedTask } from '@/shared/types'

interface GitHubIssueRaw {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  labels: Array<{ name: string }>
  pull_request?: { url: string } // 存在すれば PR なので除外する
}

const GITHUB_API = 'https://api.github.com'

function githubHeaders(pat: string): HeadersInit {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ tasks: UnifiedTask[] } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pat, repo } = req.body as { pat?: string; repo?: string }

  if (!pat || !repo) {
    return res.status(400).json({ error: '認証情報が不足しています（pat / repo）' })
  }

  try {
    // 指定リポジトリのオープン Issue を全件取得（PR 除外）
    const url = `${GITHUB_API}/repos/${repo}/issues?state=open&per_page=100`
    const issuesRes = await fetch(url, { headers: githubHeaders(pat) })
    if (!issuesRes.ok) throw new Error(`GitHub Issues 取得エラー (${issuesRes.status})`)
    const issues = (await issuesRes.json()) as GitHubIssueRaw[]

    const tasks: UnifiedTask[] = issues
      .filter((issue) => !issue.pull_request) // PR を除外
      .map((issue) => ({
        id: String(issue.id),
        source: 'github' as const,
        title: issue.title,
        status: 'open' as const,
        externalRef: {
          key: `#${issue.number}`,
          url: issue.html_url,
        },
        labels: issue.labels.map((l) => l.name),
      }))

    res.status(200).json({ tasks })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
