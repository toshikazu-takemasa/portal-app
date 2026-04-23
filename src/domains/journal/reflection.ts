// ============================================================
// Domain: Journal — Reflection Formatter（ADR-012）
// UC-09: タスク情報を日記に反映する
// UC-10: 家計記録を日記に反映する
//
// 純粋な変換関数のみ。@/shared/types のみ import。
// データ取得は呼び出し元（pages/diary.tsx）が行う。
// ============================================================

import type { UnifiedTask, FinanceRecord } from '@/shared/types'

const PRIORITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const SOURCE_HEADING: Record<string, string> = {
  daily: 'チェックリスト',
  backlog: 'Backlog',
  github: 'GitHub Issues',
  calendar: 'カレンダー',
}

/**
 * UnifiedTask[] を日記用 Markdown スニペットに変換する
 * ソースごとに見出しを分けて列挙する
 */
export function buildTaskReflectionMarkdown(
  date: string,
  tasks: UnifiedTask[],
  options: { header?: string } = {}
): string {
  const header = options.header ?? `## タスク（${date}）`
  if (tasks.length === 0) {
    return `\n---\n\n${header}\n\n記録なし\n`
  }

  // ソースごとにグループ化
  const groups: Record<string, UnifiedTask[]> = {}
  for (const task of tasks) {
    if (!groups[task.source]) groups[task.source] = []
    groups[task.source].push(task)
  }

  const sourceOrder: UnifiedTask['source'][] = ['daily', 'backlog', 'github', 'calendar']
  const lines: string[] = [`\n---\n\n${header}\n`]

  for (const source of sourceOrder) {
    const items = groups[source]
    if (!items || items.length === 0) continue

    lines.push(`\n### ${SOURCE_HEADING[source] ?? source}\n`)
    for (const task of items) {
      const checked = task.status === 'completed' || task.status === 'resolved' ? 'x' : ' '
      const key = task.externalRef?.key ? `${task.externalRef.key}: ` : ''
      const priority = task.priority ? `（${PRIORITY_LABEL[task.priority] ?? task.priority}）` : ''
      const due = task.dueDate ? ` [期限: ${task.dueDate}]` : ''
      lines.push(`- [${checked}] ${key}${task.title}${priority}${due}`)
    }
  }

  return lines.join('\n')
}

/**
 * FinanceRecord[] を日記用 Markdown スニペットに変換する
 * 当月の記録を表形式で列挙し、収支サマリーを末尾に追加する
 */
export function buildFinanceReflectionMarkdown(yearMonth: string, records: FinanceRecord[]): string {
  if (records.length === 0) {
    return `\n---\n\n## 家計（${yearMonth}）\n\n記録なし\n`
  }

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))

  const tableRows = sorted.map((r) => {
    const mmdd = r.date.slice(5).replace('-', '/')
    const typeLabel = r.type === 'income' ? '収入' : '支出'
    const amount = `¥${r.amount.toLocaleString()}`
    const note = r.note ?? ''
    return `| ${mmdd} | ${typeLabel} | ${r.category} | ${amount} | ${note} |`
  })

  const totalIncome = records.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalExpense = records.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const balance = totalIncome - totalExpense
  const balanceStr = balance >= 0 ? `+¥${balance.toLocaleString()}` : `-¥${Math.abs(balance).toLocaleString()}`

  const lines = [
    `\n---\n\n## 家計（${yearMonth}）\n`,
    '| 日付 | 種別 | カテゴリ | 金額 | メモ |',
    '|------|------|---------|------|------|',
    ...tableRows,
    '',
    `収入: ¥${totalIncome.toLocaleString()} / 支出: ¥${totalExpense.toLocaleString()} / 収支: ${balanceStr}`,
  ]

  return lines.join('\n')
}
