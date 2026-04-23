// ============================================================
// Domain: Finance
// UC-06: 家計を記録する（個人プロファイルのみ）
// データは vault/finance/YYYY-MM.json に保存する
// ============================================================

import { createStorageAdapter } from '@/profiles'
import type { FinanceRecord } from '@/shared/types'

/** 指定月の家計記録を取得する */
export async function getMonthRecords(yearMonth: string): Promise<FinanceRecord[]> {
  try {
    if (typeof window === 'undefined') return []
    const adapter = createStorageAdapter()
    const path = `vault/finance/${yearMonth}.json`
    const result = await adapter.getFile(path)
    if (!result) return []
    const data = JSON.parse(result.content)
    return Array.isArray(data) ? data : (data.records ?? [])
  } catch {
    return []
  }
}

/** 家計記録を追加・更新する */
export async function saveRecord(record: FinanceRecord, yearMonth: string): Promise<void> {
  if (typeof window === 'undefined') return
  const adapter = createStorageAdapter()
  const path = `vault/finance/${yearMonth}.json`

  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await adapter.getFile(path)
    let records: FinanceRecord[] = []
    let sha: string | undefined = undefined

    if (existing) {
      sha = existing.sha
      try {
        const data = JSON.parse(existing.content)
        records = Array.isArray(data) ? data : (data.records ?? [])
      } catch {}
    }

    // ID で上書きまたは新規追加
    const idx = records.findIndex((r) => r.id === record.id)
    if (idx !== -1) {
      records[idx] = record
    } else {
      records.push(record)
    }

    try {
      await adapter.saveFile(path, JSON.stringify(records, null, 2), sha)
      return
    } catch (e) {
      if (attempt === 0 && String(e).includes('409')) continue
      throw e
    }
  }
}

/** 家計記録を削除する */
export async function deleteRecord(id: string, yearMonth: string): Promise<void> {
  if (typeof window === 'undefined') return
  const adapter = createStorageAdapter()
  const path = `vault/finance/${yearMonth}.json`

  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await adapter.getFile(path)
    if (!existing) return

    let records: FinanceRecord[] = []
    try {
      const data = JSON.parse(existing.content)
      records = Array.isArray(data) ? data : (data.records ?? [])
    } catch {
      return
    }

    const newRecords = records.filter((r) => r.id !== id)
    if (newRecords.length === records.length) return

    try {
      await adapter.saveFile(path, JSON.stringify(newRecords, null, 2), existing.sha)
      return
    } catch (e) {
      if (attempt === 0 && String(e).includes('409')) continue
      throw e
    }
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
