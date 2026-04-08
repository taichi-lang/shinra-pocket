# 🎨 Agent 01: UI基盤エージェント

## 役割
アプリ全体の共通UIコンポーネント、テーマ、ナビゲーション設定を構築する。

## 担当ファイル
- `src/utils/theme.ts` — カラーパレット・フォント・共通スタイル定数
- `src/utils/constants.ts` — コイン設定・勝利パターン・隣接セル等のゲーム定数
- `src/components/StarBackground.tsx` — 星空背景アニメーション
- `src/components/Coin.tsx` — コインコンポーネント（3種類対応・アニメーション付）
- `src/components/CoinButton.tsx` — コイン選択ボタン
- `src/components/GradientButton.tsx` — グラデーションボタン（はじめる等）
- `src/components/PhaseIndicator.tsx` — 配置/移動フェーズ表示バッジ
- `src/components/PlayerIndicator.tsx` — プレイヤー/CPU表示（アクティブ切替）
- `src/components/TimerRing.tsx` — タイマーリングUI（SVG + アニメーション）
- `src/components/BoardCell.tsx` — ゲームボードの1セル
- `src/components/GameBoard.tsx` — 3x3ボード全体
- `App.tsx` — ナビゲーション設定の最終調整

## デザイン仕様

### カラーパレット（宇宙テーマ・ダーク）
```typescript
export const COLORS = {
  bgDark: '#050510',
  bgMid: '#1a0a2e',
  bgDeep: '#0d1b3e',
  gold: '#ffd700',
  goldDim: '#ccaa33',
  orange: '#ff8c00',
  white: '#ffffff',
  lightGray: '#bbbbcc',
  muted: '#776699',
  fire: { primary: '#ffaa44', secondary: '#cc2200' },
  water: { primary: '#44ddff', secondary: '#0044cc' },
  swirl: { primary: '#dd88ff', secondary: '#5500cc' },
  red: '#ff4455',
  cardBg: '#1e143a',
  cardBorder: '#332855',
};
```

### コイン設定
```typescript
export const COINS = {
  fire:  { emoji: '🔥', label: '火のコイン', desc: '熱き炎で勝利を掴め' },
  water: { emoji: '💧', label: '水のコイン', desc: '冷静な判断で勝利へ' },
  swirl: { emoji: '🌀', label: '紫の渦コイン', desc: '神秘の力で圧倒せよ' },
};
export const CPU_MAP = { fire: 'water', water: 'swirl', swirl: 'fire' };
```

### 勝利パターン
```typescript
export const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
```

### アニメーション要件
- **StarBackground**: 55個の星がランダムに瞬く（Reanimated使用）
- **Coin**: 配置時にscale(0)→scale(1) + 回転アニメーション（0.26秒）
- **TimerRing**: SVG円弧が減少 + 色変化（金→橙→赤）+ 緊急時パルス
- **BoardCell**: 選択時に金色グロウパルス / 移動先候補に点線円表示

## 品質基準
- TypeScript strict mode 準拠
- コンポーネントはすべてReact.FC<Props>型付き
- Reanimatedのワークレットでアニメーション処理
- iOS / Androidの両方でレイアウト崩れなし
