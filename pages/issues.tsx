// ============================================================
// GitHub Issues ページ（ADR-008 / ADR-010）
// /api/tasks/github 経由で GitHub Issues を取得・表示する
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { isAppEnabled, getSettings } from '@/profiles'
import { upsertJournalSection, buildTaskReflectionMarkdown } from '@/domains/journal'
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

function getTodayDateString() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
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
  const today = getTodayDateString()
  const CHECKED_KEY = `github_issues_checked_${today}`

  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(`github_issues_checked_${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })}`)
      if (raw) return new Set(JSON.parse(raw) as string[])
    } catch {}
    return new Set()
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(false)
  const [repo, setRepo] = useState('')
  const [reflecting, setReflecting] = useState(false)
  const [reflected, setReflected] = useState(false)

  useEffect(() => {
    localStorage.setItem(CHECKED_KEY, JSON.stringify([...checkedIds]))
  }, [checkedIds, CHECKED_KEY])

  const fetchTasks = useCallback(() => {
    const creds = getGithubCredentials()
    if (!creds) {
      setConfigured(false)
      setLoading(false)
      return
    }

    setConfigured(true)
    setRepo(creds.repo)
    setLoading(true)
    setError('')

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
  }, [])

  useEffect(() => {
    if (!isAppEnabled('github-issues')) {
      router.replace('/')
      return
    }
    fetchTasks()
  }, [router, fetchTasks])

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleUncheck() {
    setCheckedIds(new Set())
  }

  async function handleReflect() {
    const selected = tasks.filter((t) => checkedIds.has(t.id))
    if (selected.length === 0) return
    setReflecting(true)
    setError('')
    try {
      const header = `## GitHub Issues（${today}）`
      const snippet = buildTaskReflectionMarkdown(today, selected, { header })
      await upsertJournalSection(today, snippet, header)
      setReflected(true)
      setTimeout(() => setReflected(false), 2500)
    } catch (e) {
      setError(String(e))
    } finally {
      setReflecting(false)
    }
  }

  const checkedCount = checkedIds.size

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-base font-semibold tracking-tight">GitHub Issues</h1>
        {repo && <span className="text-xs text-zinc-500 truncate">{repo}</span>}
        {tasks.length > 0 && (
          <span className="text-xs text-zinc-500 shrink-0">{tasks.length} 件</span>
        )}
        <div className="flex-1" />
        {configured && (
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30"
          >
            再取得
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
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
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">担当 Issue はありません</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ul className="divide-y divide-zinc-800">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  onClick={() => toggleCheck(task.id)}
                  className="px-4 py-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                        checkedIds.has(task.id)
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-600'
                      }`}
                    >
                      {checkedIds.has(task.id) && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 shrink-0 mt-0.5 w-10 text-right">
                      {task.externalRef?.key}
                    </span>
                    <div className="flex-1 min-w-0">
                      {task.externalRef?.url ? (
                        <a
                          href={task.externalRef.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-zinc-200 leading-snug hover:text-white hover:underline"
                        >
                          {task.title}
                        </a>
                      ) : (
                        <p className="text-sm text-zinc-200 leading-snug">{task.title}</p>
                      )}
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

      {/* Footer — 固定 */}
      {configured && !loading && tasks.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-3">
          {reflected && <span className="text-xs text-emerald-400">✓ 日記に反映しました</span>}
          {error && <p className="text-xs text-red-400 truncate max-w-48">{error}</p>}
          <div className="flex-1" />
          <button
            onClick={handleUncheck}
            disabled={checkedCount === 0}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30"
          >
            チェックを外す
          </button>
          <button
            onClick={handleReflect}
            disabled={reflecting || checkedCount === 0}
            className="rounded-full bg-zinc-800 text-zinc-100 px-4 py-2 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40"
          >
            {reflecting ? '反映中...' : `日記に反映${checkedCount > 0 ? `（${checkedCount}）` : ''}`}
          </button>
        </footer>
      )}
    </div>
  )
}
