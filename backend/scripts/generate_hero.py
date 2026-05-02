"""One-off: regenerate Livanespor hero slide #1 using the real team photo
as a stylistic reference + gpt-image-2 cinematic enhancement.

Run inside backend container:
    python /app/backend/scripts/generate_hero.py
"""
import asyncio
import base64
import os
import sys
from pathlib import Path

# Add backend root to path so we can reuse storage + db helpers
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

from openai import AsyncOpenAI
import storage as object_storage
from motor.motor_asyncio import AsyncIOMotorClient


ORIGINAL_PHOTO = "/tmp/team_photo_orig.jpg"
HERO_PROMPT = """Create a CINEMATIC, premium 16:9 horizontal hero banner image for a professional
football club website. Use the provided team squad photo as the EXACT reference: keep the
players' faces, their burgundy/maroon Hummel jerseys with orange accents, white shorts,
maroon socks, and the green pitch authentic and recognizable.

ENHANCEMENTS:
• Convert the daylight stadium atmosphere into a DRAMATIC golden-hour evening scene with
  warm volumetric floodlight rays cutting through subtle smoke and atmospheric haze.
• Deepen the shadows and add cinematic rim lighting on the players (warm amber rim from the right,
  cool teal rim from the left). Sports magazine cover quality.
• Subtle bokeh on the crowd in the background — keep them recognizable but slightly softened
  so the team in the foreground is the hero.
• Add a faint, tasteful gradient overlay from the bottom-left (deep black) fading toward the
  upper-right so the bottom-left has rich contrast for overlay headline text.
• Color grade: warm amber + deep crimson highlights, deep blacks. Premium editorial look.
• Composition: 16:9 wide horizontal, the squad lineup centered slightly lower-middle, keeping
  empty atmospheric space at top and to the sides for clean text overlay later.

STRICT RULES:
• Do NOT change the players' identities, jersey design, club crest on chest, or stadium
  identity. Preserve the LS / Livanespor crest as it appears.
• No fake logos, no extra text, no captions, no watermarks.
• No score boards, no ads on jerseys that aren't already there.
• Keep it photorealistic — this is a real squad, not an illustration.
"""


async def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY missing")

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise SystemExit("MONGO_URL/DB_NAME missing")

    db = AsyncIOMotorClient(mongo_url)[db_name]

    # Init object storage
    await object_storage.init_storage()

    if not Path(ORIGINAL_PHOTO).exists():
        raise SystemExit(f"Reference photo missing: {ORIGINAL_PHOTO}")

    print("→ Calling gpt-image-2 (images.edit) with reference photo …")
    oclient = AsyncOpenAI(api_key=api_key)
    with open(ORIGINAL_PHOTO, "rb") as f:
        try:
            resp = await oclient.images.edit(
                model="gpt-image-2",
                image=f,
                prompt=HERO_PROMPT,
                size="1536x1024",   # 3:2 → close to 16:9, gpt-image-2 supported size
                quality="high",
                n=1,
            )
        except Exception as e:
            print(f"   gpt-image-2 failed ({e}); retrying with gpt-image-1 …")
            f.seek(0)
            resp = await oclient.images.edit(
                model="gpt-image-1",
                image=f,
                prompt=HERO_PROMPT,
                size="1536x1024",
                quality="high",
                n=1,
            )

    b64 = resp.data[0].b64_json
    if not b64:
        raise SystemExit("No image returned")
    png = base64.b64decode(b64)
    print(f"   Got {len(png)} bytes")

    # Upload to Object Storage
    storage_path = object_storage.new_path("hero", ext="png")
    await object_storage.put_bytes(storage_path, png, content_type="image/png")
    public_url = f"/api/public/media/{storage_path}"
    print(f"→ Uploaded: {public_url}")

    # Persist a media row so it's traceable in Arşiv
    import uuid
    from datetime import datetime, timezone
    media_doc = {
        "id": str(uuid.uuid4()),
        "title": "Hero — Livanespor Squad (cinematic)",
        "type": "image",
        "purpose": "hero",
        "source": "ai_template",
        "storage_path": storage_path,
        "public_url": public_url,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.media.insert_one(media_doc)

    # Update Hero Slide #1 (order=1) with the new image URL
    res = await db.hero_slides.update_one(
        {"order": 1},
        {"$set": {"image_url": public_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    print(f"→ Updated hero slide order=1: matched={res.matched_count} modified={res.modified_count}")
    print(f"\nDone. New hero image URL: {public_url}")


if __name__ == "__main__":
    asyncio.run(main())
