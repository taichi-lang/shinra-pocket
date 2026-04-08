# サーバーデプロイ手順 (Railway)

## 1. Railway アカウント作成
1. https://railway.app/ にアクセス
2. GitHubアカウントでサインアップ（無料）

## 2. プロジェクト作成
1. Dashboard → "New Project"
2. "Deploy from GitHub repo" を選択
3. このリポジトリを選択
4. Root Directory を `server` に設定

## 3. 環境変数設定
Variables タブで以下を追加:
- JWT_SECRET: （ランダムな文字列）
- ADMIN_API_KEY: （管理者キー）
- NODE_ENV: production

## 4. データベース追加
1. "+ New" → "Database" → "PostgreSQL"
2. 自動的に DATABASE_URL が設定される

## 5. デプロイ確認
デプロイ完了後、表示されるURLに /health でアクセス
→ {"status":"ok"} が返ればOK

## 6. クライアント設定
表示されたURL（例: https://xxx.railway.app）を
ShinraPocket/src/config.ts の SERVER_URL に設定
