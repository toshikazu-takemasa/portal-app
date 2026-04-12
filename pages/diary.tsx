import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  getJournalByDate,
  saveJournalEntry,
  getRecentDates,
  getTodayDateString,
} from '@/domains/journal'
import { summarizeJournal } from '@/domains/ai'
import { isAppEnabled } from '@/profiles'
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

  useEffect(() => {
    if (router.isReady && router.query.date && typeof router.query.date === 'string') {
      setDate(router.query.date)
    }
  }, [router.isReady, router.query.date])

  useEffect(() => {
    setAiAvailable(isAppEnabled('chat'))
  }, [])

  useEffect(() => {
    getRecentDates(60).then(setRecentDates).catch(() => {})
  }, [])

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
    setDate(d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }))
  }

  function nextDate() {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    const next = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    if (next <= todayStr) setDate(next)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const entry: JournalEntry = { date, content, sha }
      await saveJournalEntry(entry)
      setSaved(true)
      const updated = await getJournalByDate(date)
      if (updated?.sha) setSha(updated.sha)
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
      {/* Header — シンプル（タイトル＋日付ナビのみ） */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm shrink-0"
        >
          ← 戻る
        </button>
        <h1 className="text-base font-semibold tracking-tight shrink-0">日記</h1>

        {/* 日付ナビゲーション */}
        <div className="flex items-center gap-1 flex-1 justify-center">
          <button
            onClick={prevDate}
            className="text-zinc-400 hover:text-zinc-100 transition-colors w-7 text-center text-xl leading-none"
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            max={todayStr}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="bg-transparent text-zinc-100 text-sm border-none outline-none cursor-pointer text-center"
          />
          <button
            onClick={nextDate}
            disabled={!canGoNext}
            className="text-zinc-400 hover:text-zinc-100 transition-colors w-7 text-center text-xl leading-none disabled:opacity-30"
          >
            ›
          </button>
          {isToday && (
            <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">今日</span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: 最近の日付（md以上のみ） */}
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

        {/* Main: エディタ */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 pb-24 flex flex-col gap-4">
            {loading ? (
              <p className="text-zinc-500 text-sm">読み込み中...</p>
            ) : (
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setSaved(false)
                }}
                placeholder={`${date} の記録を書く...`}
                className="w-full flex-1 min-h-[60dvh] bg-transparent text-zinc-100 text-sm leading-relaxed resize-none outline-none placeholder-zinc-700 font-sans"
              />
            )}

            {summary && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">AI フィードバック</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{summary}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer — 固定（保存・AIフィードバック） */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-3">
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
      </footer>
    </div>
  )
}
