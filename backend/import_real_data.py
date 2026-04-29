"""
Import real Bursa Süper Amatör Lig 2025-2026 data from Mackolik.
- Standings (1.Grup düzenli sezon + Play-Off)
- Matches (full season fixtures)
- Player stats (match by name, update; add missing)

Run: python import_real_data.py
"""
import asyncio
import os
import sys
import unicodedata
from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

SEASON = '2025-2026'
COMPETITION = 'Süper Amatör Lig - Bursa 1.Grup'

# ───────────────────────── DATA ─────────────────────────

# Süper Amatör Lig - Bursa 1.Grup (20 hafta tamamlandı)
STANDINGS_GROUP = [
    # rank, team, O, G, B, M, A, Y, AV, P
    (1, 'Odunlukspor',     20, 16, 2, 2, 66, 21, 45, 50),
    (2, 'Livanespor',      20, 12, 3, 5, 61, 32, 29, 39),
    (3, 'Çotanakspor',     20, 11, 4, 5, 42, 27, 15, 37),
    (4, 'Burgazspor',      20, 10, 3, 7, 36, 31,  5, 33),
    (5, 'Kızılcıklıspor',  20, 10, 2, 8, 51, 34, 17, 32),
    (6, 'Gülbahçespor',    20,  9, 4, 7, 36, 34,  2, 31),
    (7, 'Karıncalıgücü',   20,  9, 3, 8, 34, 33,  1, 30),
    (8, 'Gemlik Umurspor', 20,  9, 2, 9, 38, 32,  6, 29),
    (9, 'Bağlarbaşıspor',  20,  9, 2, 9, 35, 29,  6, 29),
    (10, 'Çalıspor',       20,  2, 1, 17, 20, 86, -66, 7),
    (11, 'Panayırspor',    20,  0, 0, 20,  0, 60, -60, 0),
]

# Süper Amatör Lig - Bursa Play-Off (5 hafta)
STANDINGS_PLAYOFF = [
    (1, 'M.K.Paşa Bld.',   5, 3, 2, 0,  7,  0,  7, 11),
    (2, 'Zaferspor',       5, 2, 3, 0, 15,  6,  9,  9),
    (3, 'Yenişehir Bld',   5, 2, 3, 0,  5,  3,  2,  9),
    (4, 'Odunlukspor',     5, 2, 2, 1, 10,  8,  2,  8),
    (5, 'Mudanyaspor',     5, 2, 1, 2,  9,  8,  1,  7),
    (6, 'Livanespor',      5, 0, 3, 2, 10, 12, -2,  3),
    (7, 'Elbeyli Üzüm',    5, 1, 0, 4,  7, 17, -10, 3),
    (8, 'Merinosspor',     5, 0, 2, 3,  6, 15, -9,  2),
]

# Tüm sezon maçları (oynanan + yaklaşan)
# (date_iso, home, away, home_score, away_score, status, competition)
LG = 'Süper Amatör Lig - Bursa 1.Grup'
PO = 'Süper Amatör Lig - Bursa Play-Off'
HOME_VENUE = 'Livanespor Tesisleri'

