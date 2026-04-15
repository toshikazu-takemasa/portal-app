// Backlog API 動作確認スクリプト（Next.js docs 推奨: @next/env 使用）
// 使い方: node scripts/test-backlog.mjs
// .env.local に BACKLOG_SPACE_ID / BACKLOG_API_KEY を設定してから実行

import pkg from '@next/env'
const { loadEnvConfig } = pkg
loadEnvConfig(process.cwd())

const SPACE_ID = process.env.BACKLOG_SPACE_ID
const API_KEY  = process.env.BACKLOG_API_KEY

if (!SPACE_ID || !API_KEY) {
  console.error('❌ .env.local に BACKLOG_SPACE_ID / BACKLOG_API_KEY を設定してください')
  process.exit(1)
}

const base = `https://${SPACE_ID}/api/v2`
const key  = `apiKey=${encodeURIComponent(API_KEY)}`

async function get(path, params = '') {
  const url = `${base}${path}?${key}${params ? '&' + params : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`)
  return res.json()
}

console.log(`\n🔍 Space: ${SPACE_ID}\n`)

// ① 自分のユーザー情報
const myself = await get('/users/myself')
console.log(`👤 myself: id=${myself.id}  name=${myself.name}`)

// ② 小バッチで自分の課題を取得し projectId を収集
const probe = await fetch(
  `${base}/issues?${key}&count=50&order=updated&assigneeId[]=${myself.id}`
).then(r => r.json())

const projectIds = [...new Set(probe.map(i => i.projectId))]
console.log(`\n📂 対象プロジェクトID: [${projectIds.join(', ')}]`)

// ③ 各プロジェクトのステータスを取得し、完了以外のIDを収集
const nonCompletedIds = new Set()
for (const pid of projectIds) {
  const statuses = await get(`/projects/${pid}/statuses`)
  console.log(`\n  Project ${pid} ステータス:`)
  for (const s of statuses) {
    console.log(`    id=${s.id}  name=${s.name}`)
    if (s.name !== '完了') nonCompletedIds.add(String(s.id))
  }
}

console.log(`\n✅ 完了除外 statusId: [${[...nonCompletedIds].join(', ')}]`)

// ④ 完了以外の statusId で課題取得
const params = new URLSearchParams({ count: '100', order: 'updated' })
params.append('assigneeId[]', String(myself.id))
for (const id of nonCompletedIds) params.append('statusId[]', id)

const issues = await fetch(`${base}/issues?${key}&${params}`).then(r => r.json())
console.log(`\n📌 担当課題（完了除外、${issues.length}件）:`)
for (const i of issues) {
  console.log(`  [${i.status.name}] ${i.issueKey} ${i.summary}`)
}
