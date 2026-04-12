
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSettings, saveSettings } from '@/profiles/index'
import { APP_REGISTRY } from '@/apps/registry'
import type { Profile, AiPersona, AiProviderId, InstalledApp } from '@/shared/types'

// 属性の選択肢
const ATTRIBUTES = [
  { value: 'work', label: '仕事', emoji: '💼' },
  { value: 'personal', label: 'プライベート', emoji: '🏠' },
]

const AI_PROVIDERS: Array<{ id: AiProviderId; label: string; defaultModel: string }> = [
  { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-haiku-4-5-20251001' },
  { id: 'gemini', label: 'Gemini', defaultModel: 'gemini-2.5-flash' },
]

// アプリ固有設定キーの表示名・ヒント・入力タイプ
const SETTING_META: Record<string, { label: string; hint?: string; type?: string; placeholder?: string }> = {
  backlog_space_id:     { label: 'スペース ID',        hint: '例: myspace.backlog.com', placeholder: 'myspace.backlog.com' },
  backlog_api_key:      { label: 'API キー',           type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxx' },
  google_client_id:     { label: 'クライアント ID',     placeholder: 'xxxxxxxx.apps.googleusercontent.com' },
  google_refresh_token: { label: 'リフレッシュトークン', type: 'password', placeholder: '1//xxxxxxxxxx' },
  github_issues_repo:   { label: 'リポジトリ名',        hint: 'owner/repo 形式', placeholder: 'owner/repo' },
}

export default function Settings() {
  const router = useRouter()
  const [settings, setSettings] = useState<Profile | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  if (!settings) return null

  function updateField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev)
    setSaved(false)
  }

  function updateAttribute(value: string) {
    setSettings((prev) => prev ? { ...prev, attribute: value } : prev)
    setSaved(false)
  }

  function updateAiPersona(key: keyof AiPersona, value: string) {
    setSettings((prev) => prev ? { ...prev, ai_persona: { ...prev.ai_persona, [key]: value } } : prev)
    setSaved(false)
  }

  function updateAiProvider(value: string) {
    setSettings((prev) => {
      if (!prev) return prev
      const previousProviderId = prev.ai_persona.providerId || 'anthropic'
      const previousDefaultModel =
        AI_PROVIDERS.find((p) => p.id === previousProviderId)?.defaultModel || ''
      const selected = AI_PROVIDERS.find((p) => p.id === value)
      const nextModel =
        !prev.ai_persona.model || prev.ai_persona.model === previousDefaultModel
          ? selected?.defaultModel || ''
          : prev.ai_persona.model
      return {
        ...prev,
        ai_persona: {
          ...prev.ai_persona,
          providerId: value,
          model: nextModel,
        },
      }
    })
    setSaved(false)
  }

  // ADR-007: アプリの有効/無効切り替え
  function updateAppEnabled(appId: string, enabled: boolean) {
    setSettings((prev) => {
      if (!prev) return prev
      const apps = prev.installedApps ?? []
      const exists = apps.find((a) => a.appId === appId)
      const updated: InstalledApp[] = exists
        ? apps.map((a) => a.appId === appId ? { ...a, enabled } : a)
        : [...apps, { appId, enabled, settings: {}, installedAt: new Date().toISOString() }]
      return { ...prev, installedApps: updated }
    })
    setSaved(false)
  }

  // ADR-007: アプリ固有設定の更新
  function updateAppSetting(appId: string, key: string, value: string) {
    setSettings((prev) => {
      if (!prev) return prev
      const apps = prev.installedApps ?? []
      const updated: InstalledApp[] = apps.map((a) =>
        a.appId === appId ? { ...a, settings: { ...a.settings, [key]: value } } : a
      )
      return { ...prev, installedApps: updated }
    })
    setSaved(false)
  }

  function getAppState(appId: string): { enabled: boolean; settings: Record<string, string> } {
    const installed = settings?.installedApps?.find((a) => a.appId === appId)
    return { enabled: installed?.enabled ?? false, settings: installed?.settings ?? {} }
  }

  function handleSave() {
    if (!settings) return
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-lg font-semibold tracking-tight">設定</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* 属性選択 */}
        <Section title="属性">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">属性（仕事/プライベートなど）</label>
            <select
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
              value={settings.attribute || 'work'}
              onChange={e => updateAttribute(e.target.value)}
            >
              {ATTRIBUTES.map(attr => (
                <option key={attr.value} value={attr.value}>
                  {attr.emoji} {attr.label}
                </option>
              ))}
            </select>
          </div>
        </Section>
        <div className="space-y-6">
          {/* GitHub 認証 */}
          <Section title="GitHub 認証">
            <Field
              label="Personal Access Token (PAT)"
              hint="repo スコープが必要"
              type="password"
              value={settings.gh_pat}
              onChange={(v) => updateField('gh_pat', v)}
              placeholder="ghp_xxxxxxxxxxxx"
            />
          </Section>

          {/* リポジトリ設定 */}
          <Section title="データリポジトリ">
            <Field
              label="リポジトリ名"
              hint="owner/repo 形式"
              value={settings.github_repo}
              onChange={(v) => updateField('github_repo', v)}
              placeholder="toshikazu-takemasa/personal-vault-"
            />
            <Field
              label="ブランチ"
              value={settings.github_branch}
              onChange={(v) => updateField('github_branch', v)}
              placeholder="main"
            />
            <Field
              label="日記保存パス"
              value={settings.diary_path}
              onChange={(v) => updateField('diary_path', v)}
              placeholder="vault/diary"
            />
            <Field
              label="設定ファイルパス"
              value={settings.config_path}
              onChange={(v) => updateField('config_path', v)}
              placeholder="vault/config.json"
            />
          </Section>

          {/* AI人格設定 */}
          <Section title="AI人格設定">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">AIプロバイダ</label>
              <select
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                value={settings.ai_persona?.providerId ?? 'anthropic'}
                onChange={e => updateAiProvider(e.target.value)}
              >
                {AI_PROVIDERS.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="モデル"
              hint="例: claude-haiku-4-5-20251001 / gemini-2.5-flash"
              value={settings.ai_persona?.model ?? ''}
              onChange={(v) => updateAiPersona('model', v)}
              placeholder="providerに対応したモデルID"
            />
            <Field
              label="AI名"
              value={settings.ai_persona?.name ?? 'パートナー'}
              onChange={(v) => updateAiPersona('name', v)}
              placeholder="パートナー"
            />
            <Field
              label="ユーザーの呼び方"
              value={settings.ai_persona?.userCallName ?? 'あんた'}
              onChange={(v) => updateAiPersona('userCallName', v)}
              placeholder="あんた"
            />
            <Field
              label="アバター画像URL"
              value={settings.ai_persona?.avatarUrl ?? ''}
              onChange={(v) => updateAiPersona('avatarUrl', v)}
              placeholder="https://example.com/avatar.png"
            />
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                システムプロンプト
                <span className="ml-2 text-zinc-600">AIの性格・口調</span>
              </label>
              <textarea
                value={settings.ai_persona?.systemPrompt ?? ''}
                onChange={(e) => updateAiPersona('systemPrompt', e.target.value)}
                rows={4}
                placeholder="あなたは気さくで頼りになるAIアシスタントです。"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
              />
            </div>
            <Field
              label="AI API キー"
              hint="選択したプロバイダのキーを入力"
              type="password"
              value={settings.ai_persona?.apiKey ?? ''}
              onChange={(v) => updateAiPersona('apiKey', v)}
              placeholder="プロバイダのAPIキー"
            />
          </Section>

          {/* アプリ（ADR-007: App Catalog）*/}
          <Section title="アプリ">
            <p className="text-xs text-zinc-500 -mt-2 mb-2">
              使用するアプリを有効にしてください。必要な設定がある場合は有効化後に入力します。
            </p>
            <div className="space-y-3">
              {APP_REGISTRY.map((manifest) => {
                const { enabled, settings: appSettings } = getAppState(manifest.id)
                return (
                  <div key={manifest.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{manifest.icon}</span>
                        <div>
                          <span className="text-sm text-zinc-100">{manifest.label}</span>
                          <span className="ml-2 text-xs text-zinc-600">
                            {manifest.category === 'core' ? 'コア' : manifest.category === 'work' ? '仕事' : 'プライベート'}
                          </span>
                        </div>
                      </div>
                      <Toggle
                        value={enabled}
                        onChange={(v) => updateAppEnabled(manifest.id, v)}
                      />
                    </div>
                    {enabled && manifest.requiredSettings.length > 0 && (
                      <div className="mt-4 space-y-3 pt-3 border-t border-zinc-800">
                        {manifest.requiredSettings.map((settingKey) => {
                          const meta = SETTING_META[settingKey] ?? { label: settingKey }
                          return (
                            <Field
                              key={settingKey}
                              label={meta.label}
                              hint={meta.hint}
                              type={meta.type ?? 'text'}
                              value={appSettings[settingKey] ?? ''}
                              onChange={(v) => updateAppSetting(manifest.id, settingKey, v)}
                              placeholder={meta.placeholder ?? ''}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* 保存ボタン */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              className="rounded-full bg-zinc-100 text-zinc-900 px-6 py-2 text-sm font-semibold hover:bg-white transition-colors"
            >
              保存
            </button>
            {saved && (
              <span className="text-sm text-emerald-400">✓ 保存しました</span>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// --- 共通コンポーネント ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">
        {label}
        {hint && <span className="ml-2 text-zinc-600">{hint}</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
      />
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors ${
        value ? 'bg-emerald-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          value ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
