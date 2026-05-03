"""
Livanespor — DB seed routines (split from server.py for maintainability).
seed_admin / seed_content are idempotent: each will return early if data exists.
Stateless module: takes `db` as argument; no imports from server.py.
"""
from datetime import datetime, timezone, timedelta
from typing import Any
import logging
import uuid
import bcrypt
from slugify import slugify

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _make_slug(text: str, prefix: str = "") -> str:
    base = slugify(text or "icerik", lowercase=True)
    return f"{prefix}{base}-{uuid.uuid4().hex[:6]}"


async def seed_admin(db: Any, default_email: str, default_password: str, default_name: str) -> None:
    """Seed super_admin from .env ONLY if no super_admin exists.
    Once created, panel-managed credentials are preserved across restarts.
    """
    existing = await db.users.find_one({'role': 'super_admin'})
    if existing:
        logger.info(f"super_admin already exists (username={existing.get('email')}); skipping seed")
        return
    username = default_email.lower().strip()
    pw_hash = _hash_password(default_password)
    await db.users.insert_one({
        'id': _new_id(),
        'email': username,
        'name': default_name,
        'role': 'super_admin',
        'password_hash': pw_hash,
        'created_at': _now_iso(),
    })
    logger.info(f"Seeded admin user: {username}")


async def seed_content(db: Any) -> None:
    if await db.site_settings.find_one({'id': 'main'}):
        return
    logger.info("Seeding initial Livanespor content…")

    # Site settings
    await db.site_settings.insert_one({
        'id': 'main',
        'site_title': 'Livanespor — Resmi Web Sitesi',
        'site_description': 'Bursa Nilüfer merkezli Livanespor futbol kulübü. A Takım, Akademi, Haberler.',
        'logo_url': 'https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png',
        'favicon_url': 'https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png',
        'phone': '0543 793 4101',
        'email': 'bilgi@livanespor.org',
        'address': 'Yolçatı, Nilüfer / Bursa',
        'manager_name': 'Ali Özer',
        'map_url': 'https://maps.app.goo.gl/NKoYnqsX9hdp5k2T8',
        'social': {'instagram': '', 'twitter': '', 'youtube': '', 'facebook': ''},
        'season': '2025-2026',
        'updated_at': _now_iso(),
    })

    # Hero slides
    hero_slides = [
        {
            'id': _new_id(), 'order': 1, 'active': True,
            'title': 'LİVANESPOR',
            'subtitle': 'Bursa Nilüfer\'in Yükselen Gücü',
            'description': 'Sıradaki maçımıza tüm Livane ailesini bekliyoruz. Tribünleri sarı-siyah ile dolduralım.',
            'image_url': 'https://images.pexels.com/photos/12616082/pexels-photo-12616082.jpeg',
            'cta_primary_label': 'Maç Merkezi', 'cta_primary_link': '/mac-merkezi',
            'cta_secondary_label': 'Akademi Başvurusu', 'cta_secondary_link': '/akademi/basvuru',
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        },
        {
            'id': _new_id(), 'order': 2, 'active': True,
            'title': 'AKADEMİ KAYITLARI AÇIK',
            'subtitle': 'U8 — U17 Yaş Grupları',
            'description': 'Geleceğin yıldızları Livanespor Akademi\'de yetişiyor. Hemen başvur, denemeye davet et.',
            'image_url': 'https://images.pexels.com/photos/26283685/pexels-photo-26283685.jpeg',
            'cta_primary_label': 'Hemen Başvur', 'cta_primary_link': '/akademi/basvuru',
            'cta_secondary_label': 'Yaş Gruplarını Gör', 'cta_secondary_link': '/akademi/yas-gruplari',
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        },
        {
            'id': _new_id(), 'order': 3, 'active': True,
            'title': 'YOLÇATI TESİSİMİZ',
            'subtitle': 'Modern, Profesyonel, Bizim Evimiz',
            'description': 'Antrenmanlarımız ve maçlarımız Yolçatı\'daki tesisimizde gerçekleşiyor.',
            'image_url': 'https://images.unsplash.com/photo-1762013315117-1c8005ad2b41',
            'cta_primary_label': 'İletişim', 'cta_primary_link': '/iletisim',
            'cta_secondary_label': 'Kulüp Hakkında', 'cta_secondary_link': '/kulup',
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        },
    ]
    await db.hero_slides.insert_many(hero_slides)

    # Players
    players = [
        ('Mert Yılmaz', 1, 'Kaleci', 24, 188, 'Sağ', True, False, False),
        ('Emre Kaya', 4, 'Defans', 26, 184, 'Sağ', False, False, False),
        ('Burak Demir', 5, 'Defans', 23, 182, 'Sol', False, False, True),
        ('Onur Şahin', 8, 'Orta Saha', 25, 178, 'Sağ', False, True, False),
        ('Cem Aslan', 10, 'Orta Saha', 27, 176, 'Sol', False, False, False),
        ('Kerem Yıldız', 9, 'Forvet', 24, 181, 'Sağ', False, False, False),
    ]
    portraits = [
        'https://images.unsplash.com/photo-1514932535303-f7b1712cf831',
        'https://images.unsplash.com/photo-1570095354203-130e525ae0e1',
        'https://images.unsplash.com/photo-1517466787929-bc90951d0974',
        'https://images.unsplash.com/photo-1552058544-f2b08422138a',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e',
    ]
    for i, (name, num, pos, age, height, foot, captain, top_scorer, top_assist) in enumerate(players):
        slug = _make_slug(name, "")
        await db.players.insert_one({
            'id': _new_id(), 'slug': slug, 'name': name, 'jersey_number': num,
            'position': pos, 'age': age, 'birth_year': 2026 - age, 'height_cm': height,
            'preferred_foot': foot, 'is_captain': captain, 'top_scorer': top_scorer, 'top_assist': top_assist,
            'is_featured': i < 3, 'active': True,
            'photo_url': portraits[i],
            'bio': f'{name}, Livanespor formasını gururla taşıyan {pos.lower()} mevkiindeki oyuncularımızdandır.',
            'stats': {'matches': 18 + i, 'goals': 6 - i if pos == 'Forvet' else max(0, 4 - i), 'assists': 5 - i, 'yellow_cards': i, 'red_cards': 0},
            'gallery': [], 'social': {},
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Staff
    staff = [
        ('Hakan Türker', 'Teknik Direktör', 'a-team', 'UEFA A lisanslı, 18 yıllık tecrübe.'),
        ('Serkan Arslan', 'Yardımcı Antrenör', 'a-team', 'Defans ve set-piece sorumlusu.'),
        ('Ayşe Korkmaz', 'Akademi Direktörü', 'academy', 'Genç oyuncu gelişiminde 12 yıllık tecrübe.'),
    ]
    for i, (name, role, cat, bio) in enumerate(staff):
        await db.staff.insert_one({
            'id': _new_id(), 'slug': _make_slug(name), 'name': name, 'role_title': role,
            'category': cat, 'bio': bio, 'photo_url': portraits[i % len(portraits)],
            'order': i + 1, 'active': True, 'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Matches
    matches_data = [
        {'opponent': 'Nilüfer FK', 'is_home': True, 'date_offset_days': 4, 'status': 'upcoming', 'home_score': None, 'away_score': None, 'venue': 'Yolçatı Tesisi'},
        {'opponent': 'Bursa Gençlik', 'is_home': False, 'date_offset_days': 11, 'status': 'upcoming', 'home_score': None, 'away_score': None, 'venue': 'Bursa Atatürk Stadı'},
        {'opponent': 'Mudanya Spor', 'is_home': True, 'date_offset_days': 18, 'status': 'upcoming', 'home_score': None, 'away_score': None, 'venue': 'Yolçatı Tesisi'},
        {'opponent': 'Gemlik United', 'is_home': True, 'date_offset_days': -5, 'status': 'finished', 'home_score': 3, 'away_score': 1, 'venue': 'Yolçatı Tesisi'},
        {'opponent': 'Karacabey Spor', 'is_home': False, 'date_offset_days': -12, 'status': 'finished', 'home_score': 0, 'away_score': 2, 'venue': 'Karacabey Stadı'},
    ]
    for m in matches_data:
        match_dt = datetime.now(timezone.utc) + timedelta(days=m['date_offset_days'])
        home_team = 'Livanespor' if m['is_home'] else m['opponent']
        away_team = m['opponent'] if m['is_home'] else 'Livanespor'
        await db.matches.insert_one({
            'id': _new_id(), 'season': '2025-2026', 'competition': 'BAL Ligi 4. Grup',
            'home_team': home_team, 'away_team': away_team,
            'opponent': m['opponent'], 'is_home': m['is_home'],
            'home_score': m['home_score'], 'away_score': m['away_score'],
            'match_date': match_dt.isoformat(), 'venue': m['venue'],
            'status': m['status'],
            'summary': 'Maç önü değerlendirmesi yakında.' if m['status'] == 'upcoming' else 'Mücadeleci bir 90 dakikaydı.',
            'opponent_logo': '',
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Standings
    teams = ['Livanespor', 'Nilüfer FK', 'Bursa Gençlik', 'Mudanya Spor', 'Gemlik United', 'Karacabey Spor', 'İnegöl Genç', 'Orhangazi Spor']
    for i, team in enumerate(teams):
        played = 12
        wins = 8 - i if i < 6 else 2
        draws = 2
        losses = played - wins - draws
        gf = 24 - i * 2
        ga = 8 + i * 2
        await db.standings.insert_one({
            'id': _new_id(), 'rank': i + 1, 'team_name': team, 'logo_url': '',
            'played': played, 'wins': max(wins, 0), 'draws': draws, 'losses': max(losses, 0),
            'goals_for': max(gf, 0), 'goals_against': max(ga, 0),
            'goal_difference': max(gf, 0) - max(ga, 0),
            'points': max(wins, 0) * 3 + draws,
            'season': '2025-2026',
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Sponsors
    sponsors_data = [
        ('EVSER HALI', 'forma', 'club', 'Ana Forma Sponsorumuz', 'https://example.com', 1),
        ('Nilüfer İnşaat', 'main', 'club', 'Resmi Ana Sponsorumuz', 'https://example.com', 2),
        ('Yolçatı Restaurant', 'supporter', 'both', 'Destekçimiz', '', 3),
        ('EVSER HALI - U15', 'jersey', 'academy', 'U15 Forma Sponsoru', '', 4),
    ]
    for name, level, scope, desc, link, order in sponsors_data:
        await db.sponsors.insert_one({
            'id': _new_id(), 'slug': _make_slug(name), 'name': name, 'level': level,
            'scope': scope, 'description': desc, 'website': link,
            'logo_url': '', 'order': order, 'active': True,
            'age_group': 'U15' if 'U15' in name else None,
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Academy groups
    age_groups = [
        ('U8', '6-8 yaş', 'Temel motor beceriler ve futbolla tanışma.'),
        ('U10', '9-10 yaş', 'Top hakimiyeti ve takım oyunu temelleri.'),
        ('U12', '11-12 yaş', 'Pozisyon bilinci ve teknik gelişim.'),
        ('U14', '13-14 yaş', 'Taktiksel anlayış ve fiziksel gelişim.'),
        ('U15', '14-15 yaş', 'EVSER HALI forma sponsorlu özel program.'),
        ('U17', '16-17 yaş', 'Profesyonelliğe hazırlık ve bireysel gelişim.'),
    ]
    for i, (code, age, desc) in enumerate(age_groups):
        await db.academy_groups.insert_one({
            'id': _new_id(), 'slug': code.lower(), 'name': code, 'age_range': age,
            'description': desc, 'order': i + 1, 'active': True,
            'training_days_summary': 'Salı, Perşembe, Cumartesi',
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Training sessions
    sessions = [
        ('U8', 'Salı', '17:00-18:00', 'Saha 1', 'Ayşe Korkmaz'),
        ('U10', 'Salı', '18:00-19:00', 'Saha 1', 'Ayşe Korkmaz'),
        ('U12', 'Perşembe', '17:30-19:00', 'Saha 2', 'Hakan Türker'),
        ('U14', 'Perşembe', '19:00-20:30', 'Saha 2', 'Hakan Türker'),
        ('U15', 'Cumartesi', '10:00-11:30', 'Saha 1', 'Serkan Arslan'),
        ('U17', 'Cumartesi', '11:30-13:00', 'Saha 1', 'Serkan Arslan'),
    ]
    day_order = {'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6, 'Pazar': 7}
    for grp, day, hrs, field, coach in sessions:
        await db.training_sessions.insert_one({
            'id': _new_id(), 'group_code': grp, 'day_of_week': day_order[day], 'day_name': day,
            'time_range': hrs, 'field': field, 'coach': coach,
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Categories
    categories_data = [
        ('Kulüp Haberleri', 'kulup-haberleri', 'club'),
        ('Maç Önü', 'mac-onu', 'club'),
        ('Maç Sonu', 'mac-sonu', 'club'),
        ('Duyurular', 'duyurular', 'club'),
        ('Transfer', 'transfer', 'club'),
        ('Akademi Haberleri', 'akademi-haberleri', 'academy'),
        ('Sponsor Haberleri', 'sponsor-haberleri', 'club'),
        ('Etkinlikler', 'etkinlikler', 'both'),
    ]
    for n, s, scope in categories_data:
        await db.categories.insert_one({
            'id': _new_id(), 'name': n, 'slug': s, 'scope': scope,
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Posts
    posts_data = [
        ('Livanespor 3-1 Gemlik United: Tribünlerin Önünde Tarihi Galibiyet', 'mac-sonu', 'Yolçatı\'da oynadığımız maçta sahadan 3-1\'lik galibiyetle ayrıldık. Goller: Kerem (2), Cem.'),
        ('Akademi Kayıtları Başladı: U8\'den U17\'ye Tüm Yaş Grupları Açık', 'akademi-haberleri', 'Yeni sezon akademi kayıtlarımız başladı. Online başvuru formu üzerinden hemen kayıt olabilirsiniz.'),
        ('EVSER HALI U15 Forma Sponsorumuz Oldu', 'sponsor-haberleri', 'Bu sezon U15 takımımızın forma sponsoru EVSER HALI olacak. Hayırlı uğurlu olsun.'),
        ('Hafta Sonu Nilüfer FK Karşısında Sahaya Çıkıyoruz', 'mac-onu', 'Pazar günü Yolçatı\'da Nilüfer FK\'yı ağırlıyoruz. Tüm taraftarlarımızı bekliyoruz.'),
    ]
    cover_images = [
        'https://images.pexels.com/photos/12616082/pexels-photo-12616082.jpeg',
        'https://images.pexels.com/photos/26283685/pexels-photo-26283685.jpeg',
        'https://images.unsplash.com/photo-1762013315117-1c8005ad2b41',
        'https://images.unsplash.com/photo-1773850561705-dacec6d0b16b',
    ]
    for i, (title, cat, content) in enumerate(posts_data):
        await db.posts.insert_one({
            'id': _new_id(), 'slug': _make_slug(title),
            'title': title, 'category': cat,
            'excerpt': content,
            'content': f'<p>{content}</p><p>Detaylı bilgi için kulübümüzle iletişime geçebilirsiniz. Livanespor olarak her zaman taraftarımızın yanındayız.</p>',
            'cover_image': cover_images[i],
            'gallery': [],
            'tags': ['livanespor', cat],
            'author': 'Livanespor',
            'status': 'published',
            'published_at': (datetime.now(timezone.utc) - timedelta(days=i)).isoformat(),
            'seo_title': title,
            'seo_description': content[:155],
            'og_image': cover_images[i],
            'created_at': _now_iso(), 'updated_at': _now_iso(),
        })

    # Sample academy application
    await db.academy_applications.insert_one({
        'id': _new_id(),
        'application_no': f"LIV-{datetime.now().strftime('%Y%m')}-DEMO1",
        'player_name': 'Demo Çocuk', 'birth_date': '2015-05-10', 'age': 10,
        'parent_name': 'Demo Veli', 'phone': '0555 000 0000', 'email': 'demo@example.com',
        'city': 'Bursa', 'district': 'Nilüfer', 'address': 'Yolçatı',
        'position_preference': 'Orta Saha',
        'previous_club': '', 'has_license': False,
        'health_note': 'Yok', 'emergency_contact': '0555 111 1111',
        'note': 'Örnek başvuru kaydıdır.',
        'kvkk_consent': True,
        'status': 'new',
        'age_group': 'U10',
        'created_at': _now_iso(), 'updated_at': _now_iso(),
    })

    logger.info("Seed complete.")
