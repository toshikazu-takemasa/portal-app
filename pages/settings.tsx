import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  getAllProfiles,
  saveProfile,
  getActiveProfileId,
  switchProfile,
} from '@/profiles/index'
import type { Profile, ProfileId, FeatureFlags, AiPersona } from '@/shared/types'

const FEATURE_LABELS: Record<keyof FeatureFlags, string> = {
  backlog: 'Backlog連携',
  finance: '家計管理',
  ai_ticker: 'AIティッカー',
  ai_summary: 'AIサマリー',
  voice_input: '音声入力（将来）',
  calendar: 'カレンダー表示',
}

export default function Settings() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ProfileId>('work')
  const [profiles, setProfiles] = useState<Record<ProfileId, Profile> | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setProfiles(getAllProfiles())
    setActiveTab(getActiveProfileId())
  }, [])

  if (!profiles) return null

  const profile = profiles[activeTab]

  function updateField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfiles((prev) => {
      if (!prev) return prev
      return { ...prev, [activeTab]: { ...prev[activeTab], [key]: value } }
    })
    setSaved(false)
  }

  function updateFeature(key: keyof FeatureFlags, value: boolean) {
    setProfiles((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          features: { ...prev[activeTab].features, [key]: value },
        },
      }
    })
    setSaved(false)
  }

  function updateAiPersona(key: keyof AiPersona, value: string) {
    setProfiles((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          ai_persona: { ...prev[activeTab].ai_persona, [key]: value },
        },
      }
    })
    setSaved(false)
  }

  function handleSave() {
    if (!profiles) return
    saveProfile(activeTab, profiles[activeTab])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleSetActive(id: ProfileId) {
    if (!profiles) return
    saveProfile(id, profiles[id])
    switchProfile(id) // reloads the page
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
        {/* Profile Tabs */}
        <div className="flex gap-2 mb-8">
          {(['work', 'personal'] as ProfileId[]).map((id) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSaved(false) }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              <span>{profiles[id].emoji}</span>
              <span>{profiles[id].label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {/* GitHub 認証 */}
          <Section title="GitHub 認証">
            <Field
              label="Personal Access Token (PAT)"
              hint="repo スコープが必要"
              type="password"
              value={profile.gh_pat}
              onChange={(v) => updateField('gh_pat', v)}
              placeholder="ghp_xxxxxxxxxxxx"
            />
          </Section>

          {/* リポジトリ設定 */}
          <Section title="データリポジトリ">
            <Field
              label="リポジトリ名"
              hint="owner/repo 形式"
              value={profile.github_repo}
              onChange={(v) => updateField('github_repo', v)}
              placeholder="toshikazu-takemasa/personal-vault-"
            />
            <Field
              label="ブランチ"
              value={profile.github_branch}
              onChange={(v) => updateField('github_branch', v)}
              placeholder="main"
            />
            <Field
              label="日記保存パス"
              value={profile.diary_path}
              onChange={(v) => updateField('diary_path', v)}
              placeholder="vault/diary"
            />
            <Field
              label="設定ファイルパス"
              value={profile.config_path}
              onChange={(v) => updateField('config_path', v)}
              placeholder="vault/config.json"
            />
          </Section>

          {/* AI人格設定 */}
          <Section title="AI人格設定">
            <Field
              label="AI名"
              value={profile.ai_persona?.name ?? 'パートナー'}
              onChange={(v) => updateAiPersona('name', v)}
              placeholder="パートナー"
            />
            <Field
              label="ユーザーの呼び方"
              value={profile.ai_persona?.userCallName ?? 'あんた'}
              onChange={(v) => updateAiPersona('userCallName', v)}
              placeholder="あんた"
            />
            <Field
              label="アバター画像URL"
              value={profile.ai_persona?.avatarUrl ?? ''}
              onChange={(v) => updateAiPersona('avatarUrl', v)}
              placeholder="https://example.com/avatar.png"
            />
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                システムプロンプト
                <span className="ml-2 text-zinc-600">AIの性格・口調</span>
              </label>
              <textarea
                value={profile.ai_persona?.systemPrompt ?? ''}
                onChange={(e) => updateAiPersona('systemPrompt', e.target.value)}
                rows={4}
                placeholder="あなたは気さくで頼りになるAIアシスタントです。"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
              />
            </div>
          </Section>

          {/* 機能フラグ */}
          <Section title="機能 ON/OFF">
            <div className="space-y-3">
              {(Object.entries(FEATURE_LABELS) as [keyof FeatureFlags, string][]).map(
                ([key, label]) => (
                  <label key={key} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{label}</span>
                    <Toggle
                      value={profile.features[key]}
                      onChange={(v) => updateFeature(key, v)}
                    />
                  </label>
                )
              )}
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

          {/* 使用プロファイル切り替え（設定画面経由のみ） */}
          {getActiveProfileId() !== activeTab && (
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2">現在のアクティブプロファイル: {profiles[getActiveProfileId()].emoji} {profiles[getActiveProfileId()].label}</p>
              <button
                onClick={() => handleSetActive(activeTab)}
                className="text-sm text-zinc-400 hover:text-zinc-100 underline underline-offset-2"
              >
                {profiles[activeTab].emoji} {profiles[activeTab].label} をアクティブにする（保存してリロード）
              </button>
            </div>
          )}
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
