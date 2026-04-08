import type { NextApiRequest, NextApiResponse } from 'next'

type RequestBody = {
  content: string
  systemPrompt?: string
  aiName?: string
  userCallName?: string
  apiKey: string
}

type ResponseData = { summary: string } | { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { content, systemPrompt, aiName, userCallName, apiKey } =
    req.body as RequestBody

  if (!content?.trim()) {
    return res.status(400).json({ error: '日記の内容が空です' })
  }
  if (!apiKey) {
    return res.status(400).json({ error: 'API キーが設定されていません' })
  }

  const name = aiName || 'パートナー'
  const callName = userCallName || 'あんた'
  const systemText =
    systemPrompt?.trim() ||
    `あなたは${name}です。${callName}の日記を読んで、温かみのある視点でフィードバックをしてください。`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemText,
        messages: [
          {
            role: 'user',
            content: `以下は今日の日記です。要約・気づき・ひとことフィードバックをお願いします。\n\n---\n${content}\n---`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg =
        (err as { error?: { message?: string } }).error?.message ??
        `Anthropic API error (${response.status})`
      return res.status(response.status).json({ error: msg })
    }

    const data = await response.json()
    const summary: string = (data.content?.[0]?.text as string) ?? ''
    return res.status(200).json({ summary })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
