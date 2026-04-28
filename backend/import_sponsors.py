"""Replace all sponsors with Dijital Roket entries."""
import asyncio, os, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from slugify import slugify

ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

def now(): return datetime.now(timezone.utc).isoformat()
def nid(): return str(uuid.uuid4())

# All sponsors are Dijital Roket (placeholder until real ones are signed)
SPONSORS = [
    # (name, level, scope, description, website, instagram, age_group, order)
    ("Dijital Roket", "main", "both", "Resmi Ana Sponsorumuz", "https://www.dijitalroket.com", "https://www.instagram.com/dijitalroket/", None, 1),
    ("Dijital Roket", "forma", "club", "A Takım Forma Sponsoru", "https://www.dijitalroket.com", "https://www.instagram.com/dijitalroket/", None, 2),
    ("Dijital Roket", "jersey", "academy", "U15 Forma Sponsoru", "https://www.dijitalroket.com", "https://www.instagram.com/dijitalroket/", "U15", 3),
    ("Dijital Roket", "supporter", "both", "Destekçimiz", "https://www.dijitalroket.com", "https://www.instagram.com/dijitalroket/", None, 4),
    ("Dijital Roket", "corporate", "club", "Kurumsal İş Ortağımız", "https://www.dijitalroket.com", "https://www.instagram.com/dijitalroket/", None, 5),
]

async def main():
    res = await db.sponsors.delete_many({})
    print(f"Deleted {res.deleted_count} existing sponsors")
    docs = []
    for name, level, scope, desc, web, ig, age, order in SPONSORS:
        docs.append({
            "id": nid(),
            "slug": f"{slugify(name)}-{level}-{uuid.uuid4().hex[:6]}",
            "name": name, "level": level, "scope": scope,
            "description": desc, "website": web, "instagram": ig,
            "age_group": age, "logo_url": "",
            "order": order, "active": True,
            "created_at": now(), "updated_at": now(),
        })
    await db.sponsors.insert_many(docs)
    print(f"Inserted {len(docs)} sponsor entries (all Dijital Roket placeholder)")

asyncio.run(main())
