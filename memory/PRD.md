# Livanespor — Product Requirements Document

**Project:** Livanespor Resmi Web Sitesi + Futbol Akademi + Admin Panel
**Stack:** React (CRA + Tailwind + Shadcn) + FastAPI + MongoDB
**Brand:** #f5dc4c (sarı) + #000000 (siyah) — premium European football club aesthetic
**Created:** 2026-04-28

---

## 1. Original Problem Statement
Bursa Nilüfer merkezli Livanespor için WordPress'ten bağımsız, modern, premium görünümlü, mobil uyumlu, özel yönetim panelli bir futbol kulübü web sitesi. A Takım + Futbol Akademi tek çatı altında. Yönetim, içerik ve sponsorlar tamamen admin panelinden yönetilebilmeli. AI görsel üretimi (OpenAI gpt-image-2) entegre.

## 2. Architecture
- **Frontend:** React 19 + React Router 7 + Tailwind + Shadcn UI + Bebas Neue/Manrope fonts
- **Backend:** FastAPI + Motor (MongoDB) + JWT + bcrypt + OpenAI SDK
- **Auth:** JWT (HS256, 7-day expiry) + bcrypt password hash
- **AI:** OpenAI gpt-image-2 (fallback gpt-image-1) for image generation
- **Database:** 16 collections — users, site_settings, hero_slides, players, staff, matches, standings, sponsors, academy_groups, training_sessions, academy_applications, posts, categories, contact_messages, media, ai_settings

## 3. User Personas
- **Public visitor** — fans, parents, prospective academy players, sponsors
- **Admin (Ali Özer / club staff)** — manages all content via /admin
- **Editor / Academy lead / Sponsor lead / Media lead** — role-scoped access

## 4. Implemented (2026-04-28)
### Public Site (21 routes)
- `/` Home — Hero slider (3 slides), count-up metrics, Sıradaki Maç card with countdown, Son Maç skor, Puan Durumu mini, Mini Fikstür, Son 3 Sonuç, Öne Çıkan Oyuncular (kaptan/gol kralı/asist kralı/öne çıkan), Kadro Vitrini (mevki filtreli), Son Haberler grid, Sponsor grid, Tesis bloğu, İletişim bloğu, Footer
- `/kulup` Hakkımızda + tarihçe + vizyon/misyon/değerler
- `/takim` A Takım özet
- `/oyuncular` filtreli + aranabilir kadro
- `/oyuncular/:slug` Oyuncu detay (büyük profil, istatistikler, ilgili haberler)
- `/teknik-ekip` A Takım + Akademi teknik ekip
- `/mac-merkezi` Maç merkezi
- `/fikstur` Fikstür filtreli
- `/puan-durumu` Tam puan durumu tablosu
- `/haberler` + `/haberler/:slug` Blog/haber sistemi
- `/sponsorlar` Premium grid kategorili
- `/iletisim` Form + harita
- `/akademi` Akademi landing page
- `/akademi/yas-gruplari` U8-U17 yaş grupları
- `/akademi/antrenman-takvimi` Antrenman tablosu
- `/akademi/teknik-kadro` Akademi teknik ekip
- `/akademi/haberler` Akademi haberleri
- `/akademi/basvuru` Kapsamlı başvuru formu (KVKK + tüm alanlar)

### Admin Panel (16 routes)
- `/admin` Login (siyah-sarı side-by-side, secure)
- `/admin/dashboard` Stats cards + son başvurular + son mesajlar
- `/admin/slides` Hero Slider yönetimi
- `/admin/posts` Haber/Blog (kategori, SEO, durum, planlı yayın)
- `/admin/players` Oyuncu CRUD + istatistikler
- `/admin/staff` Teknik Ekip CRUD
- `/admin/matches` Maç CRUD (yaklaşan/oynanan)
- `/admin/standings` Puan durumu manuel düzenleme
- `/admin/sponsors` Sponsor CRUD (seviye, kapsam, yaş grubu)
- `/admin/academy-groups` Yaş grupları
- `/admin/academy-sessions` Antrenman takvimi
- `/admin/applications` Başvuru CRM (8 durum, iç yorum, sorumlu)
- `/admin/messages` İletişim talepleri
- `/admin/media` Medya kütüphanesi (yükleme + AI üretim arşivi)
- `/admin/ai` **AI Görsel Üretim Paneli** (gpt-image-2, oran seçimi, prompt geçmişi)
- `/admin/settings` Site ayarları (logo, favicon, sosyal, iletişim)
- `/admin/users` Kullanıcı yönetimi (rol bazlı)

### Backend Endpoints
- POST /api/auth/login, GET /api/auth/me, POST /api/auth/users (super admin)
- 13 public endpoints (no auth)
- Generic admin CRUD for 13 collections + dashboard stats + site-settings + ai-settings
- POST /api/admin/ai/generate-image (OpenAI gpt-image-2 with fallback)
- POST /api/admin/media/upload (base64)

