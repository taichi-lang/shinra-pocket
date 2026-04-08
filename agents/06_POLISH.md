# ✨ Agent 06: 演出・仕上げエージェント

## 役割
アプリ全体の演出・アニメーション強化、サウンド、触覚フィードバック、
パフォーマンス最適化、ストアリリース準備を担当。

## 担当ファイル
- `src/utils/haptics.ts` — 触覚フィードバック（Expo Haptics）
- `src/utils/sounds.ts` — 効果音（Expo Audio）
- `src/components/WinAnimation.tsx` — 勝利演出（紙吹雪等）
- `src/components/CoinDropAnimation.tsx` — コイン配置時の強化演出
- `assets/sounds/` — 効果音ファイル格納
- `assets/icon.png` — アプリアイコン
- `assets/splash.png` — スプラッシュ画像（Expo用）
- `eas.json` — EAS Build設定

## 触覚フィードバック (haptics.ts)
```typescript
import * as Haptics from 'expo-haptics';

export const haptic = {
  // コイン配置時
  place: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  // コイン選択時
  select: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  // コイン移動時
  move: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  // 勝利
  win: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  // 敗北
  lose: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  // タイマー警告
  timerWarning: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  // ボタンタップ
  tap: () => Haptics.selectionAsync(),
};
```

## 効果音 (sounds.ts)
```typescript
import { Audio } from 'expo-av';

// 用意すべき効果音:
// - coin_place.mp3 : コイン配置「カチン」
// - coin_move.mp3  : コイン移動「スッ」
// - coin_select.mp3: コイン選択「ポン」
// - win.mp3        : 勝利ファンファーレ
// - lose.mp3       : 敗北効果音
// - draw.mp3       : 引き分け
// - timeout.mp3    : 時間切れ「ブー」
// - timer_tick.mp3 : タイマー残り少「チッチッ」
// - menu_tap.mp3   : メニューボタン「タッ」
```

## アニメーション強化

### 星空背景の改善
- Reanimated SharedValue で滑らかな明滅
- 流れ星を時々表示（ランダム頻度）

### コイン配置演出
- scale(0) → scale(1.15) → scale(1) のバウンス
- 同時に回転（-180° → 0°）
- 配置マスに金色のパーティクルリング

### 勝利演出
- 3つ揃ったラインが順番に光る
- 画面全体に金色パーティクル
- 勝利テキストがscale(0) → bounce in

### 移動フェーズ演出
- 選択コインの金色グロウパルス
- 移動先候補マスの点滅ドット
- 移動実行時のスライドアニメーション

### タイマー演出
- 残り35%以下: 数字パルス + 赤色化
- 残り1秒以下: 画面端が赤くフラッシュ

## パフォーマンス最適化
- `React.memo` で不要な再レンダリング防止
- ボード更新は必要なセルのみ
- Reanimated ワークレットでJSスレッド負荷軽減
- 画像アセットは最適化済みで同梱

## ストアリリース準備

### EAS Build設定 (eas.json)
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### アプリアイコン
- 1024x1024px PNG
- 宇宙テーマの暗い背景 + 金色「SP」ロゴ + 3コイン

### アプリスクリーンショット
- iPhone 6.7": 1290×2796px
- Android: 1080×1920px
- 5枚: スプラッシュ、ゲーム配置、ゲーム移動、リザルト、オンライン対戦

### ストア説明文
```
🔥💧🌀 Shinra Pocket - コイン戦略ボードゲーム

3×3のボード上でコインを配置して移動！
3つ揃えれば勝利の、シンプルだけど奥深い戦略ゲーム。

【特徴】
・3種類のコインから選べる（火・水・渦）
・CPU対戦（ふつう / つよいAI搭載）
・オンライン対戦でリアルタイムバトル
・全国ランキングで腕試し
・移動フェーズの制限時間でスリル満点

無料で遊べます。さあ、コインを手に取れ！
```

## 品質基準
- 60fps維持（Reanimatedで確認）
- メモリ使用量の監視
- 効果音の遅延なし（プリロード）
- iOS / Android両方で全演出が正常動作
