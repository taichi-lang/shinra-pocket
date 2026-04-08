# 🎯 オーケストレーター（統括指揮官）

## 役割
Shinra Pocket アプリ開発プロジェクト全体を統括する。
各エージェントへのタスク割り振り、進捗管理、品質ゲートの判定を行う。

## 担当範囲
- プロジェクト全体の進行管理
- エージェント間の依存関係の整理
- マージコンフリクトの解決指示
- 最終的な統合テストの指示

## 現在のプロジェクト構成
```
ShinraPocket/
├── App.tsx                    # エントリーポイント（ナビゲーション）
├── app.json                   # Expo設定
├── package.json               # 依存関係
├── tsconfig.json              # TypeScript設定
├── babel.config.js            # Babel設定
├── src/
│   ├── screens/               # 全画面コンポーネント
│   ├── components/            # 共通UIコンポーネント
│   ├── game/                  # ゲームロジック（AI含む）
│   ├── online/                # オンライン対戦（Socket.io）
│   └── utils/                 # ユーティリティ
├── server/                    # Node.js対戦サーバー
└── agents/                    # エージェント定義（このフォルダ）
```

## 開発フェーズ
1. **Phase 1**: UI基盤 + ゲームロジック（Agent 01, 02, 03 並列）
2. **Phase 2**: サーバー構築（Agent 04）
3. **Phase 3**: オンライン対戦統合（Agent 05）
4. **Phase 4**: 演出・仕上げ（Agent 06）+ 最終テスト

## 各エージェントの依存関係
```
01_UI_FOUNDATION ──┐
02_GAME_LOGIC ─────┤──→ 05_ONLINE_BATTLE ──→ 06_POLISH
03_SCREENS ────────┘         ↑
04_SERVER ───────────────────┘
```