### Seed Data
3 hero slides, 6 oyuncu, 3 teknik ekip, 4 haber, 4 sponsor, 5 maç, 8 takım puan durumu, 6 yaş grubu, 6 antrenman programı, 8 kategori, 1 demo başvuru.

## 5. Test Results (2026-04-28)
- Backend: **33/33 pytest passing** (100%)
- Frontend: All key flows verified end-to-end
- AI image generation: gpt-image-2 working (~23s)

## 5b. 2026-04-29 — Real Mackolik Data Import & Auto-Sync System
- **Initial seed**: imported real Bursa SAL 2025-2026 standings (19), fixtures (27), squad (34), player photos (14/34) via one-off scripts.
- **White-label Mackolik Sync system** built end-to-end:
  - Module: `/app/backend/mackolik_sync.py` — server-side scraper (httpx + BeautifulSoup4) parses 3 Mackolik pages (puan-durumu, maçlar, kadro). Self-contained, no JS rendering needed.
  - Endpoints (super_admin only): `GET/PUT /api/admin/mackolik/settings`, `POST /api/admin/mackolik/test` (dry-run), `POST /api/admin/mackolik/sync` (apply with selectable scope: standings/fixtures/squad/photos/force_photos).
  - Settings stored in `site_settings` collection with id=`mackolik`: `{macko_team_id, team_display_name, enabled, last_sync_at/status/summary/error}`.
  - Admin UI: `/admin/mackolik` page (pages/admin/MackolikSync.jsx) — settings form, test button, granular sync options, last sync status with stats grid, help section ("Mackolik takım ID nasıl alınır").
  - White-label: any team can configure its own Mackolik URL/team_name; Elbeyli Üzümspor or any other Bursa team can use the same site simply by changing the two settings fields.
- Public frontend: two-table standings (1.Grup + Play-Off), home filters to 1.Grup. Admin standings exposes `league_group` column.
- Also fixed: missing `AdminAccount` import in `App.js` (was causing runtime crash).
- New deps: `httpx`, `beautifulsoup4`, `lxml` added to requirements.txt.

