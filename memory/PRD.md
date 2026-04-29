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

## 5b. 2026-04-29 — Real Mackolik Data Import
- **Standings**: Wiped dummy 8 rows, inserted **19 real rows** (11 = Süper Amatör Lig Bursa 1.Grup, 8 = Play-Off). New `league_group` field; public `/puan-durumu` shows two separated tables; home mini-table filters to `1.Grup`. Endpoint `/api/public/standings?league_group=...` filter added.
- **Matches**: Wiped dummy 5, inserted **27 real fixtures** (25 finished + 2 upcoming). Competition split between `Süper Amatör Lig - Bursa 1.Grup` (regular season 20 weeks) and `Süper Amatör Lig - Bursa Play-Off` (Mar–May 2026).
- **Squad**: Updated 20 existing players (matched by Turkish-normalized name), added 14 missing players → total **34** with full Mackolik stats (matches, starts, goals, yellow/red cards). Top scorer = Burak Kocatürk (28 gol). Assists not exposed by Mackolik kadro tablosu, top_assist left empty (admin-managed).
- **Staff**: Tarkan Civelek (Teknik Direktör) verified present.
- **Script**: `/app/backend/import_real_data.py` — idempotent, re-runnable.
- **Frontend**: New `Standings.jsx` (two-table layout); `Home.jsx` filters standings to `1.Grup`; `admin/Standings.jsx` exposes `league_group` column for manual edits; `App.js` import for `AdminAccount` (was missing, runtime crash).

## 6. Backlog
### P1 (next iteration)
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
