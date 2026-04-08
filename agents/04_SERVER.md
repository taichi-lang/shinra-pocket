# 🖥️ Agent 04: サーバーエージェント

## 役割
オンライン対戦・ランキング機能のバックエンドサーバーを構築する。
Node.js + Express + Socket.io でリアルタイム通信を提供。

## 担当ファイル
- `server/package.json` — サーバー依存関係
- `server/index.js` — エントリーポイント（Express + Socket.io起動）
- `server/matchmaking.js` — マッチメイキングロジック
- `server/gameRoom.js` — ゲームルーム管理（対戦状態同期）
- `server/ranking.js` — ランキングAPI（REST）
- `server/db.js` — データベース接続（SQLite / PostgreSQL）
- `server/.env.example` — 環境変数テンプレート

## サーバー設定

### package.json
```json
{
  "name": "shinra-pocket-server",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.0",
    "dotenv": "^16.0.0",
    "uuid": "^9.0.0"
  }
}
```

## Socket.io イベント設計

### クライアント → サーバー
| イベント | ペイロード | 説明 |
|---------|-----------|------|
| `join_queue` | `{ playerId, nickname, coin }` | マッチングキューに参加 |
| `leave_queue` | `{ playerId }` | マッチングキャンセル |
| `place_coin` | `{ roomId, playerId, cellIndex }` | コイン配置 |
| `select_coin` | `{ roomId, playerId, cellIndex }` | コイン選択（移動フェーズ） |
| `move_coin` | `{ roomId, playerId, from, to }` | コイン移動 |
| `submit_score` | `{ playerId, nickname, score, coin }` | スコア送信 |

### サーバー → クライアント
| イベント | ペイロード | 説明 |
|---------|-----------|------|
| `match_found` | `{ roomId, opponent, yourTurn }` | マッチング成立 |
| `game_state` | `{ board, phase, turn, ... }` | 盤面状態の同期 |
| `opponent_placed` | `{ cellIndex }` | 相手がコインを配置 |
| `opponent_moved` | `{ from, to }` | 相手がコインを移動 |
| `game_over` | `{ result, winningLine }` | 勝敗結果 |
| `opponent_disconnected` | `{}` | 相手の切断通知 |
| `timer_sync` | `{ timeLeft, moveRound }` | タイマー同期 |

## マッチメイキング (matchmaking.js)

### ロジック
1. プレイヤーがキューに参加
2. キューに2人以上いたらマッチング
3. ルーム作成 → 先手/後手をランダム決定
4. コインは各自が選んだものを使用（CPU対戦の相性制限なし）
5. 30秒マッチングできなければタイムアウト通知

### データ構造
```javascript
const queue = []; // { socketId, playerId, nickname, coin, joinedAt }
const rooms = new Map(); // roomId -> GameRoom
```

## ゲームルーム (gameRoom.js)

### GameRoom クラス
```javascript
class GameRoom {
  constructor(roomId, player1, player2) {
    this.roomId = roomId;
    this.players = { p1: player1, p2: player2 };
    this.board = Array(9).fill(null);
    this.phase = 'place';
    this.turn = 'p1'; // ランダムで決定
    this.placed = { p1: 0, p2: 0 };
    this.moveRound = 0;
    this.timer = null;
  }
}
```

### タイマー管理
- サーバー側でタイマーを管理（クライアント側はUI表示のみ）
- 時間切れ → 該当プレイヤーの敗北を通知
- 切断 → 相手の勝利

## ランキングAPI (ranking.js)

### エンドポイント
| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/ranking` | TOP 100取得 |
| GET | `/api/ranking/:playerId` | 個人ランク取得 |
| POST | `/api/ranking` | スコア登録/更新 |

### ランキングテーブル
```sql
CREATE TABLE rankings (
  player_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  favorite_coin TEXT DEFAULT 'fire',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### スコア計算
- 勝利: +10pt
- 敗北: -3pt（最低0pt）
- 引分: +2pt
- タイムアウト負け: -5pt

## セキュリティ
- CORS設定（許可オリジンを限定）
- レート制限（1IPあたり100req/min）
- playerId はUUID v4で生成（クライアント側で初回起動時に生成・AsyncStorage保存）

## デプロイ
- 開発環境: `localhost:3000`
- 本番: Railway / Render / AWS EC2
- PM2でプロセス管理
- 環境変数: `PORT`, `DATABASE_URL`, `CORS_ORIGIN`
