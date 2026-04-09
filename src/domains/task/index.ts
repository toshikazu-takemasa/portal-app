// ============================================================
// Domain: Task
// UC-05: チェックリストを完了状態で保存する
// dailyTasks / pillars は PortalConfig (GitHub) から読む
// 日次の完了状態は localStorage に保存する
// ============================================================

import { createStorageAdapter, getActiveProfileId } from '@/profiles'
import type { ChecklistItem, DailyChecklist } from '@/shared/types'

const CHECKLIST_PREFIX = 'daily_checklist_'

/** デイリータスクのテンプレートを PortalConfig から取得する */
export async function getDailyTaskTemplate(): Promise<ChecklistItem[]> {
  const adapter = createStorageAdapter()
  const config = await adapter.getPortalConfig()
  return config.dailyTasks ?? []
}

/** 3つの柱を PortalConfig から取得する */
export async function getPillars(): Promise<ChecklistItem[]> {
  const adapter = createStorageAdapter()
  const config = await adapter.getPortalConfig()
  return config.pillars ?? []
}

/** 指定日のチェックリストを localStorage から取得する（なければ template から初期化） */
export function getTodayChecklist(date: string, template: ChecklistItem[]): DailyChecklist {
  if (typeof window === 'undefined') {
    return {
      date,
      items: template.map((t) => ({ ...t, completed: false })),
      profile: getSettings().id,
    }
  }

  const key = CHECKLIST_PREFIX + date
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DailyChecklist
      // テンプレートに新しいアイテムが追加された場合はマージ
      const existingIds = new Set(parsed.items.map((i) => i.id))
      const newItems = template
        .filter((t) => !existingIds.has(t.id))
        .map((t) => ({ ...t, completed: false }))
      return {
        ...parsed,
        items: [...parsed.items, ...newItems],
      }
    } catch {
      // fall through to initialize
    }
  }

  return {
    date,
    items: template.map((t) => ({ ...t, completed: false })),
    profile: getSettings().id,
  }
}

/** チェックリストを localStorage に保存する */
export function saveTodayChecklist(checklist: DailyChecklist): void {
  if (typeof window === 'undefined') return
  const key = CHECKLIST_PREFIX + checklist.date
  localStorage.setItem(key, JSON.stringify(checklist))
}
