// ============================================================
// CalendarProvider — stub（ADR-008 / ADR-009）
// Google Calendar 連携の将来実装プレースホルダ
// isConfigured() = false のため Orchestrator には組み込まれない
// ============================================================

import type { UnifiedTask, TaskQuery } from '@/shared/types'
import type { TaskIntegrationProvider } from './interface'

export class CalendarProvider implements TaskIntegrationProvider {
  readonly sourceId = 'calendar' as const

  isConfigured(): boolean {
    return false // TODO: Google Calendar OAuth 設定が完了したら実装する
  }

  async fetchTasks(_query: TaskQuery): Promise<UnifiedTask[]> {
    return [] // TODO: Google Calendar API 呼び出しを実装する
  }
}
