# Shinra Pocket - Claude Code 統合プロンプト

> このプロンプトをClaude Codeにコピー&ペーストして、全エージェントを並列起動してください。

---

## プロンプト（そのまま貼り付け）

```
あなたは「Shinra Pocket」というiOS/Android向けコインゲームアプリの開発チームのリーダーです。

## プロジェクト概要
- 3×3ボードでコインを配置・移動して3つ揃えるボードゲーム
- React Native (Expo SDK 52) + TypeScript で開発
- オンライン対戦対応（Node.js + Socket.io サーバー）
- 既存のHTMLデモ（coin-game-demo/index.html）をネイティブアプリ化

## プロジェクト構成
ShinraPocket/ に全ファイルがあります。

## エージェント設計書
`agents/` フォルダに6つのエージェント定義MDファイルがあります。
まず全てのMDファイルを読んでください:

1. `agents/00_ORCHESTRATOR.md` — プロジェクト全体統括
2. `agents/01_UI_FOUNDATION.md` — UI基盤（テーマ・共通コンポーネント）
3. `agents/02_GAME_LOGIC.md` — ゲームロジック（エンジン・AI）
4. `agents/03_SCREENS.md` — 全画面コンポーネント
5. `agents/04_SERVER.md` — 対戦サーバー
6. `agents/05_ONLINE_BATTLE.md` — オンライン対戦クライアント
7. `agents/06_POLISH.md` — 演出・仕上げ

## 既存の参照ファイル
- `coin-game-demo/index.html` — 元のHTMLデモ（ゲームロジック・UIの完全な参照実装）

## 実行指示

### Phase 1: 並列実行（Agent 01, 02, 04 を同時に）

**Agent 01 タスク（UI基盤）:**
- `src/utils/theme.ts` を作成（カラーパレット・定数）
- `src/utils/constants.ts` を作成（ゲーム定数：COINS, CPU_MAP, WINS, ADJ）
- `src/components/StarBackground.tsx` を作成（星空アニメーション）
- `src/components/Coin.tsx` を作成（3種コイン表示 + ドロップアニメーション）
- `src/components/GradientButton.tsx` を作成
- `src/components/GameBoard.tsx` / `BoardCell.tsx` を作成
- `src/components/TimerRing.tsx` を作成（SVG + Reanimated）
- `src/components/PlayerIndicator.tsx` を作成

**Agent 02 タスク（ゲームロジック）:**
- `src/game/types.ts` を作成（全型定義）
- `src/game/engine.ts` を作成（配置・移動・勝利判定）
- `src/game/aiNormal.ts` を作成（ふつうAI）
- `src/game/aiHard.ts` を作成（Minimax + αβ枝刈りAI）
- `src/game/timer.ts` を作成（制限時間計算）
- `src/game/useGameState.ts` を作成（React Hook）
- **重要**: coin-game-demo/index.html のJavaScriptロジックを忠実に移植すること

**Agent 04 タスク（サーバー）:**
- `server/package.json` を作成
- `server/index.js` を作成（Express + Socket.io）
- `server/matchmaking.js` を作成
- `server/gameRoom.js` を作成
- `server/ranking.js` を作成（REST API）
- `server/db.js` を作成（SQLite）

### Phase 2: 依存タスク（Agent 01, 02 完了後）

**Agent 03 タスク（全画面）:**
- `src/screens/SplashScreen.tsx`
- `src/screens/MenuScreen.tsx`
- `src/screens/CoinSelectScreen.tsx`
- `src/screens/GameScreen.tsx` ← 最重要、Agent 01 + 02 の成果物を統合
- `src/screens/ResultScreen.tsx`
- `src/screens/RankingScreen.tsx`
- `App.tsx` の最終調整

### Phase 3: オンライン統合（Agent 03, 04 完了後）

**Agent 05 タスク（オンライン対戦）:**
- `src/online/socketClient.ts`
- `src/online/useMatchmaking.ts`
- `src/online/useOnlineGame.ts`
- `src/online/playerStorage.ts`
- `src/screens/OnlineLobbyScreen.tsx`
- `src/screens/OnlineGameScreen.tsx`

### Phase 4: 仕上げ

**Agent 06 タスク（演出）:**
- `src/utils/haptics.ts`（触覚フィードバック）
- `src/utils/sounds.ts`（効果音）
- 全画面のアニメーション強化
- `eas.json` 作成

## 最重要ルール
1. **agents/ の各MDを必ず読んでから作業開始**すること
2. **coin-game-demo/index.html を参照実装として忠実に移植**すること
3. TypeScript strict mode で全ファイルを型安全に
4. 各ファイル作成後に構文チェック（tsc --noEmit）
5. Phase 1 のタスクは可能な限り並列実行
6. ファイル間の依存関係を意識してimport pathを正確に

それでは、agents/ フォルダの全MDを読み、Phase 1 から開発を開始してください。
```

---

## 使い方

1. Claude Code（ターミナル）を開く
2. `cd ShinraPocket` でプロジェクトディレクトリへ移動
3. 上記プロンプトをそのまま貼り付けて実行
4. Claude Codeが自動的に全エージェントMDを読み、Phase順に開発を進めます

## 補足
- 途中で止まった場合: 「Phase N を続けてください」で再開
- 特定のエージェントだけ実行: 「Agent 02 のタスクだけ実行してください。agents/02_GAME_LOGIC.md を読んで始めてください」
- 全体の進捗確認: 「各Phaseの進捗を報告してください」