MATCHES = [
    # Düzenli Sezon (1.Grup)
    ('2025-10-18', 'Odunlukspor',    'Livanespor',     1, 4, 'finished', LG),
    ('2025-10-26', 'Livanespor',     'Panayırspor',    3, 0, 'finished', LG),
    ('2025-11-01', 'Karıncalıgücü',  'Livanespor',     3, 1, 'finished', LG),
    ('2025-11-09', 'Livanespor',     'Çotanakspor',    2, 2, 'finished', LG),
    ('2025-11-23', 'Kızılcıklıspor', 'Livanespor',     1, 4, 'finished', LG),
    ('2025-11-29', 'Livanespor',     'Gemlik Umurspor', 1, 2, 'finished', LG),
    ('2025-12-07', 'Burgazspor',     'Livanespor',     1, 3, 'finished', LG),
    ('2025-12-13', 'Livanespor',     'Çalıspor',       8, 1, 'finished', LG),
    ('2025-12-21', 'Gülbahçespor',   'Livanespor',     1, 1, 'finished', LG),
    ('2025-12-28', 'Livanespor',     'Bağlarbaşıspor', 3, 2, 'finished', LG),
    ('2026-01-10', 'Livanespor',     'Odunlukspor',    2, 4, 'finished', LG),
    ('2026-01-18', 'Panayırspor',    'Livanespor',     0, 3, 'finished', LG),
    ('2026-01-25', 'Livanespor',     'Karıncalıgücü',  3, 0, 'finished', LG),
    ('2026-02-01', 'Çotanakspor',    'Livanespor',     3, 1, 'finished', LG),
    ('2026-02-07', 'Livanespor',     'Kızılcıklıspor', 3, 0, 'finished', LG),
    ('2026-02-15', 'Gemlik Umurspor', 'Livanespor',    4, 1, 'finished', LG),
    ('2026-02-22', 'Livanespor',     'Burgazspor',     3, 2, 'finished', LG),
    ('2026-02-25', 'Çalıspor',       'Livanespor',     1, 9, 'finished', LG),
    ('2026-02-28', 'Livanespor',     'Gülbahçespor',   4, 2, 'finished', LG),
    ('2026-03-08', 'Bağlarbaşıspor', 'Livanespor',     2, 2, 'finished', LG),
    # Play-Off
    ('2026-03-28', 'Livanespor',     'Merinosspor',    5, 5, 'finished', PO),
    ('2026-04-04', 'Zaferspor',      'Livanespor',     2, 2, 'finished', PO),
    ('2026-04-12', 'Livanespor',     'M.K.Paşa Bld.',  0, 1, 'finished', PO),
    ('2026-04-18', 'Odunlukspor',    'Livanespor',     1, 1, 'finished', PO),
    ('2026-04-26', 'Livanespor',     'Yenişehir Bld',  2, 3, 'finished', PO),
    # Yaklaşan
    ('2026-05-03', 'Livanespor',     'Mudanyaspor',    None, None, 'upcoming', PO),
    ('2026-05-10', 'Elbeyli Üzüm',   'Livanespor',     None, None, 'upcoming', PO),
]

# Mackolik 2025-2026 kadrosu
# (no, name, position_code, age, matches, starts, goals, assists, yellow, red)
# pos: K=Kaleci, D=Defans, O=Orta Saha, F=Forvet
SQUAD = [
    # Kaleciler
    (1,  'Adem Özkan',              'K', 26, 19,  19,  0, 0, 2, 0),
    (21, 'Oğuzhan Aygar',           'K', 28,  4,   4,  0, 0, 1, 0),
    (12, 'Arda Gül',                'K', 17,  2,   0,  0, 0, 1, 0),
    (61, 'Ahmet Baran Can',         'K', 21,  0,   0,  0, 0, 0, 0),
    (62, 'İsmail Hakkı Yikit',      'K', 20,  0,   0,  0, 0, 0, 0),
    # Defans
    (4,  'Enes Kürkcü',             'D', 34, 23,  23,  1, 0, 8, 0),
    (25, 'Polat Kars',              'D', 22, 18,  15,  1, 0, 5, 0),
    (5,  'Taha Berk Turan',         'D', 26, 17,  17,  1, 0, 9, 1),
    (3,  'İsmail Hakkı Kılıçaslan', 'D', 21, 15,  12,  0, 0, 1, 0),
    (2,  'Osman Emir Koşucu',       'D', 35,  9,   8,  0, 0, 0, 0),
    (18, 'Ali Can Öztopaloğlu',     'D', 30,  7,   0,  1, 0, 2, 0),
    (19, 'Muhammed Umay',           'D', 20,  3,   3,  0, 0, 0, 0),
    (16, 'Arda Acar',               'D', 20,  2,   0,  0, 0, 0, 0),
    (78, 'Mert Ali Demir',          'D', 20,  0,   0,  0, 0, 0, 0),
    # Orta Saha
    (24, 'Yunus Emre Yıldız',       'O', 24, 23,  23,  2, 0, 1, 0),
    (88, 'Esat Mahmut Sönmez',      'O', 19, 23,  22,  2, 0, 3, 0),
    (28, 'Halil İbrahim İşcioğlu',  'O', 37, 17,  14,  0, 0, 3, 0),
    (10, 'Alihan Şentürk',          'O', 24, 16,  14,  3, 0, 1, 1),
    (77, 'Orhun Tunalı',            'O', 20, 11,  11,  0, 0, 2, 0),
    (35, 'Ercan Savaşeri',          'O', 32,  6,   5,  0, 0, 1, 0),
    (20, 'Erdem Durmuş',            'O', 27,  4,   2,  1, 0, 1, 0),
    (6,  'Tayyip Akdeniz',          'O', 27,  3,   0,  0, 0, 1, 0),
    (17, 'Hazar Özçelikpençe',      'O', 20,  2,   0,  0, 0, 0, 0),
    (49, 'Muhammet Atalay',         'O', 21,  2,   0,  0, 0, 0, 0),
    (29, 'Eren Şengül',             'O', 20,  1,   0,  0, 0, 0, 0),
    (26, 'Samet Bozkuş',            'O', 29,  0,   0,  0, 0, 0, 0),
    # Forvet
    (7,  'Ramazan Boyraz',          'F', 29, 23,  23,  6, 0, 1, 0),
    (9,  'Burak Kocatürk',          'F', 29, 21,  21, 28, 0, 2, 0),
    (11, 'Batuhan Durdu',           'F', 26, 19,   7,  8, 0, 1, 0),
    (27, 'Arda Yurttaş',            'F', 19,  7,   3,  1, 0, 2, 0),
    (70, 'İlteriş Karakaya',        'F', 21,  6,   0,  1, 0, 0, 0),
    (13, 'İlkay Adaş',              'F', 23,  5,   5,  5, 0, 2, 0),
    (53, 'Batuhan Gül',             'F', 23,  0,   0,  0, 0, 0, 0),
    (55, 'Eren Cengiz',             'F', 23,  0,   0,  0, 0, 0, 0),
]

