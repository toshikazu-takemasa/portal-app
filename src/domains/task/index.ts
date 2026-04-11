// ============================================================
// Domain: Task — Public Index（ADR-008）
// このファイルは re-export 専用。ロジックはサブモジュールに置く。
//
// サブモジュール構成:
//   checklist.ts        dailyTasks / pillars の取得・完了状態管理
//   orchestrator.ts     複数ソースの統合（UnifiedTask）
//   integrations/
//     interface.ts      TaskIntegrationProvider 契約
//     backlog.ts        BacklogProvider
//     calendar.ts       CalendarProvider（stub）
//     github.ts         GithubProvider（stub）
// ============================================================

// checklist サブモジュール（後方互換: 既存 import '@/domains/task' を維持）
export {
  getDailyTaskTemplate,
  getPillars,
  getTodayChecklist,
  saveTodayChecklist,
  getDailyTasksAsUnified,
} from './checklist'

// orchestrator
export { getTodayTasks } from './orchestrator'

// integrations（Provider クラスを使いたい場合はサブパスから直接 import も可）
export type { TaskIntegrationProvider } from './integrations/interface'
export { BacklogProvider, getBacklogIssues, getBacklogCredentials } from './integrations/backlog'
export type { BacklogIssue } from './integrations/backlog'
export { CalendarProvider } from './integrations/calendar'
export { GithubProvider } from './integrations/github'
