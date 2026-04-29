"""Add compression query params to hero slide image URLs to reduce size by ~80%."""
import asyncio, os, re
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

def optimize_url(url: str) -> str:
    if not url:
        return url
    # Strip existing query
    base = url.split('?')[0]
    if 'images.unsplash.com' in base:
        return f"{base}?w=1920&q=75&auto=format&fit=crop&fm=webp"
    if 'images.pexels.com' in base:
        return f"{base}?auto=compress&cs=tinysrgb&w=1920&fm=webp"
    return url

async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    updated = 0
    
    # Hero slides
    async for s in db.hero_slides.find({}):
        new_url = optimize_url(s.get('image_url', ''))
        if new_url != s.get('image_url'):
            await db.hero_slides.update_one({'id': s['id']}, {'$set': {'image_url': new_url}})
            updated += 1
            print(f"  Hero: {s['title'][:30]:<30} -> {new_url[:80]}...")
    
    # Posts
    async for p in db.posts.find({}):
        changes = {}
        new_cover = optimize_url(p.get('cover_image', ''))
        if new_cover != p.get('cover_image'):
            changes['cover_image'] = new_cover
        new_og = optimize_url(p.get('og_image', ''))
        if new_og != p.get('og_image'):
            changes['og_image'] = new_og
        if changes:
            await db.posts.update_one({'id': p['id']}, {'$set': changes})
            updated += 1
    
    # Players
    async for pl in db.players.find({}):
        new_url = optimize_url(pl.get('photo_url', ''))
        if new_url != pl.get('photo_url'):
            await db.players.update_one({'id': pl['id']}, {'$set': {'photo_url': new_url}})
            updated += 1
    
    # Staff
    async for st in db.staff.find({}):
        new_url = optimize_url(st.get('photo_url', ''))
        if new_url != st.get('photo_url'):
            await db.staff.update_one({'id': st['id']}, {'$set': {'photo_url': new_url}})
            updated += 1
    
    print(f"\nTotal documents optimized: {updated}")

asyncio.run(main())
