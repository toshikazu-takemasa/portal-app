// ============================================================
// GithubProvider — stub（ADR-008 / ADR-009）
// GitHub Issues 連携の将来実装プレースホルダ
// isConfigured() = false のため Orchestrator には組み込まれない
// StorageAdapter（GitHub Contents API）とは別物:
//   StorageAdapter → 日記・設定ファイルの読み書き
//   GithubProvider → Issues の read-only 取得（将来実装）
// ============================================================

import type { UnifiedTask, TaskQuery } from '@/shared/types'
import type { TaskIntegrationProvider } from './interface'

export class GithubProvider implements TaskIntegrationProvider {
  readonly sourceId = 'github' as const

  isConfigured(): boolean {
    return false // TODO: GitHub Issues 設定が完了したら実装する
  }

  async fetchTasks(_query: TaskQuery): Promise<UnifiedTask[]> {
    return [] // TODO: GitHub Issues API 呼び出しを実装する
  }
}
