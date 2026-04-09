# Portal 新規リポジトリ改修計画

作成日: 2026-04-07  
ステータス: Phase 1 進行中

---

## Context

`docs/`（仕事）と `my-portal/`（個人）の逐次機能追加によりコードが多重化・散逸している。
根本から再設計し、単一アプリリポジトリ + 複数データリポジトリ構成に移行する。

**デプロイ完了まで `docs/` と `my-portal/` は現状維持で並行稼働。**

---

## 設計思想（確定）

| レイヤー | 採用思想 | 実行タイミング |
|---|---|---|
| 記録・意思決定 | ADR + 進化的アーキテクチャ | 今すぐ・継続的 |
| 仕様化 | ユースケース → AI仕様生成 | 実装開始前 |
| 実装構造 | DDD Lite（StorageAdapter + ドメイン分割） | 実装時 |
| 機能制御 | フィーチャーフラグ（プロファイル内 features） | 実装時 |

背景・考察: [`design-philosophy.md`](./design-philosophy.md)

---

## フレームワーク選定（確定）

| フェーズ | フレームワーク | デプロイ先 |
|---|---|---|
| Phase 1〜2（現在） | **Next.js**（静的出力 → API Routes） | Vercel or Cloudflare Pages |
| DDD Lite安定後 | **SvelteKit + Cloudflare Pages** | Cloudflare Pages + D1 |

移行判断基準: StorageAdapter・domains/・profiles/ が安定稼働し、音声/D1の計画が立った時点。  
→ [ADR-004](./adr/004-framework-nextjs-then-sveltekit.md)

---

## ターゲット構成（移行後）

```
[アプリリポジトリ] portal-app（新規・個人GitHub）
  ├── src/
  │   ├── domains/
  │   │   ├── journal/      日記・日報
  │   │   ├── task/         チェックリスト・タスク
  │   │   ├── finance/      家計（個人プロファイルのみ）
  │   │   └── ai/           AIチャット・ティッカー
  │   ├── storage/
  │   │   ├── interface.ts  ← 必ず経由する
  │   │   ├── github.ts     現フェーズ
  │   │   └── d1.ts         将来: Cloudflare D1
  │   ├── profiles/
  │   └── shared/
  └── CLAUDE.md             ← この設計書へのリンクのみ

[仕事用データリポジトリ] sprocket-inc/ttakemasa-workspace
  └── vault/
      ├── diary/
      ├── reports/
      └── config.json

[個人用データリポジトリ] owner/personal-vault
  └── vault/
      ├── diary/
      ├── knowledge/
      └── config.json
```

---

## プロファイル管理スキーマ（localStorage）

```typescript
interface Profile {
  id: string
  label: string
  gh_pat: string
  github_repo: string
  github_branch: string
  vault_path: string        // データルートディレクトリ
  diary_path: string
  report_path: string
  config_path: string
  features: FeatureFlags
}

interface FeatureFlags {
  backlog: boolean
  finance: boolean
  ai_ticker: boolean
  voice_input: boolean
  ai_summary: boolean
  calendar: boolean
}
```

---

## ユースケース一覧

| UC | 内容 | 対象プロファイル |
|---|---|---|
| UC-01 | 今日の日記を書いて保存する | 両方 |
| UC-02 | 過去の日記を日付で読む | 両方 |
<!-- UC-03（プロファイル切り替え）は廃止 -->
| UC-04 | AIに今日の記録をサマリーさせる | 両方 |
| UC-05 | チェックリストを完了状態で保存する | 両方 |
| UC-06 | 家計を記録する | 個人のみ |
| UC-07 | 音声で日記を入力する（将来） | 両方 |
| UC-08 | ナレッジを書いてリポジトリに保存する | 両方 |

---

## ADR 一覧

| # | タイトル | 状態 |
|---|---|---|
| [001](./adr/001-github-as-primary-storage.md) | GitHub Contents API をプライマリストレージとして使用 | 採用 |
| [002](./adr/002-profile-switching-via-pat.md) | PAT + リポジトリ設定によるプロファイル切り替え | 採用 |
| [003](./adr/003-defer-d1-migration.md) | D1移行を音声機能追加まで延期 | 採用 |
| [004](./adr/004-framework-nextjs-then-sveltekit.md) | Next.js → SvelteKit への段階移行 | 採用 |
| 005 | vault ディレクトリ構造 | 検討中 |

---

## 実装フェーズ

### Phase 1: 基盤セットアップ（現在）
- [x] フレームワーク選定・ADR 004 記録（Next.js → SvelteKit段階移行）
- [ ] 新規リポジトリ作成（my-portal ベース、Next.js 構成）
- [ ] `types.ts`（Profile, FeatureFlags, StorageAdapter インターフェース）を先に定義
- [ ] GitHub Pages / Cloudflare Pages にデプロイして動作確認


### Phase 2: 機能フラグ方式への移行
- [ ] `profiles/` モジュールの整理（プロファイル分離→単一プロファイル＋機能フラグON/OFF方式へ）
- [ ] 設定UIでPAT + リポジトリ + 機能フラグを管理
- [ ] 各機能を「ON/OFF」できるUIを追加（マーケットプレイス的なUX）

> **方針転換理由**: 仕事/プライベートで異なるのは主に用語（日報/日記など）のみであり、システム分離によるコストが高いため。今後は「プロファイル切り替え」ではなく、単一プロファイル＋機能ごとのON/OFF制御に一本化する。

### Phase 3: StorageAdapter + ドメイン実装
- [ ] `storage/interface.ts` → `storage/github.ts` の実装
- [ ] `domains/journal/` に日記の読み書きロジックを集約（分散コードを統合）
- [ ] `domains/task/` `domains/finance/` `domains/ai/` を順次整備

### Phase 4: 機能フラグによる仕事/個人機能分離
- [ ] `isFeatureEnabled()` をウィジェット初期化に適用
- [ ] backlog は work のみ / finance は personal のみ

### Phase 5: データリポジトリ vault 構造整備
- [ ] `vault/` 構造で新規作成 or 既存整備
- [ ] GitHub Actions（`daily-report.yml`）のパスを `vault/reports/` に更新

### Phase 6: 切り替え完了・旧サイト非推奨化
- [ ] portal-app が安定稼働
- [ ] docs/ を非推奨化（my-portal/ はアーカイブ）
