## 5l. 2026-05-03 — v1.8.1 CRITICAL Caption AI Rewrite

### Bug (reported by user)
Maç sonu görseli üretilirken: Ev sahibi **Livanespor 0 - 5 Mudanyaspor** (mağlubiyet) → Caption çıktısı: "karşısında 3 puan Livanespor'un!" şeklinde YANLIŞ galibiyet metni. Bu sorun muhtemelen diğer 9 şablonda da vardı.

### Root Cause
`caption_ai.py` içindeki `_result_tone()` fonksiyonu kulübü tespit ederken sorun yaratıyordu:
```python
home_is_us = (club_name or "").lower() in (ctx.get("home_name") or "").lower()
```
Kulüp adı `"Livanespor TEST"` olduğunda (site_settings'te test öneki), `home_name="Livanespor"` ile `"livanespor test" in "livanespor"` → **False**. Sistem Livanespor'u ev sahibi olarak tanıyamadığı için, karşı takımı "bizim" sanıyor ve `away_score=5` gol → "kazandık" çıkarımı yapıyordu.

### Fix — Tamamen Yeniden Kurgulanan Caption AI (v2)
`/app/backend/caption_ai.py` 195 → 380 satıra çıkarıldı. Yeni mimari:

1. **Robust takım eşleştirme** (`_team_is_us`, `_build_our_names`):
   - `site_title` + ilk kelimesi + `short_name` varyantları üretilir
   - Her varyant: tam eşitlik → substring → normalize karşılaştırma
   - "Livanespor TEST" de, "LIV" de, "Livanespor" de doğru şekilde own club tespit eder

2. **Structured Facts Block** (`_compute_match_facts`):
   - `we_are_home` bool (fuzzy match sonucu)
   - `our_score` / `their_score` (perspektife göre)
   - `outcome`: `"win"` | `"loss"` | `"draw"` | `"pending"` | `"neutral"`
   - AI'a **dikte** edilir, yorumlatılmaz: "Skor: Livanespor 0 - 5 Mudanyaspor", "Sonuç: MAĞLUBİYET"

3. **Outcome Directive** (`_outcome_directive`):
   - Her `outcome` için farklı yazım emri ve **yasaklı kelime listesi**
   - MAĞLUBİYET durumunda: "ASLA 'galibiyet', '3 puan bizim', 'zafer' yazma"
   - BERABERLİK'te: "ASLA 'galibiyet' ya da 'mağlubiyet' yazma"
   - GALİBİYET'te: "ASLA 'mağlubiyet', 'üzgünüz' yazma"
   - PENDING (henüz oynanmamış): "ASLA sonuç/skor kelimesi kullanma"

4. **Post-validation Banned Word Checker** (`_violates_outcome`):
   - Caption üretildikten sonra, sonuç bazlı yasaklı kelime taraması yapılır
   - Türkçe karakterler normalize edilerek (`ı→i`, `ğ→g` vb.) robust denetim
   - Eğer yasaklı kelime bulunursa **otomatik retry** tetiklenir (stricter prompt suffix ile)
   - İkinci üretim de başarısız olursa → **`_deterministic_fallback`** devreye girer (hand-crafted, kesinlikle doğru caption)

5. **Per-template Data Assembly**: full_time, match_week, match_day, lineup, motm, birthday, special_day, new_transfer, fan_invite — her biri için template-specific facts çıkarılır.

### Test Sonuçları (Gerçek API call ile)
- **LOSS** (Livanespor 0-5 Mudanyaspor): İlk üretimde AI "üç puan" yazdı → **retry tetiklendi** → "Skor istediğimiz gibi olmadı; başımız dik, bir sonraki maça odaklanıyoruz" ✓
- **WIN** (Livanespor 3-1 Mudanyaspor): "Üç puan bizim, tribüne teşekkürler" ✓
- **DRAW** (Livanespor 2-2 Nilüfer): "Değerli bir puanla tamamladık. İleriye bakıyoruz" ✓
- **UPCOMING** (match_week, skor yok): "Takım hazır, sıra tribünde!" skor/sonuç kelimesi kullanmadan ✓

### Version
- Backend caption_ai.py rewrite; server.py değişmedi (API yüzeyi aynı)
- Frontend v1.8.0 → **v1.8.1**

### Testing
- 74/74 pytest passing
- Manual verification via `asyncio.run()` test harness (4 scenarios)


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

## 5e. 2026-05-02 — DR AI Futbol Merger **Phase 2: AI Media Studio + Phase 3: Archive**

### Backend
- New `storage.py` — Emergent Object Storage wrapper (`init_storage`, `put_bytes`, `get_bytes`, `new_path`), auto re-init on 403.
- New `ai_media.py` — 8 template prompt builders: `match_day`, `starting_xi`, `match_result`, `goal`, `birthday`, `new_transfer`, `player_of_week`, `fan_invite`. English→English adapter (player fields already English; no translation needed vs DR AI's Turkish schema).
- New endpoints:
  - `GET /api/admin/ai/templates` — metadata list.
  - `POST /api/admin/ai/generate-template` — validates template_key, **then** consumes 1 credit, creates `ai_media_jobs` doc (status=pending), schedules one-shot worker via APScheduler.
  - `GET /api/admin/ai/jobs` + `/jobs/{id}` — polling endpoints.
  - `_run_ai_job()` worker — resolves ctx (player_id → player doc, match_id → match doc, player_ids → ordered list), builds prompt, calls `gpt-image-2` (fallback `gpt-image-1`), uploads PNG to Object Storage, persists `media` row with `source=ai_template` + `public_url` + `storage_path`, updates job.
  - `GET /api/public/media/{path:path}` — **no-auth** proxy; fetches from Object Storage and returns bytes with `Cache-Control: public, max-age=86400`. DB enforces `is_deleted` filter.
  - `GET /api/admin/media-archive?source=...&limit=...` — filters soft-deleted rows, max 500.
  - `POST /api/admin/media/soft-delete` — marks `is_deleted=true` (storage has no delete API).
- Legacy `POST /admin/ai/generate-image` now: consumes credit, uploads to Object Storage, returns `public_url`.
- `_enforce_media_cap(500)` called after every media insert — soft-deletes oldest rows (reason `archive_cap`).
- `mackolik_scheduler.schedule_once(coro_factory)` — fixed to use `asyncio.run_coroutine_threadsafe` so AsyncIOScheduler correctly runs coroutines against the main event loop.
- Startup now also calls `object_storage.init_storage()` (Emergent LLM key reused).

### Frontend
- New `/admin/ai-studio` (`AiStudio.jsx`) — 8 template pills, dynamic form per template (player picker, match selector auto-fill, formation/opponent, minute, scorers CSV, fan invite text/message, stats JSON), aspect+quality selectors, "Üretimi Başlat (1 kredi)" submit. Right "İşler" panel auto-polls every 3s while pending/processing jobs exist; success jobs show image preview + download from `public_url`.
- `/admin/media` **Arşiv** rewritten — filter pills (Tümü / Yüklemeler / AI Prompt / AI Şablon) with counts, `X/500` header, soft-delete confirmation, loads from `public_url` → direct object-storage-backed render.
- Sidebar split into "AI Görsel (Prompt)" + "AI Stüdyo (Şablonlar)".
- Dashboard quick action updated to route to AI Stüdyo.
- `api.js` — new `aiTemplates/aiGenerateTemplate/aiJobs/aiJob/mediaArchive/mediaSoftDelete` helpers.

### Tests
- `/app/backend/tests/test_phase2_ai_media.py` — 12 new tests (templates list, job creation, credit deduction, 402 insufficient, full round-trip with real `gpt-image-2`, public media proxy, 404, archive filter, soft-delete, cap wiring).
- Regression: 45/45 (Phase 1 12 + backend_test 33 after `TestAIImage` updated to accept new `public_url` shape).
- Frontend E2E: all 8 template pills, dynamic forms, jobs polling, archive filters, sidebar split, paketim credit reflection.
- **Result: 57/57 backend passing, frontend 100%.** Minor fixes applied: template_key validation already precedes credit consume; `<option>` children wrapped as single string expression to silence React warning.

### Known follow-ups (tracked in § 6)
- Refund credit if `_run_ai_job` status=error (currently debit stays).
- ETag / Surrogate-Control on `/public/media/*` for CDN-grade caching.
- `_enforce_media_cap` should prefer trimming `source=ai` over `source=upload` (preserve curated uploads).
- Per-plan media cap (currently 500 hard-coded in Media.jsx).
- Protect `public_url` path with `mediaUrl()` URL parsing (currently regex-strips `/api`).
- Split `server.py` (~1520 lines) into `/app/backend/routes/` modules.

## 5f. 2026-05-02 — Phase 2 v2 **DR AI-style Overhaul** + Phase C Next Action Items

### Phase A + B — Prompt System + UI Baştan Yazıldı
- **`ai_media.py` (611 lines)** tamamen yeniden yazıldı (DR AI Futbol `ai_image.py` port):
  - **9 template (kullanıcı öncelik sırası):** match_week → match_day → lineup → full_time → motm → birthday → special_day → new_transfer → fan_invite.
  - **Design DNA catalog** — 5 layout × 8 scene × 4 typography × 3 drama = 480 benzersiz kombinasyon. Deterministic MD5 hash(club_id + variation_index) → her kulüp benzersiz görsel kimlik.
  - `resolve_design()` — DNA + opsiyonel user override (Akıllı/Özelleştir).
  - `_design_block()`, `_footer_lines()` (website + instagram aynı satır), `_typography_rules()` (Türkçe karakter zorunluluğu, negative rules).
  - Brand signature — şehir silüeti + "EST. YYYY" toggles.
- **server.py** AI flow:
  - `AiTemplateIn` 10 yeni field: custom_design + 4 override + 2 brand toggle + reference_images[] + variation_count (1|3).
  - **Varyasyon sistemi:** n alt-job oluşturulur, her biri farklı `variation_index` ile DNA hash değişir → gerçek estetik çeşitlilik. Her varyasyon = 1 kredi. Kredi kontrolü **atomik** (balance ≥ n up-front check, partial burn yok).
  - **Reference images** → `oclient.images.edit(model='gpt-image-2', image=files, ...)`; 1.5 fallback `input_fidelity='high'` ile.
  - **Refund on error** → _run_ai_job except branch 1 kredi iade + `refunded=true` flag + `refund` tx tipi.
  - Yeni `GET /api/admin/ai/design-options` — UI için catalog listesi.
- **`/admin/ai-studio` (AiStudio.jsx)** tamamen yeniden yazıldı:
  - 9 template pill (order'a göre sıralı).
  - **DesignCustomizer component** — Akıllı/Özelleştir toggle, 3 select (layout/typography/scene), drama slider 1-3, 2 brand-signature checkbox.
  - **RefImageSlot** — her template'in `reference_slots`'una göre dinamik upload alanları (home_crest/away_crest/team_photo/player_photo/club_crest), 5MB limit, preview + X silme.
  - **Team Photos picker** — kayıtlı takım fotolarından tıklayarak referans seçme.
  - Varyasyon dropdown: 1 veya 3.
  - Job panel'de design etiketi (layout·scene·typography·drama) + refund rozeti.
  - Template-spesifik form alanları data-testid'ler (field-title, field-body-text, field-occasion-hint, field-subtitle, field-match-context, field-from-club, field-match-text, field-message).
- **Team Photos CRUD** → yeni `/admin/team-photos` CrudPage, sidebar'a eklendi, `team_photos` COLLECTIONS'a eklendi, AiStudio'da referans picker olarak kullanılıyor.

### Phase C — Next Action Items (hepsi tamamlandı)
- **1. Kredi iadesi on error** — _run_ai_job except branch'inde.
- **2. Tema → Public CSS** — `GET /api/public/theme.css` no-auth endpoint `:root { --liv-primary, --liv-secondary, --liv-bg, --liv-theme }` döner; `PublicLayout.jsx` mount'ta `<link>` inject eder.
- **3. Server.py Refactor** — **DEFERRED** (testing agent yorumunda "ai_media.py 611 lines is dense — consider moving LAYOUT_RECIPES/SCENE_DESCRIPTIONS to design_dna.py" notu var, ileri sprint'e bırakıldı. Mevcut yapı stabil ve testli).
- **4. Multi-tenant `club_id`** — Subscription doc'ta `club_id='main'` field eklendi + legacy backfill. Gerçek multi-tenant izolasyon ileriki sprint'te.
- **5. Per-plan media cap** — `PLAN_MEDIA_CAP = {starter:100, plus:500, pro:2000}`, `_enforce_media_cap` önce AI items (source in ['ai','ai_template']) siler, ancak sonra upload'lara dokunur.
- **6. Site_settings schema validation** — `PUT /admin/site-settings` primary_color/secondary_color/bg_color için `#RRGGBB` regex + default_theme için `dark|light` enum → 400 Türkçe mesaj.

### Testing
- `/app/backend/tests/test_phase2_v2.py` — 17 yeni test (9 templates, Design DNA, variation_count=1|3, atomicity, theme.css, site-settings validation, team_photos CRUD, multi-tenant club_id).
- `/app/backend/tests/test_phase1.py` + `backend_test.py` — 45/45 regresyon passing.
- **Toplam: 62/62 backend passing + frontend %100.**
- Gerçek gpt-image-2 round-trip doğrulandı (special_day custom-design → Design DNA "editorial/low_angle/athletic/drama 2" → 1.3MB PNG Object Storage).
- Atomicity bug post-test fix'lendi (testing agent'ın bulduğu MINOR): `balance=1, n=3 → 402 + balance stays 1` (önceden 1 kredi burn ediyordu).

### Known follow-ups (§ 6)
- server.py (~1700 satır) + ai_media.py (611 satır) refactor → `/app/backend/routes/` + `services/` + `design_dna.py`.
- Gerçek multi-tenant izolasyon (tüm koleksiyonlar tenant-keyed).
- Team Photos için Object Storage migration (şu an base64 upload).

## 5g. 2026-05-02 — Önizleme Galerisi + Object Storage Migration

### Object Storage Migration (Team Photos & manuel upload'lar)
- `POST /api/admin/media/upload` artık base64 → Object Storage push ediyor; DB'de sadece `public_url` + `storage_path` saklanıyor (önceden `data_url` base64 stored). Storage erişilemezse base64 fallback.
- `purpose` field eklendi: `team_photo`, `upload`, `logo` etc. Storage path'i `livanespor/team_photo/202605/{uuid}.png` gibi prefix'lenir.
- `CrudPage.ImageField` upload'u backend'e yönlendiriyor → `public_url` döner; tablolarda absolute URL render edilir (`absUrl()` helper).
- Team Photos artık Object Storage'da. MongoDB hafif kalır, CDN-grade serve.

### Önizleme Galerisi (Phase 2.1)
- **Backend:**
  - `media` ve `ai_media_jobs` doc'larına `published_to_gallery: bool` + `gallery_template_key` field'ları.
  - `POST /api/admin/ai/gallery/publish` ve `unpublish` — kullanıcı opt-in.
  - `GET /api/public/ai/gallery?template_key=...&limit=12` — **no-auth endpoint** (anonim örnekler), `id`, `public_url`, `template_key`, `design`, `aspect_ratio` döner. Kulüp adı/logosu gizli.
  - `POST /api/admin/ai/gallery/seed` — sadece **super_admin**: bir şablon için N (max 6) gallery seed üretir. Generic placeholder context (`TEAM A vs TEAM B`, `PLAYER NAME`) kullanır → çıktılar evrensel. Auto-publish.
  - `_run_ai_job` success branch'inde `cur.auto_publish_to_gallery=True` ise media+job otomatik galeride.
- **Frontend (AiStudio.jsx):**
  - Yeni "Örnek Tasarımlar — {şablon adı}" panel — şablon değişince galeri auto-load.
  - Galeri grid (2-6 kolon responsive), her kart hover'da **"Bu DNA'yı Kullan"** overlay → Design Customizer'a layout/scene/typography/drama otomatik yüklenir.
  - "Galeriye 3 Örnek Ekle (3 kredi · HIGH)" butonu (super_admin) — şablon seçildikten sonra gerçek gpt-image-2 HIGH quality seed üretir.
  - Job kartlarında "Galeriye Ekle / Galeride" toggle butonu (her başarılı kullanıcı işi opt-in).
- **Test:**
  - Gerçek HIGH quality seed başarıyla üretildi → 3 farklı DNA (asymmetric/city/heritage·D1, editorial/low_angle/athletic·D2, editorial/abstract/editorial·D3). Public gallery endpoint anonimleştirilmiş 3 öğe döndü.
  - Manual publish/unpublish test edildi → 200 OK, gallery durumu doğru toggle oldu.
  - Non-success job publish denemesi → 400 (sadece success işler eklenebilir).
  - Frontend smoke screenshot: 3 yüksek kaliteli görsel + DNA etiketleri + butonlar render edildi.

## 5h. 2026-05-02 — Resilience Trio: Stale Recovery + Lightbox + Caption AI

### A. Stale Job Recovery (DR AI Futbol mantığı + bizim async pattern)
**Sorun analizi:** DR AI senkron POST → 524 timeout → 8dk arşiv polling fallback. Bizde async job pattern olduğu için timeout yok, AMA worker crash edip job sonsuza dek `processing` kalabilirdi.
**Çözüm:**
- `recover_stale_jobs()` — `processing >5dk` veya `pending >10dk` job'ları auto-fail eder + 1 kredi iade eder + `auto_recovered=True` flag.
- Boot anında bir kez çalışır (server restart sonrası kayıp job'ları temizle).
- APScheduler IntervalTrigger her 3dk'da bir çalışır (canlıda takılan job'lar saatlerce kalmaz).
- Manuel trigger endpoint: `POST /api/admin/ai/jobs/recover-stale` (kullanıcı isterse force-run).

### B. Lightbox (görsele tıkla → büyüt + indir + caption göster)
- Yeni `/app/frontend/src/components/admin/Lightbox.jsx` shared component.
- AI Stüdyo: tüm başarılı job kartlarındaki görseller tıklanabilir → modal açılır, **batch içinde sol/sağ ok ile gezinme**, ESC kapatma.
- Galeri: galeri item'larına tıklayınca lightbox açılır (galeri item'ları arası gezinme).
- Medya Arşivi: arşiv item'larına tıklayınca lightbox.
- Sağ panelde: Şablon adı, Design DNA, **Instagram caption + 5 hashtag** ("Kopyala" butonuyla tek tıkta clipboard'a), İndir butonu, thumbnail navigation.
- Klavye: ESC kapat, ← → batch içinde gezinme.

### C. Otomatik Caption + 5 Hashtag (DR AI Futbol tonu portu)
- Yeni `/app/backend/caption_ai.py` — `emergentintegrations.LlmChat` üzerinden **GPT-5.2** ile.
- `EMERGENT_LLM_KEY` env'den okunur (.env'de zaten var).
- **Türkçe samimi ton** + 1-3 emoji + 2-6 satır + **klişe yasakları** (zafer için savaşacağız vs).
- **Sonuç tonu otomatik tespit** (`full_time` template'i için): galibiyet/mağlubiyet/beraberlik. Mağlubiyette `"üzgünüz/kayıp"` kelimeleri açıkça yasaklı, "daha iyi yarınlar" pozitif ton dayatılıyor.
- 5 hashtag deterministic: `#{short_name} #{city|league} + 3 content-type-specific tag` (slugify Turkish chars: `ı→i, ş→s, ğ→g, ü→u, ç→c, ö→o`).
- `_run_ai_job` success branch'inde otomatik tetiklenir, hata olursa best-effort silent (görsel yine kullanıcıya gider).
- `media` ve `ai_media_jobs` doc'larına `social_caption: {caption, hashtags, combined}` saklanır.
- Frontend: job kartında 2 satır preview + lightbox'ta tam metin + "Kopyala" butonu.

### Test
- Manuel curl: `special_day` → caption üretildi: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun! 🏆 Livanespor TEST olarak yarınlarımızın sahibi çocuklarımızın yanında, aynı sevincin içindeyiz. ⚽..." + hashtags `#liv #amatorfutbol #ozelgun #kutluolsun #futbol`
- Stale recovery manual trigger: 200 OK, recovered=0 (sistem temiz).
- Lightbox screenshot: 23 Nisan poster tam ekran + DNA tag + "İndir (1/3)" + 3 thumbnail navigation çalışıyor.

## 6. Backlog
### P1 (next iteration)
- **Refactor monolith:** server.py (~1700) + ai_media.py (611) → `/app/backend/routes/` + `services/` + `design_dna.py`.
- **Gerçek multi-tenant izolasyon** — tüm koleksiyonlara tenant_id/club_id; admin users'a tenant assignment.
- **Team Photos Object Storage migration** (şu an base64 data URL).
- WYSIWYG rich text editor (TinyMCE/Lexical) haber içerikleri için.
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

## 5i. 2026-05-03 — Code Quality Hardening (Code Review Pass)

### Real Findings Addressed
- **Hardcoded test credentials → env vars** in all 4 pytest files (`backend_test.py`, `test_phase1.py`, `test_phase2_ai_media.py`, `test_phase2_v2.py`). Now read `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` from env with safe local-dev defaults. `REACT_APP_BACKEND_URL` falls back to `http://localhost:8001` so tests do not crash on missing env.
- **MD5 → SHA256** in `ai_media._design_dna()`. Determinism preserved (still same hex slicing pattern, sha256 gives 64-char hex of which we use first 8 chars).
- **`build_full_time` complexity reduced** — extracted 3 helpers: `_format_scorer_lines`, `_full_time_goal_panel`, `_full_time_info_panel`. Prompt output verified identical.
- **Stale `EXPECTED_TEMPLATES`** in `test_phase2_ai_media.py` updated from old Phase 2 v1 set (8 keys) to v2 set (9 keys: match_week/match_day/lineup/full_time/motm/birthday/special_day/new_transfer/fan_invite).
- **Stale round-trip test** updated to read from new `{batch_id, jobs: [...], variation_count}` response shape.

### Code Review Items Verified as False-Positives (NOT changed)
- **`is None` / `is False`** comparisons (server.py:676, mackolik_*.py, caption_ai.py:73, ai_media.py:123) — these are the **canonical Python idiom** for singleton checks (PEP 8). Replacing with `==` would actually be wrong.
- **`data, ctype` "undefined"** at server.py:1267 — they ARE defined inside the try block; if `get_bytes` raises, HTTPException 502 is raised before reaching `return`. Code is correct; static analyzer false positive.
- **`_scheduler` "undefined"** at mackolik_scheduler.py:97 — declared as `Optional[AsyncIOScheduler] = None` global at line 27. Static analyzer false positive.

### Test Results
- **74/74 backend pytest passing** (was 73 before; the 2 stale Phase 2 v1 tests are now corrected).
- Lint shows only E701/E702 cosmetic style nits (semicolon/colon-on-same-line) — left as-is to minimize churn.




## 5j. 2026-05-03 — Dashboard v1.7.0 + Backend Refactor v1.7.1

### Dashboard Features (v1.7.0) — VERIFIED ✓
- **Sezon Form Grafiği** (Son 10 Maç) — bar chart with our goals vs opponent goals, color-coded by W/D/L
- **En İyi Performans** — Gol Kralı (top 5 scorers) + Asist Kralı (top 5 assist providers)
- Backend: `/api/admin/dashboard/stats` returns `season_form`, `season_form_summary`, `top_performers`
- Frontend: `Dashboard.jsx` data-testids `dashboard-form-chart`, `dashboard-top-performers`
- Status: Verified via screenshot + curl. Live data renders (3G·4B·3M·29-23, 5 scorers).

### Backend Refactor (v1.7.1) — Server.py split
- **Goal:** Reduce server.py size to prevent hot-reload truncation issues during search_replace
- **Result:** server.py: 2213 → 1700 lines (-23%, -513 lines)
- **New modules:**
  - `/app/backend/seeds.py` (313 lines) — `seed_admin()` + `seed_content()` extracted as stateless functions taking `db` as arg
  - `/app/backend/dashboard_routes.py` (249 lines) — `register_dashboard_routes()` factory exposing `/admin/dashboard/birthdays` and `/admin/dashboard/stats` with all helper logic (`_parse_birth`, `_upcoming_birthdays`)
- **Wiring in server.py:**
  - `from seeds import seed_admin as _seed_admin, seed_content as _seed_content` — used in `startup_event`
  - `register_dashboard_routes(api_router, db, require_admin, _ensure_subscription_doc)` called BEFORE `app.include_router(api_router)`
  - `force_reseed` endpoint inline-imports `seeds.seed_admin` for backward compatibility
- **Tests:** 74/74 pytest passing, all dashboard/auth/CRUD endpoints curl-verified

### Future refactor candidates (P2)
- AI Studio routes (~500 lines: `/admin/ai/templates`, `generate-template`, `_run_ai_job`, gallery, design-options) → `ai_routes.py`
- Mackolik routes (~120 lines) → `mackolik_routes.py`
- Subscription/Credit routes (~140 lines) → `subscription_routes.py`
- Media upload/archive routes (~80 lines) → `media_routes.py`
- After all extractions, server.py would reduce to ~800 lines (auth + public + CRUD factory + AI generate + wiring)

## 5k. 2026-05-03 — v1.8.0 Role Management + DR AI Image 2 Rebrand + Caption Polling

### Role System (Kullanıcı talebi)
- **Two-role model**: Süper Admin (Ali Özer, proje sahibi) + Yönetici (kulüp yöneticisi).
- Backend: New `require_super_admin` dependency in `/app/backend/server.py`. Protects:
  - `GET  /api/admin/ai-settings` (super-only read)
  - `PUT  /api/admin/ai-settings` (super-only write)
  - `PUT  /api/admin/subscription/plan`
  - `POST /api/admin/subscription/credit-adjust`
  - `GET  /api/auth/users`
  - (Existing: `POST /api/auth/users` has inline super-check)
- Frontend `AdminLayout.jsx`: NAV items with `superOnly:true` flag (Paketim, Kullanıcılar) are hidden for non-super-admin users. Role label mapped via `ROLE_LABEL` (super_admin → "Süper Admin", admin → "Yönetici").
- Frontend `Users.jsx`: Create user form simplified to only create "Yönetici" (admin role). Role select dropdown removed; role hard-coded to `admin`. Email field renamed to "Kullanıcı Adı".
- Frontend `Settings.jsx`: New "DR AI Image 2 Ayarları" section at bottom, rendered **only if `user.role === 'super_admin'`**. AI API key management moved here from AI Görsel page.

### DR AI Image 2 Rebrand
- `AiStudio.jsx`: Page title "Şablon Üretici" → "AI Stüdyo" (h1). Subtitle "9 hazır şablon · Design DNA · Varyasyon (1 veya 3) · Referans görsel destekli gpt-image-2. Her varyasyon 1 kredi." → "DR AI Image 2 — Her görsel 1 kredi harcar."
- Job card "gpt-image-2 çalışıyor" → "DR AI Image 2 çalışıyor"
- `AiPanel.jsx`: Model name "gpt-image-2" → "DR AI Image 2" in toasts + history badges.
- `AdminLayout.jsx` sidebar:
  - "AI Görsel (Prompt)" → "AI Görsel"
  - "AI Stüdyo (Şablonlar)" → "AI Stüdyo"

### AI Görsel page — Reference photo upload
- `AiPanel.jsx` completely rebuilt (AI Ayarları block removed → moved to Settings).
- New `RefSlot` component: 3 drag-and-drop reference photo slots (max 5MB each).
- User can upload reference photos to guide AI generation (e.g. player portrait style, stadium photo, kit reference).
- Backend `AiGenerateIn` Pydantic model extended with `reference_images: Optional[List[str]]`.
- Backend `admin_ai_generate`: If refs provided, uses `oclient.images.edit(model="gpt-image-2", image=files, ...)` with fallback to `gpt-image-1`. If no refs, uses `images.generate` as before.

### Caption Polling Fix (kullanıcı raporu)
**Problem**: Görsel üretildikten sonra caption yazısı hazırlanırken kullanıyor "hazırlanıyor…"da kalıyor, ancak sayfa refresh edilince görünüyor. Caption async olarak resim tamamlandıktan SONRA üretiliyor.
**Fix**: `AiStudio.jsx` polling useEffect genişletildi:
- Eski koşul: jobs has pending/processing → poll her 3 saniye
- Yeni koşul: **EK OLARAK** success jobs içinde `social_caption` eksik ve `finished_at` < 2 dakika önceyse poll devam et
- Ek yeni effect: Lightbox açıkken, jobs her polling'de güncellendiğinde lbItems'ı da senkronize ediyor (yeni gelen caption'ı lightbox'a yansıtıyor)
- Sonuç: Kullanıcı refresh etmeden caption otomatik gösteriliyor (image + 5-30sn)

### Testing
- 74/74 backend pytest passing
- Role enforcement manual-tested: Yönetici rolü `/api/admin/ai-settings`, subscription/plan, subscription/credit-adjust, /auth/users → 403. Dashboard stats, posts list, subscription read → 200.
- Screenshot: AI Stüdyo header "AI STÜDYO" + "DR AI Image 2 — Her görsel 1 kredi harcar." ✓
- Screenshot: AI Görsel sayfası "AI GÖRSEL" + 3 "FOTO EKLE" reference slot + no AI Settings block ✓
- Screenshot: Settings AI section "DR AI IMAGE 2 AYARLARI" visible for super_admin ✓

### Version
- `/app/frontend/src/version.js`: v1.7.1 → **v1.8.0**

