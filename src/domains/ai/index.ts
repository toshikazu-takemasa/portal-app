// ============================================================
// Domain: AI
// UC-04: AIに今日の記録をサマリーさせる
// /api/summarize を経由して Anthropic Claude を呼ぶ
//
// Backlog 取得は ADR-008 により src/domains/task/integrations/backlog.ts へ移動した
// ============================================================

import { getSettings } from '@/profiles'

/** 日記内容を AI にサマリーさせる */
export async function summarizeJournal(content: string): Promise<string> {
  const profile = getSettings()
  const persona = profile.ai_persona

  if (!persona.apiKey) {
    throw new Error('AI API キーが設定されていません。設定画面で Anthropic API キーを入力してください。')
  }

  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      systemPrompt: persona.systemPrompt,
      aiName: persona.name,
      userCallName: persona.userCallName,
      providerId: persona.providerId,
      model: persona.model,
      apiKey: persona.apiKey,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? 'AI API エラー')
  }

  const data = await res.json()
  return data.summary as string
}

