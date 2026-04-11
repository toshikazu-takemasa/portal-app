import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '@/shared/types'
import { getSettings } from '@/profiles'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const settings = getSettings()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim()) return
    setError(null)
    setLoading(true)
    const userMsg: ChatMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messages.concat(userMsg).map(m => `${m.role === 'user' ? 'ユーザー' : settings.ai_persona.name}: ${m.content}`).join('\n'),
          systemPrompt: settings.ai_persona.systemPrompt,
          aiName: settings.ai_persona.name,
          userCallName: settings.ai_persona.userCallName,
          providerId: settings.ai_persona.providerId,
          model: settings.ai_persona.model,
          apiKey: settings.ai_persona.apiKey,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? 'AI API エラー')
      }
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.summary as string }])
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
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <a href="/" className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm">← 戻る</a>
        <h1 className="text-lg font-semibold tracking-tight">AIチャット</h1>
      </header>
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
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
            className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-none min-h-[48px]"
            placeholder="AIに話しかけてみましょう..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-full bg-emerald-500 text-white px-5 py-2 font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </main>
    </div>
  )
}
