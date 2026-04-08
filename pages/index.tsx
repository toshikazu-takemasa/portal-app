import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import {
  getActiveProfile,
  isFeatureEnabled,
} from '@/profiles/index'
import type { Profile } from '@/shared/types'

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    const p = getActiveProfile()
    setProfile(p)
    setIsConfigured(!!p.gh_pat && !!p.github_repo)
  }, [])

  if (!profile) return null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Portal</h1>

        <div className="flex items-center gap-2">
          {/* プロファイル表示のみ（ADR-005: 切り替えはUI非対応、設定画面経由） */}
          <span className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium bg-zinc-800 text-zinc-300">
            <span>{profile.emoji}</span>
            <span>{profile.label}</span>
          </span>

          {/* Settings Button */}
          <button
            onClick={() => router.push('/settings')}
            className="rounded-full p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
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
