// ============================================================
// Backlog ページ（ADR-010）
// /api/tasks/backlog 経由で Backlog 課題を取得・表示する
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { isAppEnabled, getSettings } from '@/profiles'
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

function getBacklogCredentials(): { spaceId: string; apiKey: string } | null {
  const profile = getSettings()
  const appSettings = profile.installedApps?.find((a) => a.appId === 'backlog')?.settings
  const spaceId = appSettings?.backlog_space_id ?? profile.backlog_space_id ?? ''
  const apiKey = appSettings?.backlog_api_key ?? profile.backlog_api_key ?? ''
  if (!spaceId || !apiKey) return null
  return { spaceId, apiKey }
}

export default function BacklogPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    if (!isAppEnabled('backlog')) {
      router.replace('/')
      return
    }

    const creds = getBacklogCredentials()
    if (!creds) {
      setConfigured(false)
      setLoading(false)
      return
    }

    setConfigured(true)

    fetch('/api/tasks/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId: creds.spaceId, apiKey: creds.apiKey }),
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
        <h1 className="text-lg font-semibold tracking-tight">Backlog</h1>
        {tasks.length > 0 && (
          <span className="ml-auto text-xs text-zinc-500">{tasks.length} 件</span>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
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
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">担当課題はありません</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ul className="divide-y divide-zinc-800">
              {tasks.map((task) => (
                <li key={task.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                        STATUS_COLOR[task.status]
                      }`}
                    >
                      {STATUS_LABEL[task.status]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 leading-snug">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {task.externalRef?.url ? (
                          <a
                            href={task.externalRef.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
                          >
                            {task.externalRef.key}
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-500">{task.externalRef?.key}</span>
                        )}
                        {task.dueDate && (
                          <span
                            className={`text-xs ${
                              task.dueDate < new Date().toISOString().split('T')[0]
                                ? 'text-red-400'
                                : 'text-zinc-500'
                            }`}
                          >
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
    </div>
  )
}
