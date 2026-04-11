// ============================================================
// Task Orchestrator（ADR-008）
// 複数ソース（daily / backlog / calendar / github）を統合して
// UnifiedTask[] を返す
// Promise.allSettled で1ソース障害が他のソースに波及しない設計
// ============================================================

import type { UnifiedTask, TaskQuery } from '@/shared/types'
import type { TaskIntegrationProvider } from './integrations/interface'
import { getDailyTasksAsUnified } from './checklist'

/**
 * 今日のタスクを全ソースから取得して統合する
 * @param query  ソース絞り込みや日付指定
 * @param providers  外部連携プロバイダ一覧（省略時は空＝daily のみ）
 */
export async function getTodayTasks(
  query: TaskQuery = {},
  providers: TaskIntegrationProvider[] = []
): Promise<UnifiedTask[]> {
  const requestedSources = query.sources
  const tasks: UnifiedTask[] = []

  // daily tasks（localStorage + GitHub テンプレート）
  if (!requestedSources || requestedSources.includes('daily')) {
    const daily = await getDailyTasksAsUnified()
    tasks.push(...daily)
  }

  // 外部連携プロバイダ（設定済み・リクエストソースに合致するものだけ呼ぶ）
  const activeProviders = providers.filter(
    (p) =>
      p.isConfigured() &&
      (!requestedSources || requestedSources.includes(p.sourceId))
  )

  const results = await Promise.allSettled(
    activeProviders.map((p) => p.fetchTasks(query))
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      tasks.push(...result.value)
    }
    // rejected は無視（UIへのエラー伝達は呼び出し側で Provider.isConfigured() 等で判断）
  }

  // ソート: open/in_progress → resolved → completed の順、同ステータス内は期限昇順
  const statusOrder: Record<UnifiedTask['status'], number> = {
    open: 0,
    in_progress: 1,
    resolved: 2,
    completed: 3,
  }

  return tasks.sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    const aDue = a.dueDate ?? '9999-12-31'
    const bDue = b.dueDate ?? '9999-12-31'
    return aDue.localeCompare(bDue)
  })
}
