import type { NextApiRequest, NextApiResponse } from 'next'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type RequestBody = {
  messages: Message[]
  systemPrompt?: string
  aiName?: string
  userCallName?: string
  providerId?: string
  model?: string
  apiKey: string
}

type ResponseData = { response: string } | { error: string }

const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  gemini: 'gemini-2.5-flash',
}

function normalizeApiKey(raw: string): string {
  const trimmed = raw.trim().replace(/^['\"]|['\"]$/g, '')
  return trimmed.replace(/^Bearer\s+/i, '').trim()
}

function normalizeProviderId(raw?: string): string {
  return raw?.trim().toLowerCase() || 'anthropic'
}

function getErrorMessage(err: unknown, fallback: string): string {
  const rec = err as { error?: { message?: string }; message?: string }
  return rec.error?.message ?? rec.message ?? fallback
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, systemPrompt, aiName, userCallName, providerId, model, apiKey } =
    req.body as RequestBody
  const normalizedProviderId = normalizeProviderId(providerId)
  const selectedModel = (model?.trim() || DEFAULT_MODEL_BY_PROVIDER[normalizedProviderId] || '').trim()
  const normalizedApiKey = normalizeApiKey(apiKey ?? '')

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'メッセージが空です' })
  }
  if (!normalizedApiKey) {
    return res.status(400).json({ error: 'API キーが設定されていません' })
  }
  if (!selectedModel) {
    return res.status(400).json({ error: 'モデルが設定されていません' })
  }

  const name = aiName || 'パートナー'
  const callName = userCallName || 'あんた'
  const systemText =
    systemPrompt?.trim() ||
    `あなたは${name}です。${callName}と対話しています。フレンドリーに答えてください。`

  try {
    let response: Response

    if (normalizedProviderId === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': normalizedApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 1024,
          system: systemText,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      })
    } else if (normalizedProviderId === 'gemini') {
      // Gemini format
      const geminiMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
      
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(normalizedApiKey)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemText }] },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 1024 },
          }),
        }
      )
    } else {
      return res.status(400).json({ error: `未対応のAIプロバイダです: ${normalizedProviderId}` })
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const rawMsg = getErrorMessage(err, `AI API error (${response.status})`)
      const isAuthError =
        (normalizedProviderId === 'anthropic' && response.status === 401) ||
        (normalizedProviderId === 'gemini' && (response.status === 400 || response.status === 401 || response.status === 403))
      const providerName = normalizedProviderId === 'gemini' ? 'Gemini' : 'Anthropic'
      const msg = isAuthError
        ? `${providerName} API キーが無効です（${rawMsg}）。`
        : rawMsg
      return res.status(response.status).json({ error: msg })
    }

    const data = await response.json()
    let aiResponseText = ''

    if (normalizedProviderId === 'gemini') {
      aiResponseText = data.candidates
        ?.flatMap((c: any) => c.content?.parts ?? [])
        .map((p: any) => p.text ?? '')
        .join('\n')
        .trim() ?? ''
    } else {
      aiResponseText = (data.content?.[0]?.text as string) ?? ''
    }

    if (!aiResponseText) {
      return res.status(502).json({ error: 'AIレスポンスの本文が空でした' })
    }

    return res.status(200).json({ response: aiResponseText })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
