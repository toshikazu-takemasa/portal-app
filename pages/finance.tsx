import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  getMonthRecords,
  saveRecord,
  deleteRecord,
  getCurrentYearMonth,
  generateId,
} from '@/domains/finance'
import { appendToJournal, buildFinanceReflectionMarkdown } from '@/domains/journal'
import { isAppEnabled } from '@/profiles'
import type { FinanceRecord, FinanceType } from '@/shared/types'

export default function FinancePage() {
  const router = useRouter()
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [records, setRecords] = useState<FinanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reflecting, setReflecting] = useState(false)
  const [reflected, setReflected] = useState(false)

  const [form, setForm] = useState({
    date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }),
    type: 'expense' as FinanceType,
    category: '',
    amount: '',
    note: '',
  })

  // finance 機能が無効なら TOP へ
  useEffect(() => {
    if (!isAppEnabled('finance')) {
      router.replace('/')
    }
  }, [router])

  useEffect(() => {
    loadRecords()
  }, [yearMonth])

  async function loadRecords() {
    setLoading(true)
    setError('')
    try {
      const data = await getMonthRecords(yearMonth)
      setRecords(data.sort((a, b) => b.date.localeCompare(a.date)))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!form.category.trim() || !form.amount) return
    setSaving(true)
    setError('')
    try {
      const record: FinanceRecord = {
        id: generateId(),
        date: form.date,
        type: form.type,
        category: form.category.trim(),
        amount: Math.round(parseFloat(form.amount)),
        note: form.note.trim() || undefined,
      }
      await saveRecord(record, yearMonth)
      setRecords((prev) =>
        [record, ...prev].sort((a, b) => b.date.localeCompare(a.date))
      )
      setForm((f) => ({ ...f, category: '', amount: '', note: '' }))
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setError('')
    try {
      await deleteRecord(id, yearMonth)
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      setError(String(e))
    }
  }

  /** UC-10: 当日の家計記録を日記に反映する（リセットなし） */
  async function handleReflect() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const todayRecords = records.filter((r) => r.date === today)
    setReflecting(true)
    setError('')
    try {
      const snippet = buildFinanceReflectionMarkdown(yearMonth, todayRecords)
      await appendToJournal(today, snippet)
      setReflected(true)
      setTimeout(() => setReflected(false), 2500)
    } catch (e) {
      setError(String(e))
    } finally {
      setReflecting(false)
    }
  }

  function shiftMonth(delta: number) {
    const [y, m] = yearMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (next <= getCurrentYearMonth()) setYearMonth(next)
  }

  const totalIncome = records
    .filter((r) => r.type === 'income')
    .reduce((s, r) => s + r.amount, 0)
  const totalExpense = records
    .filter((r) => r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0)
  const balance = totalIncome - totalExpense

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-base font-semibold tracking-tight">家計管理</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">
        {/* 月ナビゲーション */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => shiftMonth(-1)}
            className="text-zinc-400 hover:text-zinc-100 text-xl w-8"
          >
            ‹
          </button>
          <span className="text-base font-semibold">{yearMonth}</span>
          <button
            onClick={() => shiftMonth(1)}
            disabled={yearMonth >= getCurrentYearMonth()}
            className="text-zinc-400 hover:text-zinc-100 text-xl w-8 disabled:opacity-30"
          >
            ›
          </button>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 mb-1">収入</p>
            <p className="text-lg font-semibold text-emerald-400">
              ¥{totalIncome.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 mb-1">支出</p>
            <p className="text-lg font-semibold text-red-400">
              ¥{totalExpense.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 mb-1">収支</p>
            <p
              className={`text-lg font-semibold ${
                balance >= 0 ? 'text-zinc-100' : 'text-red-400'
              }`}
            >
              ¥{balance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 記録追加フォーム */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
            記録を追加
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as FinanceType }))
                }
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
              >
                <option value="expense">支出</option>
                <option value="income">収入</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="カテゴリ（食費、交通費...）"
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="金額"
                min="0"
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="メモ（任意）"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <div className="flex items-center gap-4">
              <button
                onClick={handleAdd}
                disabled={saving || !form.category.trim() || !form.amount}
                className="rounded-full bg-zinc-100 text-zinc-900 px-5 py-2 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '追加'}
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </div>
        </div>

        {/* 記録一覧 */}
        {loading ? (
          <p className="text-zinc-500 text-sm">読み込み中...</p>
        ) : records.length > 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ul className="divide-y divide-zinc-800">
              {records.map((r) => (
                <li key={r.id} className="flex items-center px-5 py-3 gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      r.type === 'income'
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : 'bg-red-900/60 text-red-300'
                    }`}
                  >
                    {r.type === 'income' ? '収入' : '支出'}
                  </span>
                  <span className="text-xs text-zinc-500 w-24 shrink-0">{r.date}</span>
                  <span className="text-sm text-zinc-200 flex-1 min-w-0 truncate">
                    {r.category}
                    {r.note && (
                      <span className="text-zinc-500 ml-2 text-xs">{r.note}</span>
                    )}
                  </span>
                  <span
                    className={`text-sm font-semibold shrink-0 ${
                      r.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {r.type === 'income' ? '+' : '-'}¥{r.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-zinc-700 hover:text-zinc-400 transition-colors text-xs shrink-0"
                    title="削除"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-zinc-500 text-sm">この月の記録がありません</p>
          </div>
        )}
      </main>

      {/* Footer — 固定 */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-3">
        {reflected && <span className="text-xs text-emerald-400">✓ 日記に反映しました</span>}
        {error && <p className="text-xs text-red-400 truncate max-w-48">{error}</p>}
        <div className="flex-1" />
        <button
          onClick={handleReflect}
          disabled={reflecting || loading}
          className="rounded-full bg-zinc-800 text-zinc-100 px-4 py-2 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40"
        >
          {reflecting ? '反映中...' : '日記に反映'}
        </button>
      </footer>
    </div>
  )
}
