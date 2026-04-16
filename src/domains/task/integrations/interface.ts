// ============================================================
// TaskIntegrationProvider Interface（ADR-009）
// 外部連携プロバイダの統一契約
// Backlog / Google Calendar / GitHub Issues はこのインターフェースを実装する
// StorageAdapter とは分離し、外部 SaaS 呼び出し専用に使う
// ============================================================

import type { UnifiedTask, UnifiedTaskSource, TaskQuery } from '@/shared/types'

export interface TaskIntegrationProvider {
  /** このプロバイダが提供するタスクソースID */
  readonly sourceId: UnifiedTaskSource
  /** 認証情報が設定済みで呼び出し可能な状態かを返す */
  isConfigured(): boolean
  /** 指定されたクエリ条件に合致するタスク一覧を UnifiedTask[] で返す */
  fetchTasks(query: TaskQuery): Promise<UnifiedTask[]>
}
