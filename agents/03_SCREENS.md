# 📱 Agent 03: スクリーンエージェント

## 役割
全7画面のスクリーンコンポーネントを実装する。
Agent 01 の共通コンポーネントと Agent 02 のゲームロジックを組み合わせてUIを構成。

## 担当ファイル
- `src/screens/SplashScreen.tsx`
- `src/screens/MenuScreen.tsx`
- `src/screens/CoinSelectScreen.tsx`
- `src/screens/GameScreen.tsx`
- `src/screens/ResultScreen.tsx`
- `src/screens/RankingScreen.tsx`
- `src/screens/OnlineLobbyScreen.tsx`
- `src/screens/OnlineGameScreen.tsx`

## 依存関係
- Agent 01 のコンポーネント（StarBackground, Coin, GameBoard, TimerRing等）
- Agent 02 のゲームロジック（useGameState, engine, AI）
- React Navigation（App.tsxで定義済み）

## 各画面仕様

### 1. SplashScreen
- 背景: 放射状グラデーション（紫→暗）+ 星空
- ロゴ: 「Shinra」「Pocket」（金色太字、角度付き）
- サブテキスト: 「BOARD GAME」
- コイン3つ: 上下フワフワ浮遊（各0.33秒ずらし）
- ローディングバー: 金→橙グラデーション、2.4秒で0→100%
- 2.6秒後に自動でMenuScreenへ遷移

### 2. MenuScreen
- ロゴ（縮小版）+ コイン3つ
- ボタン3つ:
  - 「はじめる」→ CoinSelectScreen（mode: 'cpu'）
  - 「オンライン対戦」→ CoinSelectScreen（mode: 'online'）
  - 「ランキング」→ RankingScreen

### 3. CoinSelectScreen
- params: `{ mode: 'cpu' | 'online' }`
- タイトル: 「コインを選ぶ」
- コイン3つの選択肢（火・水・渦）各カードにアイコン・名前・説明
- 難易度選択: 「ふつう」/「つよい（AIバッジ付）」（CPUモードのみ表示）
- 選択時:
  - CPU → GameScreen（coin, difficulty）
  - Online → OnlineLobbyScreen（coin）
- 「← 戻る」ボタン

### 4. GameScreen（CPU対戦のメイン画面）
- params: `{ coin: CoinType, difficulty: Difficulty }`
- ヘッダー: プレイヤー側（コイン+名前+配置数）VS CPU側
- フェーズバッジ:「配置フェーズ」/「移動フェーズ」
- タイマー（移動フェーズのみ表示）:
  - リング + 数字 + バー + 煽りテキスト
  - 緊急時（35%以下）パルスアニメーション
- ステータステキスト:「コインを置いてください（N枚目）」等
- 3x3ゲームボード:
  - 空セル: タップで配置（配置フェーズ）
  - 自分のコイン: タップで選択（移動フェーズ）
  - 移動先候補: 金色ドット付き空セル
  - 選択中: 金色グロウパルス
  - 勝利ライン: 金色点滅
- 「メニューへ」ボタン
- CPU思考中: 720ms待機後に自動配置 / 800ms待機後に移動

### 5. ResultScreen
- params: `{ result, coin, mode }`
- 4パターン:
  - 勝利: 🏆 金色 「すばらしい！CPUに勝ちました！」
  - 敗北: 💀 赤色 「CPUに負けました。リベンジしよう！」
  - 引分: 🤝 青色 「いい勝負でした！」
  - 時間切れ: ⏰ 赤色 「制限時間内に動かせませんでした…」
- アイコンバウンスインアニメーション（0.44秒）
- 「もう一度」ボタン → 同じコインでGameScreen再開
- 「メニューへ」ボタン

### 6. RankingScreen
- タイトル: 「ランキング」「TOP 5」
- ランキングリスト（初期はダミーデータ）
  - 順位（金/銀/銅カラー）・コインアイコン+名前・スコア
- オンラインランキングはPhase 3で実データに差し替え
- 「← 戻る」ボタン

### 7. OnlineLobbyScreen (Phase 3)
- マッチング待機画面
- 「対戦相手を探しています...」テキスト
- 検索アイコン + ローディングアニメーション
- 「キャンセル」ボタン
- マッチング成功 → OnlineGameScreen

### 8. OnlineGameScreen (Phase 3)
- GameScreenベースだがSocket.io連携
- 相手のターン中は操作不可
- 切断検出→結果画面

## 品質基準
- 全画面で`SafeAreaView`使用
- 画面遷移は`navigation.replace`（戻るを無効にする場合）or `navigate`
- レスポンシブ: `Dimensions.get('window')`でサイズ計算
- タッチフィードバック: Expo Haptics使用
