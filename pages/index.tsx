import { useState, useEffect } from 'react'
import {
  getActiveProfile,
  getActiveProfileId,
  getAllProfiles,
  switchProfile,
  isFeatureEnabled,
} from '@/profiles/index'
import type { Profile, ProfileId } from '@/shared/types'

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeId, setActiveId] = useState<ProfileId>('work')
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    const p = getActiveProfile()
    const id = getActiveProfileId()
    setProfile(p)
    setActiveId(id)
    setIsConfigured(!!p.gh_pat && !!p.github_repo)
  }, [])

  if (!profile) return null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Portal</h1>

        {/* Profile Switcher */}
        <div className="flex items-center gap-2">
          {(['work', 'personal'] as ProfileId[]).map((id) => {
            const p = getAllProfiles()[id]
            const isActive = activeId === id
            return (
              <button
                key={id}
                onClick={() => switchProfile(id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                <span>{p?.emoji ?? '?'}</span>
                <span>{p?.label ?? id}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* 未設定の場合 */}
        {!isConfigured && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm text-amber-400 font-medium">
              GitHub PAT とリポジトリを設定してください
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              設定 → {profile.emoji} {profile.label} プロファイル → PAT・リポジトリ入力
            </p>
          </div>
        )}

        {/* プロファイル情報 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{profile.emoji}</span>
            <div>
              <h2 className="text-base font-semibold">{profile.label} プロファイル</h2>
              <p className="text-sm text-zinc-400">
                {profile.github_repo || '（リポジトリ未設定）'}
              </p>
            </div>
          </div>

          {/* 有効な機能 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(Object.entries(profile.features) as [string, boolean][])
              .filter(([, enabled]) => enabled)
              .map(([key]) => (
                <span
                  key={key}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                >
                  {key}
                </span>
              ))}
          </div>
        </div>

        {/* 機能カード（仮） */}
        <div className="grid grid-cols-2 gap-4">
          <FeatureCard
            icon="📓"
            title="日記"
            description="今日の記録を書く"
            enabled
          />
          <FeatureCard
            icon="✅"
            title="チェックリスト"
            description="今日のタスクを確認"
            enabled
          />
          {isFeatureEnabled('ai_summary') && (
            <FeatureCard
              icon="🤖"
              title="AIサマリー"
              description="今日の記録を要約"
              enabled
            />
          )}
          {isFeatureEnabled('backlog') && (
            <FeatureCard
              icon="📋"
              title="Backlog"
              description="課題を確認"
              enabled
            />
          )}
          {isFeatureEnabled('finance') && (
            <FeatureCard
              icon="💰"
              title="家計管理"
              description="収支を記録"
              enabled
            />
          )}
          {isFeatureEnabled('calendar') && (
            <FeatureCard
              icon="📅"
              title="カレンダー"
              description="スケジュール確認"
              enabled
            />
          )}
        </div>
      </main>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  enabled,
}: {
  icon: string
  title: string
  description: string
  enabled: boolean
}) {
  if (!enabled) return null
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 transition-colors cursor-pointer">
      <span className="text-2xl">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-zinc-400">{description}</p>
    </div>
  )
}
