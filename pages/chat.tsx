import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import type { ChatMessage } from '@/shared/types'
import { getSettings } from '@/profiles'

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const settings = getSettings()
  const persona = settings.ai_persona
  const aiConfigured = Boolean(persona?.apiKey?.trim() && persona?.model?.trim())

  useEffect(() => {
    const saved = localStorage.getItem('chat_history')
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
      } catch (e) {
        // ignore parse error
      }
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_history', JSON.stringify(messages))
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!aiConfigured) {
      setError('AIプロバイダとAPIキーを設定してください')
      return
    }
    if (!input.trim()) return
    setError(null)
    setLoading(true)
    const userMsg: ChatMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
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
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response as string }])
    } catch (e: any) {
      setError(e.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => router.push('/')}
            className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm shrink-0"
          >
            ← 戻る
          </button>
          <h1 className="text-lg font-semibold tracking-tight shrink-0">AIチャット</h1>
          <span className="hidden sm:inline text-xs text-zinc-500 truncate">
            {persona.providerId || 'anthropic'} / {persona.model || '未設定'}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push('/settings')}
            className="text-xs text-zinc-400 hover:text-zinc-100 font-medium"
          >
            設定
          </button>
          <button
            onClick={() => { setMessages([]); localStorage.removeItem('chat_history'); }}
            className="text-xs text-red-500 hover:text-red-400 font-medium"
          >
            履歴クリア
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
        {!aiConfigured && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-400 font-medium">AIチャットの設定が未完了です</p>
            <p className="mt-1 text-xs text-zinc-400">
              設定画面で AI プロバイダ・モデル・API キーを入力してください。
            </p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="text-zinc-500 text-center mt-10">AIと会話を始めましょう。日記やナレッジの内容を貼り付けてもOKです。</div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-xl px-4 py-2 max-w-[80%] whitespace-pre-line ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-100'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-none min-h-12"
            placeholder={aiConfigured ? 'AIに話しかけてみましょう...' : '設定画面でAIを有効化してください'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || !aiConfigured}
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !aiConfigured}
            className="rounded-full bg-emerald-500 text-white px-5 py-2 font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </main>
    </div>
  )
}
