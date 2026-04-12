"""
Instagram Graph API クライアント — @catnazu 運用用

使い方:
  1. .env に INSTAGRAM_ACCESS_TOKEN と INSTAGRAM_USER_ID を設定
  2. python instagram.py posts    → 過去投稿を一覧取得
  3. python instagram.py insights  → アカウント全体のインサイト
  4. python instagram.py post_detail <POST_ID> → 投稿の詳細+コメント
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

# .env 読み込み（dotenv不要の簡易版）
ENV_PATH = Path(__file__).parent / ".env"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
USER_ID = os.environ.get("INSTAGRAM_USER_ID", "")
API_BASE = "https://graph.facebook.com/v21.0"


def api_get(endpoint, params=None):
    """Graph API GET リクエスト"""
    params = params or {}
    params["access_token"] = TOKEN
    url = f"{API_BASE}/{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def get_instagram_user_id():
    """トークンから Instagram Business Account ID を取得"""
    # まず Facebook Pages を取得
    data = api_get("me/accounts", {"fields": "id,name,instagram_business_account"})
    for page in data.get("data", []):
        ig = page.get("instagram_business_account")
        if ig:
            print(f"  Page: {page['name']}")
            print(f"  Instagram Business Account ID: {ig['id']}")
            return ig["id"]
    print("Instagram Business Account が見つかりません。")
    print("プロアカウント（クリエイター/ビジネス）に切り替え済みか確認してください。")
    return None


def get_posts(limit=25):
    """過去投稿を一覧取得"""
    fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink"
    data = api_get(f"{USER_ID}/media", {"fields": fields, "limit": limit})

    posts = data.get("data", [])
    print(f"\n📸 過去投稿 ({len(posts)}件)")
    print("=" * 60)

    for i, post in enumerate(posts, 1):
        ts = post.get("timestamp", "")
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M") if ts else "不明"
        caption = post.get("caption", "(キャプションなし)")
        caption_preview = caption[:80].replace("\n", " ") + ("..." if len(caption) > 80 else "")
        media_type = post.get("media_type", "")
        likes = post.get("like_count", 0)
        comments = post.get("comments_count", 0)

        print(f"\n#{i} [{media_type}] {dt}")
        print(f"   ❤️  {likes}  💬 {comments}")
        print(f"   {caption_preview}")
        print(f"   {post.get('permalink', '')}")

    return posts


def get_post_detail(post_id):
    """投稿の詳細 + コメント取得"""
    fields = "id,caption,media_type,media_url,timestamp,like_count,comments_count,permalink"
    post = api_get(post_id, {"fields": fields})

    print(f"\n📸 投稿詳細")
    print("=" * 60)
    print(f"日時: {post.get('timestamp', '')}")
    print(f"タイプ: {post.get('media_type', '')}")
    print(f"❤️  {post.get('like_count', 0)}  💬 {post.get('comments_count', 0)}")
    print(f"\nキャプション:\n{post.get('caption', '(なし)')}")
    print(f"\nURL: {post.get('permalink', '')}")

    # コメント取得
    comments_data = api_get(f"{post_id}/comments", {
        "fields": "id,text,timestamp,username,like_count",
        "limit": 50
    })
    comments = comments_data.get("data", [])
    if comments:
        print(f"\n💬 コメント ({len(comments)}件)")
        print("-" * 40)
        for c in comments:
            ts = c.get("timestamp", "")
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%m/%d %H:%M") if ts else ""
            print(f"  @{c.get('username', '?')} ({dt}) ❤️ {c.get('like_count', 0)}")
            print(f"    {c.get('text', '')}")

    return post, comments


def get_insights():
    """アカウントのインサイト（過去28日）"""
    metrics = "impressions,reach,profile_views,website_clicks,follower_count"
    data = api_get(f"{USER_ID}/insights", {
        "metric": metrics,
        "period": "day",
        "since": "",  # 直近28日分がデフォルト
    })

    print(f"\n📊 アカウントインサイト")
    print("=" * 60)

    for metric in data.get("data", []):
        name = metric.get("name", "")
        title = metric.get("title", name)
        values = metric.get("values", [])
        if values:
            total = sum(v.get("value", 0) for v in values)
            latest = values[-1].get("value", 0)
            print(f"  {title}: 直近値 {latest} / 期間合計 {total}")

    return data


def get_media_insights(post_id):
    """個別投稿のインサイト"""
    metrics = "impressions,reach,engagement,saved"
    data = api_get(f"{post_id}/insights", {"metric": metrics})

    print(f"\n📊 投稿インサイト ({post_id})")
    print("-" * 40)
    for metric in data.get("data", []):
        name = metric.get("title", metric.get("name", ""))
        val = metric.get("values", [{}])[0].get("value", 0)
        print(f"  {name}: {val}")

    return data


def exchange_long_lived_token(short_token, app_id, app_secret):
    """短命トークン → 長命トークン（60日）に変換"""
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": short_token,
    }
    url = f"https://graph.facebook.com/v21.0/oauth/access_token?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())

    new_token = data.get("access_token", "")
    expires_in = data.get("expires_in", 0)
    days = expires_in // 86400

    print(f"\n🔑 長命トークン取得成功（有効期限: {days}日）")
    print(f"   トークン: {new_token[:20]}...{new_token[-10:]}")
    print(f"\n   .env の INSTAGRAM_ACCESS_TOKEN を更新してください")

    return new_token


def export_all_posts_json(limit=100):
    """全投稿をJSONでエクスポート（分析用）"""
    fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink"
    all_posts = []
    params = {"fields": fields, "limit": 50}

    while True:
        data = api_get(f"{USER_ID}/media", params)
        posts = data.get("data", [])
        all_posts.extend(posts)

        if len(all_posts) >= limit:
            break

        paging = data.get("paging", {})
        next_url = paging.get("next")
        if not next_url:
            break
        # next URL からcursorを抽出
        after = paging.get("cursors", {}).get("after")
        if not after:
            break
        params["after"] = after

    output_path = Path(__file__).parent / "posts_export.json"
    output_path.write_text(json.dumps(all_posts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ {len(all_posts)}件の投稿を {output_path} にエクスポートしました")
    return all_posts


# --- CLI ---
if __name__ == "__main__":
    if not TOKEN:
        print("❌ INSTAGRAM_ACCESS_TOKEN が未設定です")
        print("   nazu/api/.env に以下を追加:")
        print("   INSTAGRAM_ACCESS_TOKEN=your_token_here")
        print("   INSTAGRAM_USER_ID=your_ig_user_id")
        print()
        print("   User ID が不明なら: python instagram.py whoami")
        sys.exit(1)

    cmd = sys.argv[1] if len(sys.argv) > 1 else "posts"

    if cmd == "whoami":
        # トークンからIG User IDを自動取得
        uid = get_instagram_user_id()
        if uid:
            print(f"\n.env に追加:\nINSTAGRAM_USER_ID={uid}")

    elif cmd == "posts":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 25
        get_posts(n)

    elif cmd == "post_detail":
        if len(sys.argv) < 3:
            print("使い方: python instagram.py post_detail <POST_ID>")
            sys.exit(1)
        get_post_detail(sys.argv[2])

    elif cmd == "insights":
        get_insights()

    elif cmd == "export":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        export_all_posts_json(n)

    elif cmd == "long_token":
        if len(sys.argv) < 4:
            print("使い方: python instagram.py long_token <APP_ID> <APP_SECRET>")
            print("現在のトークン(.env)を長命トークンに変換します")
            sys.exit(1)
        exchange_long_lived_token(TOKEN, sys.argv[2], sys.argv[3])

    else:
        print("コマンド: whoami | posts [n] | post_detail <ID> | insights | export [n] | long_token <APP_ID> <APP_SECRET>")
