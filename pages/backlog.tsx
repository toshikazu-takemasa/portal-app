import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getBacklogIssues } from '@/domains/ai'
import { isFeatureEnabled, getActiveProfile } from '@/profiles'
import type { BacklogIssue } from '@/domains/ai'

const STATUS_COLOR: Record<string, string> = {
  未対応: 'bg-zinc-700 text-zinc-300',
  処理中: 'bg-blue-900/60 text-blue-300',
  処理済み: 'bg-emerald-900/60 text-emerald-300',
  完了: 'bg-zinc-800 text-zinc-500',
}

export default function BacklogPage() {
  const router = useRouter()
  const [issues, setIssues] = useState<BacklogIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    if (!isFeatureEnabled('backlog')) {
      router.replace('/')
      return
    }

    const profile = getActiveProfile()
    const spaceId = profile.backlog_space_id
    const apiKey = profile.backlog_api_key

    if (!spaceId || !apiKey) {
      setConfigured(false)
      setLoading(false)
      return
    }

    setConfigured(true)
    getBacklogIssues(spaceId, apiKey)
      .then(setIssues)
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
        {issues.length > 0 && (
          <span className="ml-auto text-xs text-zinc-500">{issues.length} 件</span>
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
        ) : issues.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">担当課題はありません</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ul className="divide-y divide-zinc-800">
              {issues.map((issue) => (
                <li key={issue.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                        STATUS_COLOR[issue.status.name] ?? 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {issue.status.name}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 leading-snug">{issue.summary}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-zinc-500">{issue.issueKey}</span>
                        {issue.dueDate && (
                          <span
                            className={`text-xs ${
                              issue.dueDate < new Date().toISOString().split('T')[0]
                                ? 'text-red-400'
                                : 'text-zinc-500'
                            }`}
                          >
                            期限: {issue.dueDate.split('T')[0]}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">
                          優先度: {issue.priority.name}
                        </span>
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
