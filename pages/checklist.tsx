import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  getDailyTaskTemplate,
  getPillars,
  getTodayChecklist,
  saveTodayChecklist,
} from '@/domains/task'
import type { DailyChecklist, ChecklistItem } from '@/shared/types'

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

export default function ChecklistPage() {
  const router = useRouter()
  const today = getTodayDateString()

  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [pillars, setPillars] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [template, pillarItems] = await Promise.all([
          getDailyTaskTemplate(),
          getPillars(),
        ])
        setChecklist(getTodayChecklist(today, template))
        setPillars(pillarItems)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  function toggleItem(id: string) {
    if (!checklist) return
    const updated: DailyChecklist = {
      ...checklist,
      items: checklist.items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }
    setChecklist(updated)
    saveTodayChecklist(updated)
  }

  const completedCount = checklist?.items.filter((i) => i.completed).length ?? 0
  const totalCount = checklist?.items.length ?? 0
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const allDone = totalCount > 0 && completedCount === totalCount

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-lg font-semibold tracking-tight">チェックリスト</h1>
        <span className="ml-auto text-xs text-zinc-500">{today}</span>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        {loading ? (
          <p className="text-zinc-500 text-sm">読み込み中...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 進捗 */}
            {totalCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-zinc-400">
                    {allDone ? '🎉 今日も完了！' : '本日の進捗'}
                  </p>
                  <p className="text-sm font-semibold">
                    {completedCount} / {totalCount}
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      allDone ? 'bg-emerald-400' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* デイリータスク */}
            {checklist && checklist.items.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
                  デイリータスク
                </h2>
                <ul className="space-y-3">
                  {checklist.items.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="flex items-center gap-3 cursor-pointer group select-none"
                    >
                      <span
                        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          item.completed
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-zinc-600 group-hover:border-zinc-400'
                        }`}
                      >
                        {item.completed && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M1.5 5l2.5 2.5 4.5-5"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`text-sm transition-colors ${
                          item.completed ? 'line-through text-zinc-600' : 'text-zinc-200'
                        }`}
                      >
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3つの柱 */}
            {pillars.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
                  3つの柱
                </h2>
                <ul className="space-y-2">
                  {pillars.map((p, i) => (
                    <li key={p.id} className="flex items-start gap-3">
                      <span className="text-xs font-bold text-zinc-500 mt-0.5 w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-zinc-300">{p.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {totalCount === 0 && pillars.length === 0 && (
              <div className="text-center py-16">
                <p className="text-zinc-500 text-sm">タスクがまだありません</p>
                <p className="text-zinc-600 text-xs mt-2">
                  データリポジトリの config.json に dailyTasks を追加してください
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