POS_MAP = {'K': 'Kaleci', 'D': 'Defans', 'O': 'Orta Saha', 'F': 'Forvet'}

# ───────────────────────── Helpers ─────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return uuid4().hex[:24]

def normalize(s: str) -> str:
    """Lowercase + remove diacritics + collapse spaces for name matching."""
    s = s.lower().strip()
    s = s.replace('ı', 'i').replace('ş', 's').replace('ç', 'c').replace('ğ', 'g').replace('ü', 'u').replace('ö', 'o')
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    return ' '.join(s.split())

def slugify(s: str) -> str:
    s = normalize(s)
    s = ''.join(ch if ch.isalnum() or ch == ' ' else '' for ch in s)
    return '-'.join(s.split())

# ───────────────────────── Imports ─────────────────────────

async def import_standings(db):
    print("→ Standings: clearing & inserting...")
    await db.standings.delete_many({})
    docs = []
    for rank, team, o, g, b, m, a, y, av, p in STANDINGS_GROUP:
        docs.append({
            'id': new_id(),
            'rank': rank,
            'team_name': team,
            'logo_url': '',
            'played': o, 'wins': g, 'draws': b, 'losses': m,
            'goals_for': a, 'goals_against': y, 'goal_difference': av,
            'points': p,
            'season': SEASON,
            'league_group': '1.Grup',
            'group_label': 'Süper Amatör Lig - Bursa 1.Grup',
            'created_at': now_iso(), 'updated_at': now_iso(),
        })
    for rank, team, o, g, b, m, a, y, av, p in STANDINGS_PLAYOFF:
        docs.append({
            'id': new_id(),
            'rank': rank,
            'team_name': team,
            'logo_url': '',
            'played': o, 'wins': g, 'draws': b, 'losses': m,
            'goals_for': a, 'goals_against': y, 'goal_difference': av,
            'points': p,
            'season': SEASON,
            'league_group': 'Play-Off',
            'group_label': 'Süper Amatör Lig - Bursa Play-Off',
            'created_at': now_iso(), 'updated_at': now_iso(),
        })
    await db.standings.insert_many(docs)
    print(f"  ✓ {len(docs)} standings inserted (1.Grup: {len(STANDINGS_GROUP)}, Play-Off: {len(STANDINGS_PLAYOFF)})")

