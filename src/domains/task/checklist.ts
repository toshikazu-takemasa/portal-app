// ============================================================
// Domain: Task — Checklist Submodule（ADR-008）
// dailyTasks / pillars の取得・完了状態管理
// テンプレートは GitHub (PortalConfig) から、完了状態は localStorage に保存する
// ============================================================

import { createStorageAdapter } from '@/profiles'
import type { ChecklistItem, DailyChecklist, UnifiedTask } from '@/shared/types'

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
    }
  }

  const key = CHECKLIST_PREFIX + date
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DailyChecklist
      // テンプレート (Vault) をマスターとし、ローカルキャッシュから完了状態のみをマージする (ADR-015)
      const cachedStatus = new Map(parsed.items.map((i) => [i.id, i.completed] as const))
      const mergedItems = template.map((t) => ({
        ...t,
        completed: cachedStatus.get(t.id) ?? false,
      }))
      return {
        ...parsed,
        items: mergedItems,
      }
    } catch {
      // fall through to initialize
    }
  }

  return {
    date,
    items: template.map((t) => ({ ...t, completed: false })),
  }
}

/** チェックリストを localStorage に保存する */
export function saveTodayChecklist(checklist: DailyChecklist): void {
  if (typeof window === 'undefined') return
  const key = CHECKLIST_PREFIX + checklist.date
  localStorage.setItem(key, JSON.stringify(checklist))
}

/** 今日のデイリータスクを UnifiedTask[] として返す（ADR-008: Orchestrator 向け） */
export async function getDailyTasksAsUnified(): Promise<UnifiedTask[]> {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const template = await getDailyTaskTemplate()
  const checklist = getTodayChecklist(today, template)
  return checklist.items.map((item) => ({
    id: `daily-${item.id}`,
    source: 'daily' as const,
    title: item.title,
    status: item.completed ? ('completed' as const) : ('open' as const),
  }))
}
