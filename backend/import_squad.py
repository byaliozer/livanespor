"""One-time import of real Livanespor squad + staff from PDF data."""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import uuid
from slugify import slugify

ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

def now(): return datetime.now(timezone.utc).isoformat()
def nid(): return str(uuid.uuid4())
def slugify_unique(s): return f"{slugify(s, lowercase=True)}-{uuid.uuid4().hex[:6]}"

# Position assignment by jersey number convention
POSITION_MAP = {
    1: "Kaleci", 12: "Kaleci",
    2: "Defans", 3: "Defans", 4: "Defans", 5: "Defans",
    21: "Defans", 49: "Defans", 70: "Defans",
    6: "Orta Saha", 7: "Orta Saha", 8: "Orta Saha", 10: "Orta Saha",
    11: "Orta Saha", 16: "Orta Saha", 25: "Orta Saha", 88: "Orta Saha",
    9: "Forvet", 24: "Forvet", 35: "Forvet", 77: "Forvet",
}

# (name, jersey, dob_dmy)
PLAYERS = [
    ("Oğuzhan Aygar", 12, "30.04.1998"),
    ("İsmail Hakkı Kılıçaslan", 3, "21.03.2005"),
    ("Enes Kürkcü", 4, "22.04.1992"),
    ("Taha Berk Turan", 5, "10.06.2000"),
    ("Ramazan Boyraz", 7, "01.02.1997"),
    ("Burak Kocatürk", 9, "01.07.1997"),
    ("Erdem Durmuş", 10, "04.10.1999"),
    ("İlkay Adaş", 16, "13.03.2003"),
    ("Yunus Emre Yıldız", 24, "24.06.2002"),
    ("Ercan Savaşeri", 35, "19.07.1994"),
    ("Orhun Tunalı", 77, "13.01.2006"),
    ("Adem Özkan", 1, "20.09.2000"),
    ("Arda Gül", 21, "09.12.2008"),
    ("Osman Emir Koşucu", 2, "16.03.1991"),
    ("Tayyip Akdeniz", 6, "04.07.1999"),
    ("Batuhan Durdu", 11, "14.09.2000"),
    ("Polat Kars", 25, "17.04.2004"),
    ("Arda Acar", 49, "24.06.2006"),
    ("İlteriş Karakaya", 70, "01.04.2005"),
    ("Esat Mahmut Sönmez", 88, "03.02.2007"),
]

STAFF = [
    ("Orkan Akyürek", "Yönetici", "a-team", 1),
    ("Tarkan Civelek", "Amatör Takım Teknik Sorumlusu", "a-team", 2),
    ("Önder Bilgin", "Amatör Takım Antrenörü", "a-team", 3),
    ("Özcan Pehlivan", "Amatör Takım Kaleci Antrenörü", "a-team", 4),
]

def parse_dob(dmy: str):
    d, m, y = dmy.split(".")
    return int(y), datetime(int(y), int(m), int(d), tzinfo=timezone.utc).date().isoformat()

async def main():
    # Wipe existing players + staff (demo data)
    pres = await db.players.delete_many({})
    sres = await db.staff.delete_many({})
    print(f"Deleted: {pres.deleted_count} players, {sres.deleted_count} staff")

    # Insert players
    today = datetime.now(timezone.utc).date()
    docs = []
    for i, (name, jersey, dob) in enumerate(PLAYERS):
        birth_year, birth_iso = parse_dob(dob)
        age = today.year - birth_year - ((today.month, today.day) < (int(dob.split('.')[1]), int(dob.split('.')[0])))
        position = POSITION_MAP.get(jersey, "Orta Saha")
        is_captain = (jersey == 10)  # 10 numara -> kaptan
        docs.append({
            "id": nid(),
            "slug": slugify_unique(name),
            "name": name,
            "jersey_number": jersey,
            "position": position,
            "age": age,
            "birth_year": birth_year,
            "birth_date": birth_iso,
            "height_cm": None,
            "preferred_foot": None,
            "is_captain": is_captain,
            "top_scorer": False,
            "top_assist": False,
            "is_featured": is_captain or jersey in (9, 1),  # kaptan + gol kralı + kaleci
            "active": True,
            "photo_url": "",
            "bio": f"{name}, {birth_year} doğumlu, {position.lower()} mevkiindeki Livanespor futbolcusudur. Forma numarası {jersey}.",
            "stats": {"matches": 0, "goals": 0, "assists": 0, "yellow_cards": 0, "red_cards": 0},
            "license_type": "Amatör",
            "gallery": [],
            "social": {},
            "created_at": now(),
            "updated_at": now(),
        })
    await db.players.insert_many(docs)
    print(f"Inserted {len(docs)} players")

    # Insert staff
    sdocs = []
    for name, role, cat, order in STAFF:
        sdocs.append({
            "id": nid(),
            "slug": slugify_unique(name),
            "name": name,
            "role_title": role,
            "category": cat,
            "bio": f"{name} — Livanespor {role.lower()}.",
            "photo_url": "",
            "order": order,
            "active": True,
            "created_at": now(),
            "updated_at": now(),
        })
    await db.staff.insert_many(sdocs)
    print(f"Inserted {len(sdocs)} staff members")

    print("\nFutbolcular:")
    for p in docs:
        print(f"  #{p['jersey_number']:>2} {p['name']:<30} {p['position']:<10} ({p['birth_year']}, {p['age']} yaş){' [KAPTAN]' if p['is_captain'] else ''}")

    print("\nTeknik Kadro:")
    for s in sdocs:
        print(f"  {s['name']:<25} - {s['role_title']}")

asyncio.run(main())
