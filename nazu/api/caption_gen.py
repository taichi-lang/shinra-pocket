"""
キャプション生成 — Claude API で写真からキャプション+ハッシュタグを自動生成

使い方:
  python caption_gen.py "D:\保存\Backup\IMG_2961.JPG"
  python caption_gen.py "D:\保存\Backup\IMG_2961.JPG" "朝、窓辺で日向ぼっこ"
"""

import os
import sys
import json
import base64
from pathlib import Path

# .env 読み込み
ENV_PATH = Path(__file__).parent / ".env"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

try:
    import anthropic
except ImportError:
    print("❌ anthropic パッケージが必要です: pip install anthropic")
    sys.exit(1)

SYSTEM_PROMPT = """あなたはInstagramアカウント @catnazu のキャプションライターです。

## 猫の情報
- 名前: なづ（♀）
- 種類: ブラックスモークタビー（黒虎）
- 2024年6月23日に田んぼで保護された元野良猫
- 現在は室内飼い

## トーンルール
- 飼い主の素朴な観察目線で書く。なづ視点（一人称）は使わない
- 2〜4文。最大6文。短いほど良い
- 絵文字は0〜2個。猫関連のみ（🐈‍⬛🐾）
- 感嘆符は1回まで
- 「かわいい」「癒し」等の形容詞より、行動や状態の描写を優先
- 嘘をつかない。写真から読み取れることだけ書く

## 出力フォーマット
以下のJSON形式で返してください（```json``` ブロックで囲む）:

{
  "caption": "キャプション本文（ハッシュタグなし）",
  "hashtags": ["タグ1", "タグ2", ...],
  "alt_text": "写真のalt text（視覚障害者向け、日本語、1文）",
  "caption_en": "英語版キャプション（海外リーチ用）"
}

## ハッシュタグルール
- 必須固定タグ（毎回含める）: #保護猫 #黒猫 #ブラックスモークタビー #blacksmoketabby #catnazu
- 残りは写真の内容・季節・行動に合わせて選ぶ
- 日本語タグと英語タグを混ぜる（比率 7:3）
- 合計15〜20個
- 投稿ごとに30%以上のタグを入れ替える（ローテーション）"""


def generate_caption(image_path: str, note: str = "") -> dict:
    """写真からキャプションを生成"""
    path = Path(image_path)
    if not path.exists():
        print(f"❌ ファイルが見つかりません: {image_path}")
        sys.exit(1)

    # 画像をbase64エンコード
    image_data = base64.standard_b64encode(path.read_bytes()).decode("utf-8")

    # MIMEタイプ判定
    ext = path.suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
    media_type = mime_map.get(ext, "image/jpeg")

    # メッセージ構築
    content = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": image_data,
            },
        }
    ]
    if note:
        content.append({"type": "text", "text": f"補足: {note}"})
    else:
        content.append({"type": "text", "text": "この写真のキャプションを生成してください。"})

    # Claude API 呼び出し
    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-6-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}],
    )

    # レスポンスからJSON抽出
    response_text = message.content[0].text

    # ```json ... ``` ブロックを抽出
    if "```json" in response_text:
        json_str = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        json_str = response_text.split("```")[1].split("```")[0].strip()
    else:
        json_str = response_text.strip()

    result = json.loads(json_str)
    return result


def print_result(result: dict, image_path: str):
    """結果を整形表示"""
    print(f"\n📸 {Path(image_path).name}")
    print("=" * 60)
    print(f"\n📝 キャプション:")
    print(result.get("caption", ""))
    print(f"\n🏷️  ハッシュタグ ({len(result.get('hashtags', []))}個):")
    print(" ".join(result.get("hashtags", [])))
    print(f"\n👁️  ALT: {result.get('alt_text', '')}")
    print(f"\n🌐 EN: {result.get('caption_en', '')}")

    # コピペ用の完成形
    print(f"\n{'─' * 60}")
    print("📋 コピペ用（キャプション + ハッシュタグ）:")
    print(f"{'─' * 60}")
    caption = result.get("caption", "")
    tags = "\n.\n" + " ".join(result.get("hashtags", []))
    print(f"{caption}{tags}")


def save_result(result: dict, image_path: str):
    """結果をJSONファイルに保存"""
    output_dir = Path(__file__).parent / "drafts"
    output_dir.mkdir(exist_ok=True)

    stem = Path(image_path).stem
    output_path = output_dir / f"{stem}_caption.json"
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n💾 保存: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使い方:")
        print('  python caption_gen.py "D:\\保存\\Backup\\IMG_2961.JPG"')
        print('  python caption_gen.py "D:\\保存\\Backup\\IMG_2961.JPG" "朝の日向ぼっこ"')
        sys.exit(1)

    image_path = sys.argv[1]
    note = sys.argv[2] if len(sys.argv) > 2 else ""

    print(f"🤖 キャプション生成中...")
    result = generate_caption(image_path, note)
    print_result(result, image_path)
    save_result(result, image_path)
