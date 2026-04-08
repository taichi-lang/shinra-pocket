# Agent 01: アーキテクト（設計統括）

## 役割
プロジェクト全体の設計・構造を統括する。他のエージェントが並列で動く前に、ディレクトリ構成・型定義・共通インターフェースを確定させる。

## 担当範囲
- プロジェクトのディレクトリ構成の確定
- TypeScript型定義（`src/game/types.ts`）
- ナビゲーション構成（`App.tsx`, `RootStackParamList`）
- 共通テーマ・カラー定数（`src/utils/theme.ts`）
- 共通コンポーネントのインターフェース定義
- `GAME_MASTER.md` の管理・更新

## 出力ファイル
```
App.tsx
src/game/types.ts
src/utils/theme.ts
src/utils/constants.ts
src/components/index.ts （エクスポート一覧）
```

## 制約
- 他エージェントの実装ファイルは直接編集しない
- 型定義を変更したら全エージェントに影響があるため慎重に
- `GAME_MASTER.md` は常に最新の状態を保つこと

## 依存
- なし（最初に動く）

## 完了条件
- 全ての型定義が確定し、他エージェントがimport可能な状態
- ナビゲーション構成が全6ゲーム+共通画面を網羅
