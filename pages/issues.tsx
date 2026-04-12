// ============================================================
// GitHub Issues ページ（ADR-008 / ADR-010）
// /api/tasks/github 経由で GitHub Issues を取得・表示する
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { isAppEnabled, getSettings } from '@/profiles'
import type { UnifiedTask } from '@/shared/types'

const LABEL_COLORS: Record<string, string> = {
  bug: 'bg-red-900/50 text-red-300',
  enhancement: 'bg-blue-900/50 text-blue-300',
  documentation: 'bg-purple-900/50 text-purple-300',
  question: 'bg-yellow-900/50 text-yellow-300',
}

function labelClass(name: string): string {
  return LABEL_COLORS[name] ?? 'bg-zinc-700 text-zinc-300'
}

function getGithubCredentials(): { pat: string; repo: string } | null {
  const profile = getSettings()
  const appSettings = profile.installedApps?.find((a) => a.appId === 'github-issues')?.settings
  const repo = appSettings?.github_issues_repo ?? ''
  const pat = profile.gh_pat ?? ''
  if (!pat || !repo) return null
  return { pat, repo }
}

export default function IssuesPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(false)
  const [repo, setRepo] = useState('')

  useEffect(() => {
    if (!isAppEnabled('github-issues')) {
      router.replace('/')
      return
    }

    const creds = getGithubCredentials()
    if (!creds) {
      setConfigured(false)
      setLoading(false)
      return
    }

    setConfigured(true)
    setRepo(creds.repo)

    fetch('/api/tasks/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pat: creds.pat, repo: creds.repo }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ tasks: UnifiedTask[]; error?: string }>
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setTasks(data.tasks)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-lg font-semibold tracking-tight">GitHub Issues</h1>
        {repo && <span className="ml-1 text-xs text-zinc-500">{repo}</span>}
        {tasks.length > 0 && (
          <span className="ml-auto text-xs text-zinc-500">{tasks.length} 件</span>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {!configured ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <p className="text-sm text-amber-400 font-medium">GitHub Issues が未設定です</p>
            <p className="mt-1 text-xs text-zinc-400">
              設定画面で GitHub PAT とリポジトリ名（owner/repo）を入力してください。
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="mt-4 rounded-full bg-zinc-100 text-zinc-900 px-4 py-1.5 text-xs font-semibold hover:bg-white transition-colors"
            >
              設定を開く
            </button>
          </div>
        ) : loading ? (
          <p className="text-zinc-500 text-sm">読み込み中...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">担当 Issue はありません</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ul className="divide-y divide-zinc-800">
              {tasks.map((task) => (
                <li key={task.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {/* Issue 番号 */}
                    <span className="text-xs font-mono text-zinc-500 shrink-0 mt-0.5 w-10 text-right">
                      {task.externalRef?.key}
                    </span>

                    <div className="flex-1 min-w-0">
                      {/* タイトル */}
                      {task.externalRef?.url ? (
                        <a
                          href={task.externalRef.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-zinc-200 leading-snug hover:text-white hover:underline"
                        >
                          {task.title}
                        </a>
                      ) : (
                        <p className="text-sm text-zinc-200 leading-snug">{task.title}</p>
                      )}

                      {/* ラベル */}
                      {task.labels && task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {task.labels.map((label) => (
                            <span
                              key={label}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${labelClass(label)}`}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
