# 🌐 Agent 05: オンライン対戦エージェント

## 役割
クライアント側のオンライン対戦機能を実装する。
Socket.ioクライアント接続、マッチメイキングUI、リアルタイム対戦の状態同期を担当。

## 依存関係
- Agent 01: UI共通コンポーネント
- Agent 02: ゲームロジック（勝利判定等の共有）
- Agent 03: OnlineLobbyScreen / OnlineGameScreen の画面枠
- Agent 04: サーバー側のSocket.ioイベント仕様

## 担当ファイル
- `src/online/socketClient.ts` — Socket.io接続管理シングルトン
- `src/online/useOnlineGame.ts` — オンライン対戦用React Hook
- `src/online/useMatchmaking.ts` — マッチメイキング用React Hook
- `src/online/playerStorage.ts` — プレイヤーID・ニックネーム管理
- `src/screens/OnlineLobbyScreen.tsx` — マッチング画面の実装
- `src/screens/OnlineGameScreen.tsx` — オンライン対戦画面の実装

## socketClient.ts
```typescript
import { io, Socket } from 'socket.io-client';

const SERVER_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://your-production-server.com';

class SocketClient {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SERVER_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }
    return this.socket;
  }

  disconnect(): void { ... }
  getSocket(): Socket | null { ... }
}

export default new SocketClient();
```

## useMatchmaking.ts
```typescript
interface MatchmakingState {
  status: 'idle' | 'searching' | 'found' | 'timeout' | 'error';
  roomId: string | null;
  opponent: { nickname: string; coin: CoinType } | null;
  myTurn: boolean;
}

function useMatchmaking(playerId: string, coin: CoinType) {
  // join_queue → match_found イベントをリッスン
  // 30秒タイムアウト処理
  // キャンセル機能
  return { state, joinQueue, leaveQueue };
}
```

## useOnlineGame.ts
```typescript
interface OnlineGameState {
  board: CellState[];
  phase: Phase;
  isMyTurn: boolean;
  selected: number | null;
  moveRound: number;
  timeLeft: number;
  result: GameResult | null;
  opponentDisconnected: boolean;
}

function useOnlineGame(roomId: string, playerId: string) {
  // game_state, opponent_placed, opponent_moved, game_over イベント処理
  // placeCoin, selectCoin, moveCoin → サーバーへ送信
  // タイマーはサーバーから同期（timer_sync）
  return { state, placeCoin, selectCoin, moveCoin };
}
```

## playerStorage.ts
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid'; // or expo-crypto

export async function getPlayerId(): Promise<string> {
  let id = await AsyncStorage.getItem('player_id');
  if (!id) {
    id = uuidv4();
    await AsyncStorage.setItem('player_id', id);
  }
  return id;
}

export async function getNickname(): Promise<string> { ... }
export async function setNickname(name: string): Promise<void> { ... }
```

## OnlineLobbyScreen の実装詳細
1. 画面表示時に `getPlayerId()` でID取得
2. 「マッチング開始」で `joinQueue` 呼び出し
3. 検索中アニメーション表示
4. `match_found` 受信 → OnlineGameScreenへ遷移
5. キャンセルボタン → `leaveQueue` → MenuScreenへ戻る
6. 30秒タイムアウト → ダイアログ表示

## OnlineGameScreen の実装詳細
- GameScreenと同じUIをベースに
- CPU処理の代わりにSocket.ioイベントで相手の行動を受信
- 自分のターン: タップ操作 → サーバーへ送信
- 相手のターン: 操作無効 + 「相手のターン...」表示
- タイマーはサーバー同期（timer_sync）
- 切断検出: opponent_disconnected → 勝利判定

## 切断・再接続処理
- Socket.ioの reconnection 機能を活用
- 再接続時: roomId で再参加試行
- 5回失敗: 接続エラー画面表示
- 相手切断: 3秒待機 → 再接続なし → 勝利扱い

## 品質基準
- 通信エラーのハンドリング（タイムアウト・切断・サーバーエラー）
- ローディング状態のUI表示
- メモリリーク防止（useEffect cleanup でソケットリスナー解除）
