import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  getJournalByDate,
  saveJournalEntry,
  getRecentDates,
  getTodayDateString,
} from '@/domains/journal'
import { summarizeJournal } from '@/domains/ai'
import { isFeatureEnabled } from '@/profiles'
import type { JournalEntry } from '@/shared/types'

export default function DiaryPage() {
  const router = useRouter()
  const todayStr = getTodayDateString()

  const [date, setDate] = useState(todayStr)
  const [content, setContent] = useState('')
  const [sha, setSha] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [recentDates, setRecentDates] = useState<string[]>([])
  const [summarizing, setSummarizing] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [aiAvailable, setAiAvailable] = useState(false)

  // クエリパラメータ ?date= で初期日付を設定
  useEffect(() => {
    if (router.isReady && router.query.date && typeof router.query.date === 'string') {
      setDate(router.query.date)
    }
  }, [router.isReady, router.query.date])

  // AI機能が使えるか確認
  useEffect(() => {
    const profile = getSettings()
    setAiAvailable(isFeatureEnabled('ai_summary'))
  }, [])

  // 最近の日付一覧を取得
  useEffect(() => {
    getRecentDates(60)
      .then(setRecentDates)
      .catch(() => {})
  }, [])

  // 日付変更時に日記を読み込む
  useEffect(() => {
    setLoading(true)
    setContent('')
    setSha(undefined)
    setSaved(false)
    setSummary('')
    setError('')

    getJournalByDate(date)
      .then((entry) => {
        if (entry) {
          setContent(entry.content)
          setSha(entry.sha)
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [date])

  function prevDate() {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    setDate(d.toISOString().split('T')[0])
  }

  function nextDate() {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    const next = d.toISOString().split('T')[0]
    if (next <= todayStr) setDate(next)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const entry: JournalEntry = {
        date,
        content,
        profile: getActiveProfileId(),
        sha,
      }
      await saveJournalEntry(entry)
      setSaved(true)
      // sha を更新するために再読み込み
      const updated = await getJournalByDate(date)
      if (updated?.sha) setSha(updated.sha)
      // 最近の日付を更新
      getRecentDates(60).then(setRecentDates).catch(() => {})
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleSummarize() {
    if (!content.trim()) return
    setSummarizing(true)
    setSummary('')
    setError('')
    try {
      const result = await summarizeJournal(content)
      setSummary(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setSummarizing(false)
    }
  }

  const canGoNext = date < todayStr
  const isToday = date === todayStr

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-lg font-semibold tracking-tight">日記</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: 最近の日付 */}
        <aside className="hidden md:flex flex-col w-44 border-r border-zinc-800 overflow-y-auto shrink-0 py-3">
          <p className="text-xs text-zinc-600 uppercase tracking-wider px-4 mb-2">最近の記録</p>
          <ul className="space-y-0.5 px-2">
            {recentDates.map((d) => (
              <li key={d}>
                <button
                  onClick={() => setDate(d)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                    d === date
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  {d}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 日付ナビゲーション */}
          <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3 shrink-0">
            <button
              onClick={prevDate}
              className="text-zinc-400 hover:text-zinc-100 transition-colors w-6 text-center text-xl leading-none"
            >
              ‹
            </button>
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="bg-transparent text-zinc-100 text-sm border-none outline-none cursor-pointer"
            />
            <button
              onClick={nextDate}
              disabled={!canGoNext}
              className="text-zinc-400 hover:text-zinc-100 transition-colors w-6 text-center text-xl leading-none disabled:opacity-30"
            >
              ›
            </button>
            {isToday && (
              <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">今日</span>
            )}
          </div>

          {/* エディタ */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {loading ? (
              <p className="text-zinc-500 text-sm">読み込み中...</p>
            ) : (
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setSaved(false)
                }}
                placeholder={`${date} の記録を書く...\n\n今日は何がありましたか？`}
                className="w-full flex-1 min-h-[280px] bg-transparent text-zinc-100 text-sm leading-relaxed resize-none outline-none placeholder-zinc-700 font-sans"
              />
            )}

            {/* AI サマリー結果 */}
            {summary && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                  AI フィードバック
                </p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {summary}
                </p>
              </div>
            )}
          </div>

          {/* フッター: アクション */}
          <div className="border-t border-zinc-800 px-6 py-4 flex items-center gap-3 shrink-0">
            {error ? (
              <p className="text-xs text-red-400 flex-1 truncate">{error}</p>
            ) : (
              <div className="flex-1" />
            )}

            {aiAvailable && content.trim() && (
              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {summarizing ? '生成中...' : '🤖 AIフィードバック'}
              </button>
            )}

            {saved && (
              <span className="text-xs text-emerald-400 whitespace-nowrap">✓ 保存しました</span>
            )}

            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-full bg-zinc-100 text-zinc-900 px-5 py-2 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
