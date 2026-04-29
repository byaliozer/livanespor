"""
Mackolik'ten oyuncu fotoğraflarını çek, base64 olarak DB'deki photo_url alanına yaz.
- Sadece gerçek foto (>500 bytes) varsa indirir.
- Placeholder (~128 bytes) ise atlar.
- Mevcut photo_url doluysa üzerine yazmaz (kullanıcı manuel yüklediyse korunur).
"""
import asyncio
import base64
import os
import sys
from datetime import datetime, timezone

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# (name, mackolik_person_id) — Mackolik kadro tablosundan
PLAYER_IDS = [
    ('Adem Özkan',              '9o7q4kjrxa0k5fsk8q456uooa'),
    ('Oğuzhan Aygar',           'c5yuxhta14ofbfxfhqzwnfc6i'),
    ('Arda Gül',                'macko1761210060298708430'),
    ('Ahmet Baran Can',         'macko16981582828687306551'),
    ('İsmail Hakkı Yikit',      'macko17294971837363458130'),
    ('Enes Kürkcü',             'macko16975057563593460031'),
    ('Polat Kars',              'macko1761207994586483955'),
    ('Taha Berk Turan',         '7c78vf965hk56kicnmolmk296'),
    ('İsmail Hakkı Kılıçaslan', 'macko17612084842646374938'),
    ('Osman Emir Koşucu',       'macko1697505827035514501'),
    ('Ali Can Öztopaloğlu',     'macko176120874818246556'),
    ('Muhammed Umay',           'macko17612080951757410360'),
    ('Arda Acar',               'macko17294964018488394741'),
    ('Mert Ali Demir',          'macko17612082623571578092'),
    ('Yunus Emre Yıldız',       '3kifeeype9sp6cgnyagop5v6c'),
    ('Esat Mahmut Sönmez',      'macko1761209860149998704'),
    ('Halil İbrahim İşcioğlu',  'macko16974816828333401957'),
    ('Alihan Şentürk',          '3crepgz3eo0a4b4pimqqx2uzu'),
    ('Orhun Tunalı',            'macko16997050895316751319'),
    ('Ercan Savaşeri',          'macko16975058930152187467'),
    ('Erdem Durmuş',            '8e7r5xns80w58vgt4b8p0erdg'),
    ('Tayyip Akdeniz',          '42o1nntlw4yrjeghj4o8fqadw'),
    ('Hazar Özçelikpençe',      'macko17612094790495103533'),
    ('Muhammet Atalay',         'macko17612093778818047664'),
    ('Eren Şengül',             'macko17113587090356766636'),
    ('Samet Bozkuş',            'macko17612092857711280711'),
    ('Ramazan Boyraz',          '434dg68ozls2ywwlb47y2oes'),
    ('Burak Kocatürk',          'macko16975079213429257230'),
    ('Batuhan Durdu',           'macko17295944662343403282'),
    ('Arda Yurttaş',            'macko17296146678016104671'),
    ('İlteriş Karakaya',        '7q7m11wt4lym53esvs2kbw6xg'),
    ('İlkay Adaş',              'az10qogilz7uc7alfrssl5st0'),
    ('Batuhan Gül',             'macko17612088796007117665'),
    ('Eren Cengiz',             'macko17612087731027846861'),
]

URL_TEMPLATE = 'https://file.mackolikfeeds.com/people/{}'
MIN_SIZE = 500  # bytes — placeholder ~128 bytes

def normalize_name(s: str) -> str:
    s = s.lower().strip()
    s = s.replace('ı', 'i').replace('ş', 's').replace('ç', 'c').replace('ğ', 'g').replace('ü', 'u').replace('ö', 'o')
    return ' '.join(s.split())

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    existing = await db.players.find({}, {'_id': 0, 'id': 1, 'name': 1, 'photo_url': 1}).to_list(500)
    by_norm = {normalize_name(p['name']): p for p in existing}

    overwrite = '--force' in sys.argv
    if overwrite:
        print('⚠ FORCE MODE: mevcut photo_url üzerine yazılacak.')

    found_real, skipped_placeholder, skipped_existing, not_in_db, errors = 0, 0, 0, 0, 0
    async with httpx.AsyncClient(timeout=15.0) as http:
        for name, mid in PLAYER_IDS:
            nkey = normalize_name(name)
            doc = by_norm.get(nkey)
            if not doc:
                print(f'  [SKIP-no-db] {name}')
                not_in_db += 1
                continue
            if doc.get('photo_url') and not overwrite:
                print(f'  [SKIP-has-photo] {name}')
                skipped_existing += 1
                continue
            url = URL_TEMPLATE.format(mid)
            try:
                r = await http.get(url)
                if r.status_code != 200 or len(r.content) < MIN_SIZE:
                    print(f'  [SKIP-placeholder] {name} ({len(r.content)} bytes)')
                    skipped_placeholder += 1
                    continue
                ctype = r.headers.get('content-type', 'image/png').split(';')[0].strip() or 'image/png'
                b64 = base64.b64encode(r.content).decode('ascii')
                data_url = f'data:{ctype};base64,{b64}'
                await db.players.update_one(
                    {'id': doc['id']},
                    {'$set': {
                        'photo_url': data_url,
                        'photo_source': 'mackolik',
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                    }},
                )
                print(f'  [OK] {name} → {len(r.content)} bytes ({ctype})')
                found_real += 1
            except Exception as e:
                print(f'  [ERR] {name}: {e}')
                errors += 1

    total = len(PLAYER_IDS)
    print(f'\n=== Summary ===')
    print(f'Total checked:        {total}')
    print(f'Real photos saved:    {found_real}')
    print(f'Placeholder (no img): {skipped_placeholder}')
    print(f'Already had photo:    {skipped_existing}')
    print(f'Not in DB:            {not_in_db}')
    print(f'Errors:               {errors}')

if __name__ == '__main__':
    asyncio.run(main())
