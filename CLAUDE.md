@AGENTS.md

# Portal App — Claude Code

## 設計思想（4原則）

1. **ADR + 進化的アーキテクチャ** — 設計変更は `docs/adr/` に記録してから実装
2. **ユースケース → 仕様 → 実装** — 実装前に `src/shared/types.ts` の型を先に定義
3. **DDD Lite** — 下記ルールを厳守
4. **フィーチャーフラグ** — `isFeatureEnabled()` でプロファイル別機能を制御

## DDD Lite ルール（必ず守ること）

- `src/domains/` 配下にドメイン別にロジックを配置する
- ドメイン間の直接 import 禁止（`src/shared/` 経由のみ）
- **GitHub API を直接 fetch しない** → `src/storage/interface.ts` の `StorageAdapter` を経由する
- `createStorageAdapter()` を使って StorageAdapter インスタンスを生成する
- 新機能は `if (!isFeatureEnabled('xxx')) return null` から始める

## 現在のフェーズ

**Phase 1 完了** → Phase 2（プロファイル切り替えUI）進行中

フレームワーク: **Next.js**（静的出力）→ DDD Lite 安定後に SvelteKit + Cloudflare Pages へ移行

## 詳細ドキュメント

- [改修計画](docs/planning/redesign-plan.md)
- [設計思想の背景](docs/planning/design-philosophy.md)
- [ADR一覧](docs/adr/)

## ディレクトリ構造

```
src/
  shared/types.ts       ← 型定義（実装より先に書く）
  storage/
    interface.ts        ← StorageAdapter インターフェース
    github.ts           ← 現フェーズ実装
  profiles/index.ts     ← プロファイル管理・機能フラグ
  domains/
    journal/            ← 日記・日報
    task/               ← チェックリスト・タスク
    finance/            ← 家計（個人のみ）
    ai/                 ← AIチャット・ティッカー
pages/
  index.tsx             ← トップページ
docs/
  adr/                  ← 設計決定記録
  planning/             ← 改修計画・設計思想
```

## スキル

`portal-design-review` — 「設計レビューして」「ADR書いて」「UC定義して」「DDD確認して」で起動
