// ============================================================
// Backlog ページ（ADR-010）
// /api/tasks/backlog 経由で Backlog 課題を取得・表示する
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { isAppEnabled, getSettings } from '@/profiles'
import { upsertJournalSection, buildTaskReflectionMarkdown } from '@/domains/journal'
import type { UnifiedTask } from '@/shared/types'

const STATUS_LABEL: Record<UnifiedTask['status'], string> = {
  open: '未対応',
  in_progress: '処理中',
  resolved: '処理済み',
  completed: '完了',
}

const STATUS_COLOR: Record<UnifiedTask['status'], string> = {
  open: 'bg-zinc-700 text-zinc-300',
  in_progress: 'bg-blue-900/60 text-blue-300',
  resolved: 'bg-emerald-900/60 text-emerald-300',
  completed: 'bg-zinc-800 text-zinc-500',
}

const PRIORITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

function getTodayDateString() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

function getBacklogCredentials(): { spaceId: string; apiKey: string; projectKeys?: string } | null {
  const profile = getSettings()
  const appSettings = profile.installedApps?.find((a) => a.appId === 'backlog')?.settings
  const spaceId = appSettings?.backlog_space_id ?? profile.backlog_space_id ?? ''
  const apiKey = appSettings?.backlog_api_key ?? profile.backlog_api_key ?? ''
  if (!spaceId || !apiKey) return null
  const projectKeys = appSettings?.backlog_project_keys ?? ''
  return { spaceId, apiKey, ...(projectKeys ? { projectKeys } : {}) }
}

export default function BacklogPage() {
  const router = useRouter()
  const today = getTodayDateString()
  const CHECKED_KEY = `backlog_checked_${today}`

  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(`backlog_checked_${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })}`)
      if (raw) return new Set(JSON.parse(raw) as string[])
    } catch {}
    return new Set()
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(false)
  const [reflecting, setReflecting] = useState(false)
  const [reflected, setReflected] = useState(false)

  useEffect(() => {
    localStorage.setItem(CHECKED_KEY, JSON.stringify([...checkedIds]))
  }, [checkedIds, CHECKED_KEY])

  const fetchTasks = useCallback((force = false) => {
    const creds = getBacklogCredentials()
    if (!creds) {
      setConfigured(false)
      setLoading(false)
      return
    }

    setConfigured(true)
    setLoading(true)
    setError('')

    const CACHE_KEY = `backlog_tasks_${today}`

    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        try {
          setTasks(JSON.parse(cached))
          setLoading(false)
          return
        } catch (e) {
          localStorage.removeItem(CACHE_KEY)
        }
      }
    }

    fetch('/api/tasks/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId: creds.spaceId, apiKey: creds.apiKey, projectKeys: creds.projectKeys }),
    })
      .then(async (res) => {
        const isJson = res.headers.get('content-type')?.includes('application/json')
        const data = isJson ? await res.json() : null

        if (!res.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`)
        }
        return data as { tasks: UnifiedTask[]; error?: string }
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setTasks(data.tasks)
        localStorage.setItem(`backlog_tasks_${today}`, JSON.stringify(data.tasks))
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!isAppEnabled('backlog')) {
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
      const header = `## Backlog（${today}）`
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
        <h1 className="text-base font-semibold tracking-tight">Backlog</h1>
        {tasks.length > 0 && (
          <span className="text-xs text-zinc-500">{tasks.length} 件</span>
        )}
        <div className="flex-1" />
        {configured && (
          <button
            onClick={() => fetchTasks(true)}
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
            <p className="text-sm text-amber-400 font-medium">Backlog が未設定です</p>
            <p className="mt-1 text-xs text-zinc-400">
              設定画面でスペース ID と API キーを入力してください。
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
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm text-red-400 font-medium">課題の取得に失敗しました</p>
            <p className="mt-1 text-xs text-zinc-400 break-all">{error}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">担当課題はありません</p>
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
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${STATUS_COLOR[task.status]}`}>
                      {STATUS_LABEL[task.status]}
                      {task.systemStatus?.label && task.systemStatus.label !== STATUS_LABEL[task.status] && (
                        <span className="ml-1 opacity-70 text-[10px]">[{task.systemStatus.label}]</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      {task.projectName && (
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5 truncate">
                          {task.projectName}
                        </div>
                      )}
                      <p className="text-sm text-zinc-200 leading-snug">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {task.externalRef?.url ? (
                          <a
                            href={task.externalRef.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
                          >
                            {task.externalRef.key}
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-500">{task.externalRef?.key}</span>
                        )}
                        {task.dueDate && (
                          <span className={`text-xs ${task.dueDate < today ? 'text-red-400' : 'text-zinc-500'}`}>
                            期限: {task.dueDate}
                          </span>
                        )}
                        {task.priority && (
                          <span className="text-xs text-zinc-600">
                            優先度: {PRIORITY_LABEL[task.priority] ?? task.priority}
                          </span>
                        )}
                      </div>
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
