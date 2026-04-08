import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getRecentDates } from '@/domains/journal'

export default function CalendarPage() {
  const router = useRouter()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-indexed
  const [journalDates, setJournalDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentDates(365)
      .then((dates) => setJournalDates(new Set(dates)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
    if (!isCurrentMonth) {
      if (month === 12) {
        setYear((y) => y + 1)
        setMonth(1)
      } else {
        setMonth((m) => m + 1)
      }
    }
  }

  // カレンダーのセルを構築
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0=日曜日
  const daysInMonth = new Date(year, month, 0).getDate()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dateStr <= todayStr) {
      router.push(`/diary?date=${dateStr}`)
    }
  }

  const journalCountThisMonth = Array.from(journalDates).filter((d) =>
    d.startsWith(`${year}-${String(month).padStart(2, '0')}`)
  ).length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-lg font-semibold tracking-tight">カレンダー</h1>
      </header>

      <main className="max-w-md mx-auto px-6 py-10">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={prevMonth}
            className="text-zinc-400 hover:text-zinc-100 transition-colors text-2xl w-10 h-10 flex items-center justify-center"
          >
            ‹
          </button>
          <div className="text-center">
            <h2 className="text-base font-semibold">
              {year}年{month}月
            </h2>
            {!loading && journalCountThisMonth > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {journalCountThisMonth}件の記録
              </p>
            )}
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="text-zinc-400 hover:text-zinc-100 transition-colors text-2xl w-10 h-10 flex items-center justify-center disabled:opacity-30"
          >
            ›
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs py-2 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-zinc-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === todayStr
            const isFuture = dateStr > todayStr
            const hasJournal = journalDates.has(dateStr)
            const dow = (firstDayOfWeek + (day - 1)) % 7 // 曜日 0=日

            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && handleDayClick(day)}
                disabled={isFuture}
                className={[
                  'aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all',
                  isToday
                    ? 'bg-zinc-100 text-zinc-900 font-bold'
                    : hasJournal
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 cursor-pointer'
                    : isFuture
                    ? 'text-zinc-700 cursor-default'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer',
                  !isToday && !isFuture && dow === 0 ? 'text-red-400 hover:text-red-300' : '',
                  !isToday && !isFuture && dow === 6 ? 'text-blue-400 hover:text-blue-300' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>{day}</span>
                {hasJournal && !isToday && (
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />
                )}
              </button>
            )
          })}
        </div>

        {!loading && (
          <p className="mt-6 text-xs text-zinc-600 text-center">
            日付をクリックで日記へ ／ 緑ドット = 記録あり
          </p>
        )}
      </main>
    </div>
  )
}