async def import_matches(db):
    print("→ Matches: clearing & inserting...")
    await db.matches.delete_many({})
    docs = []
    for date_str, home, away, hs, as_, status, comp in MATCHES:
        is_home = (home == 'Livanespor')
        opponent = away if is_home else home
        match_dt = datetime.fromisoformat(f'{date_str}T15:00:00+00:00')
        docs.append({
            'id': new_id(),
            'season': SEASON,
            'competition': comp,
            'home_team': home,
            'away_team': away,
            'opponent': opponent,
            'is_home': is_home,
            'home_score': hs,
            'away_score': as_,
            'match_date': match_dt.isoformat(),
            'venue': HOME_VENUE if is_home else f'{opponent} Sahası',
            'status': status,
            'summary': '' if status == 'upcoming' else 'Maç sonucu Mackolik kaynaklı.',
            'opponent_logo': '',
            'created_at': now_iso(), 'updated_at': now_iso(),
        })
    await db.matches.insert_many(docs)
    finished = sum(1 for m in MATCHES if m[5] == 'finished')
    upcoming = sum(1 for m in MATCHES if m[5] == 'upcoming')
    print(f"  ✓ {len(docs)} matches inserted (oynanan: {finished}, yaklaşan: {upcoming})")

async def import_squad(db):
    print("→ Squad: matching & updating...")
    existing = await db.players.find({}, {'_id': 0}).to_list(500)
    existing_by_norm = {normalize(p['name']): p for p in existing}

    # Identify top scorer & top assist (only set if someone has > 0)
    max_goals = max(p[6] for p in SQUAD)
    max_assists = max(p[7] for p in SQUAD)
    top_scorer_name = next((p[1] for p in SQUAD if p[6] == max_goals and max_goals > 0), None)
    top_assist_name = next((p[1] for p in SQUAD if p[7] == max_assists and max_assists > 0), None)

    updated, created = 0, 0
    for no, name, pos_code, age, matches, starts, goals, assists, yellow, red in SQUAD:
        nkey = normalize(name)
        position = POS_MAP[pos_code]
        stats = {
            'matches': matches,
            'starts': starts,
            'goals': goals,
            'assists': assists,
            'yellow_cards': yellow,
            'red_cards': red,
        }
        is_top_scorer = (name == top_scorer_name)
        is_top_assist = (name == top_assist_name)

        if nkey in existing_by_norm:
            doc = existing_by_norm[nkey]
            await db.players.update_one(
                {'id': doc['id']},
                {'$set': {
                    'jersey_number': no,
                    'position': position,
                    'age': age,
                    'birth_year': 2026 - age,
                    'stats': stats,
                    'top_scorer': is_top_scorer,
                    'top_assist': is_top_assist,
                    'is_captain': doc.get('is_captain', False),
                    'updated_at': now_iso(),
                }},
            )
            updated += 1
        else:
            slug = slugify(name)
            # ensure unique slug
            n = 1
            base = slug
            while await db.players.find_one({'slug': slug}):
                n += 1
                slug = f'{base}-{n}'
            await db.players.insert_one({
                'id': new_id(),
                'slug': slug,
                'name': name,
                'jersey_number': no,
                'position': position,
                'age': age,
                'birth_year': 2026 - age,
                'height_cm': None,
                'preferred_foot': '',
                'is_captain': False,
                'top_scorer': is_top_scorer,
                'top_assist': is_top_assist,
                'is_featured': False,
                'active': True,
                'photo_url': '',
                'bio': f'{name}, Livanespor formasını gururla taşıyan {position.lower()} mevkiindeki oyuncularımızdandır.',
                'stats': stats,
                'gallery': [],
                'social': {},
                'created_at': now_iso(),
                'updated_at': now_iso(),
            })
            created += 1
    print(f"  ✓ players updated: {updated}, created: {created}, top_scorer: {top_scorer_name}, top_assist: {top_assist_name}")

async def ensure_head_coach(db):
    print("→ Staff: ensuring Tarkan Civelek...")
    existing = await db.staff.find_one({'name': {'$regex': 'Tarkan', '$options': 'i'}})
    if existing:
        print("  ✓ Tarkan Civelek zaten var.")
        return
    await db.staff.insert_one({
        'id': new_id(),
        'slug': 'tarkan-civelek',
        'name': 'Tarkan Civelek',
        'role_title': 'Teknik Direktör',
        'category': 'a-team',
        'bio': 'A Takım Teknik Direktörümüz.',
        'photo_url': '',
        'order': 0,
        'active': True,
        'created_at': now_iso(),
        'updated_at': now_iso(),
    })
    print("  ✓ Tarkan Civelek eklendi (A Takım Teknik Direktörü).")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    print(f"=== Importing real Mackolik data → {DB_NAME} ===\n")
    await import_standings(db)
    await import_matches(db)
    await import_squad(db)
    await ensure_head_coach(db)
    print("\n✅ Import complete.")

if __name__ == '__main__':
    asyncio.run(main())
