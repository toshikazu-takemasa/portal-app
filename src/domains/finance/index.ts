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

/** 指定月の家計記録を取得する */
export async function getMonthRecords(yearMonth: string): Promise<FinanceRecord[]> {
  const adapter = createStorageAdapter()
  const file = await adapter.getFile(getFinancePath(yearMonth))
  if (!file) return []
  try {
    return JSON.parse(file.content) as FinanceRecord[]
  } catch {
    return []
  }
}

/** 家計記録を追加・更新する */
export async function saveRecord(record: FinanceRecord, yearMonth: string): Promise<void> {
  const adapter = createStorageAdapter()
  const path = getFinancePath(yearMonth)
  const file = await adapter.getFile(path)
  const records: FinanceRecord[] = file
    ? (() => {
      try {
        return JSON.parse(file.content) as FinanceRecord[]
      } catch {
        return []
      }
    })()
    : []

  const idx = records.findIndex((r) => r.id === record.id)
  if (idx >= 0) {
    records[idx] = record
  } else {
    records.push(record)
  }

  await adapter.saveFile(path, JSON.stringify(records, null, 2), file?.sha)
}

/** 家計記録を削除する */
export async function deleteRecord(id: string, yearMonth: string): Promise<void> {
  const adapter = createStorageAdapter()
  const path = getFinancePath(yearMonth)
  const file = await adapter.getFile(path)
  if (!file) return

  let records: FinanceRecord[] = []
  try {
    records = JSON.parse(file.content) as FinanceRecord[]
  } catch {
    return
  }

  const filtered = records.filter((r) => r.id !== id)
  await adapter.saveFile(path, JSON.stringify(filtered, null, 2), file.sha)
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
