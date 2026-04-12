# nazu/ — 保護猫なづ Instagram運用

Instagram @catnazu の半自動運用ツールキット。
候補Cの縮小版MVPとして、AIコンテンツ生成パイプラインの実証実験を兼ねる。

## ファイル構成

| ファイル | 用途 |
|---|---|
| `instructions.md` | なづのキャラ設定・トーン・運用ルール |
| `caption_prompt.md` | Claude APIに渡すシステムプロンプト + 呼び出し例 |
| `hashtags.md` | ハッシュタグ3カテゴリのローテーション表 |

## エージェントチーム (`agents/`)

### 運用チーム
| エージェント | ファイル | 役割 |
|---|---|---|
| Content | `agents/content.md` | 写真選定・キャプション生成 |
| Monitor | `agents/monitor.md` | インサイト分析・週次レポート |
| Support | `agents/support.md` | コメント・DM返信ドラフト |
| Ops | `agents/ops.md` | スケジュール管理・品質チェック・調整 |
| Growth | `agents/growth.md` | フォロワー増加施策・トレンド分析 |

### 営業チーム（M6〜）
| エージェント | ファイル | 役割 |
|---|---|---|
| Scout | `agents/scout.md` | PR案件候補のリサーチ |
| Outreach | `agents/outreach.md` | 営業メール・DM文面生成 |
| Deal | `agents/deal.md` | 案件条件整理・交渉サポート |

## 運用フロー

1. 写真を選ぶ（太一さん or AI候補提示）
2. `caption_prompt.md` のプロンプトでClaude APIを呼び、キャプション生成
3. 太一さんが確認・承認
4. Instagram投稿

## 投稿ペース
- 週2本（フィード1 + リール1）
- M1は収益化施策ゼロ。信頼回復に集中

## 技術スタック
- AI: Claude API (Sonnet)
- 将来的に: Next.js + Supabase + Instagram Graph API で自動化

## 候補Cとの関係
ここで作るプロンプト・スケジューラ・管理ロジックは候補Cの各エージェント（Content/Monitor/Support/Ops/Growth）の原型になる。
