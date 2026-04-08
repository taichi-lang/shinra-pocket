# 🧠 Agent 02: ゲームロジックエージェント

## 役割
ゲームの全ロジック（配置・移動・勝利判定・AI）をピュアTypeScriptモジュールとして実装する。
UIに依存しない純粋なロジック層。

## 担当ファイル
- `src/game/types.ts` — 型定義（CoinType, Phase, Turn, GameState, Difficulty等）
- `src/game/engine.ts` — ゲームエンジン（状態管理・配置・移動・勝利判定）
- `src/game/aiNormal.ts` — ふつうAI（ルールベース）
- `src/game/aiHard.ts` — つよいAI（Minimax + αβ枝刈り）
- `src/game/timer.ts` — タイマーロジック（制限時間計算）
- `src/game/useGameState.ts` — React Hook（UIとエンジンの橋渡し）

## 型定義 (types.ts)
```typescript
export type CoinType = 'fire' | 'water' | 'swirl';
export type CellState = 'player' | 'cpu' | null;
export type Phase = 'place' | 'move';
export type Turn = 'player' | 'cpu';
export type Difficulty = 'normal' | 'hard';
export type GameResult = 'player' | 'cpu' | 'draw' | 'timeout';

export interface GameState {
  board: CellState[];        // 9マス
  phase: Phase;
  turn: Turn;
  active: boolean;
  pCoin: CoinType;
  cCoin: CoinType;
  pPlaced: number;           // プレイヤー配置数 (max 4)
  cPlaced: number;           // CPU配置数 (max 4)
  selected: number | null;   // 移動フェーズで選択中のセルindex
  moveRound: number;         // 移動フェーズのラウンド数（タイマー計算用）
  difficulty: Difficulty;
}
```

## ゲームエンジン (engine.ts) 仕様

### 配置フェーズ
- `placeCoin(state, cellIndex)` → 指定セルにコインを配置
- 各プレイヤー最大4枚（合計8枚/9マス）
- 配置後に `checkWin()` → 3つ揃えば即勝利
- 8枚配置完了 → 自動で移動フェーズへ移行

### 移動フェーズ
- `selectCoin(state, cellIndex)` → 自分のコインを選択/選択解除
- `moveCoin(state, fromIndex, toIndex)` → 空きマスへ移動（隣接制限なし）
- 移動後に `checkWin()` → 3つ揃えば勝利

### 勝利判定
- `checkWin(board, who)` → 8つの勝利ライン判定
- `getWinningLine(board, who)` → 勝利ラインのセルindex配列を返す

## AI仕様

### ふつう (aiNormal.ts)
配置フェーズ:
1. 即勝利手があれば実行
2. 相手の勝利をブロック
3. 中央（index 4）を優先
4. 角（0,2,6,8）からランダム
5. 残りマスからランダム

移動フェーズ:
1. 勝てる移動があれば実行
2. 相手の勝利ブロック（相手の移動をシミュレーション）
3. ランダム移動

### つよい (aiHard.ts)
配置フェーズ:
- `minimaxPlace(board, pPlaced, cPlaced, isPlayerTurn, depth, alpha, beta)`
- 探索深度: 最大7
- 配置完了時は移動フェーズを深さ10でシミュレーション

移動フェーズ:
- `minimaxMove(board, isPlayerTurn, depth, alpha, beta, maxDepth=10)`
- 全空きマスへの移動を探索（隣接制限なし）

評価関数 `scoreBoard(board)`:
- 各勝利ラインを走査
- CPU 2枚揃い（相手0）= +4点
- CPU 1枚（相手0）= +1点
- Player側は同様にマイナス
- 勝利 = +10-depth / 敗北 = depth-10

## タイマー (timer.ts)
```typescript
export function getTimeLimit(moveRound: number): number {
  return Math.max(1.0, 5.0 - moveRound * 0.5);
}
// ラウンド0=5秒, 1=4.5秒, 2=4秒, ... 8+=1秒
```

## useGameState Hook
- ゲーム状態のReact管理
- CPU思考の非同期処理（setTimeout 720ms / 800ms）
- タイマーのsetInterval管理
- gameTokenでの中断制御（連打対策）

## 品質基準
- ロジックは全てUIに依存しない純粋関数
- AIの探索は同期処理（UIスレッドブロック注意→将来的にWeb Worker化検討）
- 全関数にJSDocコメント
