// ============================================================
// Domain: Finance
// UC-06: 家計を記録する（個人プロファイルのみ）
// データは vault/finance/YYYY-MM.json に保存する
// ============================================================

import { createStorageAdapter, getSettings } from '@/profiles'
import type { FinanceRecord } from '@/shared/types'

function getFinancePath(yearMonth: string): string {
  const profile = getSettings()
  return `${profile.vault_path}/finance/${yearMonth}.json`
}

/** 指定月の家計記録を取得する (DB経由) */
export async function getMonthRecords(yearMonth: string): Promise<FinanceRecord[]> {
  try {
    if (typeof window === 'undefined') return []
    const res = await fetch(`/api/finance/records?yearMonth=${yearMonth}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/** 家計記録を追加・更新する (DB経由) */
export async function saveRecord(record: FinanceRecord, yearMonth: string): Promise<void> {
  if (typeof window === 'undefined') return
  const res = await fetch('/api/finance/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record, yearMonth })
  })
  if (!res.ok) {
    throw new Error('保存に失敗しました')
  }
}

/** 家計記録を削除する (DB経由) */
export async function deleteRecord(id: string, yearMonth: string): Promise<void> {
  if (typeof window === 'undefined') return
  const res = await fetch(`/api/finance/records?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    throw new Error('削除に失敗しました')
  }
}

/** 現在の年月文字列 (YYYY-MM) */
export function getCurrentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** ユニーク ID を生成する */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