## 5c. 2026-04-29 — Auto-Sync Scheduler & Photo Upload
- **APScheduler** entegrasyonu: `/app/backend/mackolik_scheduler.py`. AsyncIOScheduler + CronTrigger ile haftalık otomatik sync. Default: Pazar 00:00 Europe/Istanbul. Admin UI'dan: gün (Pzt-Paz), saat (00-23), dakika (00/15/30/45), aktif toggle. Settings DB'de saklanır, server restart'ta otomatik resched.
- **Backend**: `MackolikSettingsIn` modeli `auto_sync_enabled/day/hour/minute/timezone` alanlarıyla genişletildi. `_macko_settings_doc` `next_auto_sync_at` field ekliyor (scheduler'dan canlı). PUT /admin/mackolik/settings ayar değişince `reschedule_from_db()` çağırıyor. Startup hook scheduler'ı başlatıyor.
- **Admin UI**: `/admin/mackolik` sayfasına "Otomatik Senkronizasyon" bölümü eklendi — toggle + 3 kolonlu gün/saat/dakika seçimi + yeşil banner "Sonraki otomatik senkronizasyon" (TR timezone forced).
- **Image upload field**: `CrudPage.jsx` içine yeni `image` field tipi eklendi → `ImageField` component drag&drop + file picker + URL fallback + base64 inline preview + delete butonu (max 5 MB).
- **Players admin**: photo_url alanı `type: "image"` yapıldı → admin panelinden artık dosya yükleyerek oyuncu portresi eklenebilir.
- New deps: `APScheduler==3.10.4`, `pytz`.

## 5d. 2026-05-02 — DR AI Futbol Merger **Phase 1: Club Info, Dashboard, PAKETİM**
**Goal:** Lay the SaaS foundation (subscription, theme, dashboard overhaul, birthdays) before wiring AI Media generation in Phase 2.

### Backend (`server.py`)
- New `PLAN_LIMITS` dict (starter=30, plus=100, pro=500 credits/month).
- New collection `subscriptions` (singleton `id='main'` for now; will become tenant-keyed in multi-tenant rollout).
- `_ensure_subscription_doc()` — auto-creates Starter plan on first call and auto-resets credits when `last_reset_year_month` changes (logs `monthly_reset` tx).
- New endpoints (all super_admin gated for write; require_admin for read):
  - `GET /api/admin/subscription` → current plan + recent 50 tx.
  - `PUT /api/admin/subscription/plan` → switch plan (starter/plus/pro); resets balance & logs `plan_change`.
  - `POST /api/admin/subscription/credit-adjust` → manual ±adjust, clamped at 0; logs `manual_adjust`.
  - `consume_credit(n, note)` helper (**not yet wired** into AI endpoint — for Phase 2).
- Birthdays: `_upcoming_birthdays(days_ahead=30)` parses `players.birth_date` (YYYY-MM-DD), computes next occurrence + days_until + turning_age.
- New `GET /api/admin/dashboard/birthdays?days=30`.
- `GET /api/admin/dashboard/stats` extended: `media_total`, `upcoming_birthdays` (top 6), `mackolik` summary, `subscription` summary.
- `site_settings` schema extended via GenericIn: `short_name`, `primary_color`, `secondary_color`, `bg_color`, `instagram_username`, `default_theme`.

### Frontend
- New page `/admin/paketim` (`Paketim.jsx`) — current plan + credit bar + total used, 3 plan cards (with "Popüler" / "Aktif" badges), manual ±credit adjust, transaction history.
- `Dashboard.jsx` overhauled — subscription card, Mackolik card, 10-card stat grid (Media + Yakın Doğum Günü added), 3-col bottom (Yaklaşan Doğum Günleri, Son Başvurular, Son Mesajlar), 5 quick-action buttons.
- `Settings.jsx` reorganized — Kulüp Kimliği (short_name, sezon), Tema & Renkler (3 color pickers + theme select + live swatches), İletişim, Sosyal Medya (Instagram username).
- `Players.jsx` — added `birth_date` text field (YYYY-MM-DD).
- `AdminLayout.jsx` — sidebar gains "Paketim" under Sistem with `Package` icon.
- `App.js` — new route `/admin/paketim`.
- `api.js` — `adminApi.subscription / setPlan / adjustCredits / birthdays`.

### Tests
- `/app/backend/tests/test_phase1.py` — 12 new tests (subscription auto-init, plan switching, credit adjust clamp, monthly reset logic, birthdays computation, site-settings persistence, anon gating).
- Regression `/app/backend/tests/backend_test.py` — 32/32 still green.
- Frontend E2E: all new data-testids verified; dashboard, paketim flow, settings save+reload, players birth_date → dashboard birthday card.
- **Result: 44/44 backend passing, frontend 100%.**

### Known follow-ups (tracked in § 6)
- Wire `consume_credit()` into `POST /admin/ai/generate-image` before credit metering goes live.
- Add `#RRGGBB` regex and theme enum validation to site-settings.
- Apply `primary_color / secondary_color / bg_color / default_theme` to the public site CSS (currently persisted only).
- Split `server.py` into routers/services before Phase 2.

## 6. Backlog
### P1 (next iteration)
- **Phase 2: AI Media Generator** — 8 templates (Maç Günü, İlk 11, Gol, Doğum Günü vs.), gpt-image-2 via Emergent LLM key, Pillow fallback, APScheduler async polling, wire `consume_credit()` into AI endpoint.
- **Phase 3: Media Archive** — Emergent object storage, archive page 500-item cap, download/share buttons.
- Apply Settings theme colors (primary/secondary/bg + default_theme) to public site CSS layer.
- Refactor `server.py` (~1280 lines) into `/app/backend/routes/` + `services/` modules before Phase 2.
- Schema validation for site_settings (#RRGGBB regex, theme enum).
- Multi-tenant: subscription doc tenant-keyed (currently singleton `id='main'`).
- WYSIWYG rich text editor (TinyMCE/Lexical) for haber içerikleri
- Image upload via media picker bound to player/post/sponsor forms (currently URL-based)
- Sitemap.xml + robots.txt auto-generated
- Email notifications on new academy application + contact message
- Match events (goller, kartlar, ilk 11) detail editor
- Player gallery upload UI

### P2
- Çoklu dil (TR/EN)
- Push notifications for next match
- Sponsor analytics (tıklama sayımı)
- Match-day live update view
- Mobile app PWA optimization
- Rich brute-force protection on /admin login

## 7. Domain Setup (User's Next Step)
GoDaddy livanespor.com → Emergent deployment domain bağlama:
1. Emergent panelden "Custom Domain" aç → CNAME hedefi al
2. GoDaddy DNS Management'a gir
3. Type: CNAME, Name: @, Value: <emergent-cname>, TTL: 600 (root domain için ALIAS/ANAME gerekirse onu seç)
4. www için: Type: CNAME, Name: www, Value: livanespor.com
5. SSL otomatik provision olur (15 dk - 24 saat)

## 8. Credentials
- **Admin:** admin@livanespor.com / Livanespor2026!
- **OpenAI API key:** /app/backend/.env (OPENAI_API_KEY) — kullanıcı sağladı
- **Logo:** https://customer-assets.emergentagent.com/.../Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png
