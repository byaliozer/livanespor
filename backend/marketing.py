"""
DR AI FUTBOL — Pazarlama (Marketing) İçerik Üretimi
====================================================
Generates Instagram marketing assets (feed/story/landscape) + Turkish captions.

10 pre-defined concept templates. Each concept has tailored visual prompts for
3 Instagram-ready aspect ratios + a caption template guided by a system prompt
that produces hashtag-laden CTA copy ending with www.draifutbol.com.

Brand rules (enforced via prompt):
- Example club name on visuals: "ÖZERSPOR" (generic stand-in)
- Footer watermark: "www.draifutbol.com" subtle bottom strip
- Brand corner badge: "DR AI FUTBOL" wordmark, top-left or top-right
- AI engine is referred to as "DR AI Engine" in all user-facing copy
  (never reveal GPT-5.2/OpenAI in captions)
- Palette: vivid yellow #f5dc4c + deep black #0b0b0b + white
"""
from __future__ import annotations
from typing import Dict, List, Any

# ─────────────────────────── Concept Catalog ───────────────────────────
# Each concept has:
#   - id, title, hook (Turkish), category
#   - prompts: dict of size→detailed gpt-image-2 prompt
#   - caption_brief: instruction handed to the DR AI Engine to write the IG caption

CONCEPTS: List[Dict[str, Any]] = [
    {
        "id": "01-fomo-baskan",
        "title": "BAŞKAN, BU SİSTEM YOKSA GERİ KALIYORSUN",
        "hook": "Diğer kulüpler dijitalleşti. Sen hâlâ defter mi tutuyorsun?",
        "category": "awareness",
        "prompts": {
            "feed":      "Square 1:1 Instagram post for a Turkish football club admin platform called DR AI FUTBOL. Cinematic photo composition: a dimly lit Turkish football club president's office at night, dusty stack of paper notebooks and scattered post-it notes on a wooden desk in shadow on the LEFT side, on the RIGHT side a bright glowing modern MacBook Pro showing a sleek dark-themed admin dashboard with vibrant yellow #f5dc4c accents (charts, scoreboards, match cards). Strong rim light on the laptop, dramatic chiaroscuro. Bottom edge: thin yellow strip with the text 'www.draifutbol.com' in small white uppercase letters. Top-right corner: small white wordmark 'DR AI FUTBOL' in bold sans-serif. Center-top headline in giant bold uppercase Turkish: 'BAŞKAN, SİSTEM YOKSA GERİ KALIYORSUN' in yellow. Ultra-realistic, editorial photography, 8k, photoreal.",
            "story":     "Vertical 9:16 Instagram Story for DR AI FUTBOL platform. Same FOMO theme: split vertical composition — top 40% shows dusty notebooks and chaos on a dark desk; bottom 60% shows a bright MacBook Pro with a yellow-accented football admin dashboard. Centered headline 'BAŞKAN, GERİ KALIYORSUN' in massive yellow uppercase. Sub-line below in white: 'Bir kez dene. Defterleri unutursun.' Bottom strip: 'www.draifutbol.com'. Top-left: small 'DR AI FUTBOL' wordmark. Yellow #f5dc4c, deep black #0b0b0b, dramatic noir lighting, 8k.",
            "landscape": "Horizontal 16:9 ad creative for DR AI FUTBOL. Wide cinematic composition: left third — old leather notebooks and a broken pen in shadow; center — a glowing modern admin dashboard on a MacBook screen with yellow #f5dc4c data widgets, charts, match-day cards; right third — a sharp Turkish football club crest (fictional 'ÖZERSPOR') faintly visible in the dark. Bold uppercase Turkish headline across the top: 'DİJİTAL ÇAĞ BAŞLADI, SİZ NEREDESİNİZ?' Bottom-right CTA pill button rendered into the image saying 'www.draifutbol.com'. Subtle 'DR AI FUTBOL' brand badge top-left. Cinematic, editorial, 8k.",
        },
        "caption_brief": "FOMO-based, addresses club presidents directly. Hook: dijital çağ kaçıyor. Mention: AI maç analizi, otomatik sosyal medya, kasa, sözleşme — hepsi tek panel. End with CTA to www.draifutbol.com.",
    },
    {
        "id": "02-30sn-mac-analizi",
        "title": "30 SANİYE = 6000 KELİMELİK MAÇ ANALİZİ",
        "hook": "Antrenör 2 saatte yapamaz. DR AI Engine 30 saniyede yapıyor.",
        "category": "feature",
        "prompts": {
            "feed":      "Square 1:1 Instagram post for DR AI FUTBOL match analysis feature. Dramatic split composition: LEFT half — a vintage brass hourglass with sand flowing, '30 saniye' text floating in yellow steam; RIGHT half — a glowing A4 sheet of paper rendered photographically with a Turkish football pre-match analysis report visible (sections: 'GENEL DEĞERLENDIRME', 'RAKİP ANALİZİ', 'SKOR TAHMİNİ 2-2'), tactical heatmap graphics. Big bold yellow #f5dc4c headline across top: '30 SANİYEDE PROFESYONEL MAÇ RAPORU'. Small badge bottom-right reads 'Powered by DR AI Engine'. Top-left: 'DR AI FUTBOL' wordmark. Bottom: thin yellow strip 'www.draifutbol.com'. Hyperreal editorial photography, dark moody background, 8k.",
            "story":     "Vertical 9:16 story for DR AI FUTBOL match analysis. Center: a vertical A4 report sheet floating in space against a dark navy background, glowing yellow rim light. Report sections visible: 'vs MUDANYASPOR', 'Rakip Analizi', 'Volkan Depe — 33 gol tehdidi' alert box in red. Above the sheet: massive yellow uppercase headline 'RAKİBİ ÖNCEDEN ÇÖZ'. Below: 'DR AI Engine — 30 saniyede 6 bölüm rapor'. Bottom: 'www.draifutbol.com'. Brand badge top-left 'DR AI FUTBOL'. Particle dust, dramatic light, 8k cinematic.",
            "landscape": "Wide 16:9 social ad: split into 3 vertical panels. Panel 1 (left): antique hourglass with golden sand. Panel 2 (center): MacBook displaying analysis report (Turkish text visible). Panel 3 (right): a Turkish coach silhouette pointing at a tactics board with yellow arrows. Top headline across full width: '30 SN = 6000 KELİME UZMAN ANALİZİ'. Bottom-right CTA pill: 'www.draifutbol.com'. Tiny 'DR AI Engine' badge. Yellow #f5dc4c, black #0b0b0b, white. Cinematic dramatic editorial photography, 8k.",
        },
        "caption_brief": "Feature-focused. Mention: 30 saniye, Mackolik canlı veri, rakibin son 10 maçı, ev-deplasman ayrımı, en golcü oyuncuları, skor tahmini, MOTM adayı. Coach + president pain point. End CTA.",
    },
    {
        "id": "03-9-sablon",
        "title": "9 INSTAGRAM ŞABLONU · TEK TIK",
        "hook": "Sosyal medya sorumlunuz olmasa da olur.",
        "category": "feature",
        "prompts": {
            "feed":      "Square 1:1 Instagram post for DR AI FUTBOL social media templates feature. A photoreal 3x3 grid mosaic composition showing 9 different Turkish football social media graphics tiled together — sample categories visible in each tile: 'MAÇ HAFTASI', 'İLK 11', '2-1 GALİBİYET', '0-2 MAĞLUBİYET', 'DOĞUM GÜNÜ', 'HOŞ GELDİN', 'GOOOL!', 'PUAN DURUMU', 'ANTRENMAN' — all in yellow-black Turkish football club aesthetic with fictional 'ÖZERSPOR' crest. Center of the grid: a large yellow circular emblem 'DR AI FUTBOL · 9 ŞABLON · TEK TIK' overlay. Bottom strip: 'www.draifutbol.com'. Cinematic, premium graphic design layout, 8k photorealistic mockup.",
            "story":     "Vertical 9:16 story showing a smartphone in foreground swiping through 9 Instagram template previews of Turkish football posts (visible mini-thumbnails on phone screen and floating around it). Headline at top in massive yellow uppercase: '9 ŞABLON · 1 TIK'. Sub-line: 'Sosyal medya artık dert değil.' Bottom: 'www.draifutbol.com'. Brand badge top-left 'DR AI FUTBOL'. Dark navy background with floating template cards orbiting the phone. 8k, cinematic, premium.",
            "landscape": "Wide 16:9 landscape ad showing 9 Instagram template cards arranged in a stagger flow from left to right across the canvas (3 rows, 3 columns slightly tilted, like a fanned deck of cards). Each card visibly Turkish football themed with yellow-black design. Center foreground: bold uppercase headline 'TEK PANEL, 9 ŞABLON, BİTMEYEN İÇERİK' in yellow. Bottom-right CTA pill 'www.draifutbol.com'. Top-left 'DR AI FUTBOL' wordmark. Cinematic studio lighting, photoreal, 8k.",
        },
        "caption_brief": "Showcase 9 different templates: maç haftası, ilk 11, galibiyet, mağlubiyet, doğum günü, transfer, gol, puan durumu, antrenman. Emphasize: AI üretir, kulüp renkleriniz otomatik, instagram handle + web URL otomatik bindirilir. End CTA.",
    },
    {
        "id": "04-oyuncu-mutlu",
        "title": "OYUNCUNUZ INSTAGRAM'DA PAYLAŞIYOR. KULÜP REKLAM YAPIYOR.",
        "hook": "Oyuncular mutlu = transferleri çekiyor = kulüp değeri artıyor.",
        "category": "social-proof",
        "prompts": {
            "feed":      "Square 1:1 Instagram post showing a young Turkish football player (around 20 years old, fictional 'ÖZERSPOR' yellow-black kit) holding his smartphone proudly. On the phone screen visible: a high-quality football goal celebration social media graphic (DR AI FUTBOL-style template) being shared on his Instagram. Soft golden hour stadium lighting in background, slight bokeh of seats. Big bold yellow Turkish headline at top: 'OYUNCUNUZ MUTLU, KULÜP DEĞERLENİYOR'. Bottom strip: 'www.draifutbol.com'. Top-left badge 'DR AI FUTBOL'. Documentary-style photo, emotional, 8k photoreal.",
            "story":     "Vertical 9:16 story: emotional close-up of a young Turkish footballer's hands holding a phone, the phone screen shows his own goal-celebration graphic being shared, with social engagement metrics (1.2K likes, comments) floating around the phone in yellow glow. Top headline in massive yellow uppercase: 'OYUNCU GURUR DUYUYOR'. Sub-line: 'Profesyonel görseller — kulübünüzün imzası.' Bottom: 'www.draifutbol.com'. Brand badge 'DR AI FUTBOL' top-left. Warm golden tones, intimate documentary feel, 8k.",
            "landscape": "Horizontal 16:9 wide ad: left side a Turkish football player in yellow-black 'ÖZERSPOR' kit smiling looking at his phone; right side a giant stylized Instagram phone interface showing his shared goal-celebration post with high engagement counters. Top headline across the canvas: 'OYUNCU MUTLU = TRANSFER ÇEKEN KULÜP'. Bottom-right CTA pill 'www.draifutbol.com'. 'DR AI FUTBOL' badge top-left. Yellow #f5dc4c accents, dramatic warm lighting, premium photo composite, 8k.",
        },
        "caption_brief": "Emotional angle. Player satisfaction → social currency → transfers → club brand value. Mention 9 templates, AI görsel kalitesi, oyuncu profilleri otomatik. End with CTA.",
    },
    {
        "id": "05-kasa-yonetimi",
        "title": "KASA: ₺28.500 · GEÇEN AY: ₺19.200",
        "hook": "Kulübün cebi, başkanın avucunda.",
        "category": "feature",
        "prompts": {
            "feed":      "Square 1:1 Instagram post for DR AI FUTBOL finance module. Photoreal scene: a hand holding a smartphone displaying a clean dark-themed finance dashboard with bright yellow #f5dc4c data widgets (income/expense chart, monthly comparison cards with Turkish lira numbers '₺28.500 BU AY', '+%48 GEÇEN AYA GÖRE', green up arrow). Background: blurred Turkish football pitch with floodlights. Big bold yellow headline at top: 'KULÜP KASASI · AVUCUNUZDA'. Bottom strip: 'www.draifutbol.com'. Top-left 'DR AI FUTBOL' wordmark. Cinematic moody lighting, 8k photoreal product shot.",
            "story":     "Vertical 9:16 story: floating smartphone in 3D space against dark navy background, screen showing finance dashboard with big '₺28.500' number prominent, green upward chart, category breakdown (Sponsorluk, Maaş, Saha Kirası). Around the phone: floating Turkish lira coin particles in yellow glow. Top massive yellow uppercase headline: 'BAŞKAN, KASAN HAZIR'. Below: 'Gelir, gider, sponsor tahsilatı — tek ekran.' Bottom: 'www.draifutbol.com'. Brand badge 'DR AI FUTBOL'. 8k cinematic.",
            "landscape": "Horizontal 16:9 ad: left third — Turkish football club president's hands resting on an ornate leather desk with a fountain pen and Turkish tea glass; center two-thirds — laptop screen showing comprehensive finance dashboard (charts, monthly comparison, category breakdown in Turkish). Top headline 'KASA YÖNETİMİ · KARA TAHTA MANTIĞIYLA'. Bottom-right CTA pill 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Warm dramatic lighting, editorial 8k photoreal.",
        },
        "caption_brief": "Finance module pitch. Mention: 8 gelir + 8 gider kategorisi, sponsor tahsilat takibi, son 6 ay grafiği, dashboard widget, geçen ay karşılaştırma. Pain: dağınık defter, kaybolan WhatsApp ödemesi. End CTA.",
    },
    {
        "id": "06-sozlesme-uyarisi",
        "title": "SÖZLEŞMESİ BİTTİ. BEDAVA GİTTİ. 750.000 ₺ KAYIP.",
        "hook": "Bizimle çalışsaydın kaybetmezdin.",
        "category": "urgency",
        "prompts": {
            "feed":      "Square 1:1 dramatic post about contract management. Photoreal: a torn football player contract document on a dark wooden desk, with a large red X mark stamped over it. Next to it: a smartphone displaying a Turkish admin panel alert card 'UYARI: 3 SÖZLEŞME 90 GÜN İÇİNDE BİTİYOR' in amber/red. Above the scene, massive bold yellow uppercase Turkish headline: 'SÖZLEŞMESİ BİTTİ, ADAM BEDAVA GİTTİ'. Sub-line: 'Bu hatayı bir kez yapın — 750.000 ₺ kaybedin.' Bottom: 'www.draifutbol.com'. Top-left 'DR AI FUTBOL' brand. Dramatic chiaroscuro lighting, 8k editorial photoreal.",
            "story":     "Vertical 9:16: top half shows a torn contract paper falling in slow motion, bottom half shows the same admin panel alert card on a phone, with '90 GÜN' countdown number prominent. Massive yellow uppercase headline 'BEDAVA GİDEN OYUNCU = KAYIP BONSERVİS'. Sub: 'DR AI Engine 90 gün önceden uyarır.' Bottom: 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Dark moody noir, 8k.",
            "landscape": "Horizontal 16:9 wide: a Turkish football player walking away from a stadium with his bag over shoulder (silhouette, deplasman from his club), torn contract papers blowing in wind. Foreground right: a phone showing alert dashboard with 3 expiring contract names. Headline top: 'SÖZLEŞMENİZİ TAKİP EDEN BİR SİSTEM YOKSA...'. Bottom-right CTA 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Cinematic somber drama, yellow accent on phone screen, 8k.",
        },
        "caption_brief": "Fear-based, urgency. Real scenario: oyuncuyu yenilemediniz, bedava gitti, bonservis kayboldu. Mention: 90 gün önceden uyarı, ödeme tipi takibi (bonservis, maç başı prim, sezonluk taksit, imza parası, bonus), transfer geçmişi. End CTA.",
    },
    {
        "id": "07-rakip-analiz",
        "title": "RAKİBİNİZİ MAÇTAN ÖNCE TANIYIN",
        "hook": "Sahaya çıkmadan kazanılan maç.",
        "category": "feature",
        "prompts": {
            "feed":      "Square 1:1 Instagram post. Photoreal night football stadium tribune view with full crowd silhouettes, overlaid semi-transparent yellow #f5dc4c holographic data graphics: heatmap on the pitch, player profile cards floating ('Volkan Depe #9 — 33 GOL'), tactical arrows, alert box 'RAKİP DEPLASMANDA ÇOK GÜÇLÜ'. Top headline in massive yellow uppercase Turkish: 'RAKİBİ MAÇTAN ÖNCE ÇÖZ'. Sub-line: 'Mackolik canlı veri + DR AI Engine analiz.' Bottom: 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Cinematic sci-fi sports aesthetic, 8k.",
            "story":     "Vertical 9:16 story: a Turkish football coach's tablet in his hands at the touchline (visible boots on grass at bottom), screen displaying a full pre-match analysis report with sections '## 3. RAKIP ANALIZI', threat alerts in red, score prediction '2-1' in yellow. Around the tablet, floating data particles in yellow glow. Top headline 'SAHAYA ÇIKMADAN ÖNCE KAZAN'. Bottom: 'www.draifutbol.com'. 'DR AI FUTBOL' top-left badge. 8k cinematic.",
            "landscape": "Horizontal 16:9 wide cinematic: left two-thirds — a dramatic dimly-lit Turkish dressing room with players' jerseys hung up (fictional 'ÖZERSPOR' yellow #9 jersey prominent), tactical board with arrows; right third — close-up of the DR AI FUTBOL match analysis dashboard on a tablet with 'vs MUDANYASPOR' header, alert boxes visible. Top headline 'RAKİP ANALİZİ · DR AI ENGINE'. Bottom-right CTA pill 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Dramatic moody, 8k.",
        },
        "caption_brief": "Match analysis feature. Mention: Mackolik canlı veri, rakibin son 10 maçı, ev/deplasman ayrımı, en golcü oyuncuları (isim+numara+gol/maç), otomatik tehlike uyarıları, 6 bölümlü rapor, skor tahmini + MOTM. Powered by DR AI Engine (NEVER say GPT/OpenAI). End CTA.",
    },
    {
        "id": "08-kurumsal-web-sitesi",
        "title": "KULÜBÜNÜZÜN KENDİ KURUMSAL WEB SİTESİ",
        "hook": "Sponsorlar bulduğunda WhatsApp adresi mi verirsiniz?",
        "category": "feature",
        "prompts": {
            "feed":      "Square 1:1 premium product mockup: three Turkish football club website screens on three devices arranged in a triangular composition — MacBook Pro showing homepage (hero with stadium photo, fictional 'ÖZERSPOR' branding, news grid, sponsor strip), iPhone showing match fixtures page, iPad showing squad/team page with player cards. All in yellow #f5dc4c + black #0b0b0b theme. Dark studio background with subtle yellow glow. Top headline 'KENDİ KURUMSAL WEB SİTENİZ · DAHİL'. Sub-line tiny: 'kulubunuz.com — özel domain, SSL, mobil uyumlu.' Bottom strip 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. 8k product photography, premium editorial.",
            "story":     "Vertical 9:16 story: an iPhone in portrait orientation in 3D floating space, screen scrolling through different pages of a Turkish football club website (homepage → maçlar → kadro → sponsorlar). Around it, floating UI cards. Top headline in massive yellow: 'WEB SİTENİZ HAZIR · 48 SAATTE'. Sub: 'Özel domain. SSL. Kurumsal prestij.' Bottom: 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Dark navy bg with yellow particles, 8k.",
            "landscape": "Wide 16:9 horizontal banner: showcase of a full Turkish football club website displayed on a large desktop monitor in a modern studio setting, with iPhone and iPad on either side showing mobile versions. Soft dramatic studio lighting. Top headline 'PANEL + KURUMSAL WEB SİTESİ · TEK PAKET'. Bottom-right CTA 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Premium editorial product photography, 8k.",
        },
        "caption_brief": "Highlight kurumsal web sitesi as part of the package. Mention: özel domain, SSL, mobil uyumlu, dark/light mode, panel'de değişen her şey siteye anında yansır. Pain: ucuz Wix sitesi vs kurumsal kimlik. Sponsor cezbedici unsur. End CTA.",
    },
    {
        "id": "09-yoklama-30sn",
        "title": "YOKLAMA = 30 SANİYE",
        "hook": "WhatsApp gruplarında isim sormak bitti.",
        "category": "feature",
        "prompts": {
            "feed":      "Square 1:1 Instagram post: a Turkish football coach on a green training pitch at golden hour holding a tablet, on the tablet screen visible a digital attendance checklist with most player names showing green check marks 'GELDİ' and two with red 'GELMEDİ' + reason input. Players warming up in background slightly out of focus. Top massive yellow uppercase headline: 'YOKLAMA · 30 SANİYE'. Sub: 'Default herkes geldi. Sadece istisnaları işaretle.' Bottom: 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Cinematic documentary-style sports photo, 8k.",
            "story":     "Vertical 9:16: close-up of coach's hands on tablet attendance interface, swiping checkmarks. Green check icons floating around. Top headline 'KİM GELDİ? KİM GELMEDİ?'. Sub: 'DR AI FUTBOL Yoklama — 30 saniye, kâğıt yok.' Bottom: 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Golden hour pitch ambiance, 8k.",
            "landscape": "Wide 16:9 landscape: left half — A-Team Turkish football club training session on green pitch with coach holding tablet (fictional 'ÖZERSPOR' yellow training bibs visible); right half — extreme close-up of the tablet showing the attendance interface with multiple player rows, green/red statuses, reason inputs. Top headline 'YOKLAMA · DEVAMLILIK ŞAMPIYONLARI'. Bottom-right CTA pill 'www.draifutbol.com'. 'DR AI FUTBOL' top-left. Documentary cinematic, warm lighting, 8k.",
        },
        "caption_brief": "Daily pain point: WhatsApp grup mesajlarında 'bugun antrenman var mı?', 'sebebi ne?' sorgulamaları. Çözüm: Yoklama modülü, A Takım + U13-U19 ayrımı, sebep zorunlu, dashboard widget: devamlılık şampiyonları + en çok gelmeyenler. End CTA.",
    },
    {
        "id": "10-48saat-teslim",
        "title": "48 SAAT İÇİNDE TESLİM — DEMO ÜCRETSİZ",
        "hook": "Yarın değil. 48 saat sonra elinizde.",
        "category": "cta",
        "prompts": {
            "feed":      "Square 1:1 Instagram post: vintage Turkish sports advertisement aesthetic mixed with modern luxury feel. Background: deep black #0b0b0b. Foreground: gigantic vibrant yellow #f5dc4c number '48H' rendered in bold geometric uppercase across the full canvas (taking 60% of frame). Top above the number: 'TESLİM SÜRESİ' in white uppercase Turkish. Below the number: 'DEMO ÜCRETSİZ · KURULUM 48 SAAT' in white uppercase. Yellow circular badge in corner 'DR AI FUTBOL · 2026'. Bottom strip 'www.draifutbol.com'. Subtle film grain, retro-modern hybrid, premium poster aesthetic, 8k.",
            "story":     "Vertical 9:16 ultra-bold typography poster: massive yellow '48' number stacked vertically center of frame, 'SAAT' below it, then 'KURULUM' uppercase white. Background: pure black with faint yellow grid lines. Top: 'DEMO TALEP ET, 48 SAAT İÇİNDE PANELİN HAZIR'. Bottom CTA mock pill: 'www.draifutbol.com'. 'DR AI FUTBOL' top-left brand. Editorial graphic design poster, 8k.",
            "landscape": "Horizontal 16:9 cinematic banner: vibrant yellow #f5dc4c '48 SAAT' headline filling 70% of canvas in bold uppercase across the center. Background: dramatic dark navy with subtle Turkish football crest watermark faintly visible (fictional 'ÖZERSPOR'). Below the number: 'PANELİNİZ + WEB SİTENİZ HAZIR — ÜCRETSİZ DEMO'. Bottom-right pill CTA 'www.draifutbol.com'. 'DR AI FUTBOL' top-left small wordmark. Posterized editorial, 8k.",
        },
        "caption_brief": "Strong call to action. Mention: 48 saat içinde kurulum, ücretsiz demo (15 dakika ekran paylaşımı), tüm modüller dahil (panel + kurumsal web sitesi). 30 günlük iade garantisi. Acil ton, FOMO. End with multiple CTAs: web → draifutbol.com, WhatsApp link, demo formu.",
    },
]

CONCEPTS_BY_ID: Dict[str, Dict[str, Any]] = {c["id"]: c for c in CONCEPTS}

# Map our size keys to gpt-image-2 aspect ratios and dimensions
SIZE_TO_AR: Dict[str, str] = {
    "feed":      "1:1",     # 1024x1024
    "story":     "9:16",    # 1024x1536
    "landscape": "16:9",    # 1536x1024
}
SIZE_PIXELS: Dict[str, str] = {
    "feed": "1024x1024",
    "story": "1024x1536",
    "landscape": "1536x1024",
}
ALL_SIZES = ("feed", "story", "landscape")


# ─────────────────────────── Caption (DR AI Engine) ───────────────────────────

CAPTION_SYSTEM_PROMPT = """Sen DR AI FUTBOL markasının pazarlama metin yazarısın. Türkiye'deki futbol kulübü başkan/yöneticilerine satış yapacak Instagram caption metinleri yazıyorsun.

KURALLAR (KESİN):
1. 4 paragraflık akıcı Türkçe metin yaz. Her paragraf 2-3 kısa cümle.
2. İlk satır 'hook' — okuyucuyu durdurmalı. Soru, çarpıcı rakam, ya da meydan okuma.
3. Asla 'GPT', 'ChatGPT', 'OpenAI', 'Anthropic' kelimelerini kullanma. Sistemden bahsedeceksen 'DR AI Engine' veya 'DR AI FUTBOL altyapısı' de.
4. Markayı 'DR AI FUTBOL' olarak ana metinde 1 kez geçir.
5. Emoji DENGELI kullan (her paragrafta 0-2 tane, abartma). Profesyonel ton.
6. Son paragraftan 1 önce CTA cümlesi: 'Detaylı bilgi ve canlı demo: www.draifutbol.com'
7. EN SON SATIRDA: 15 adet hashtag boşlukla ayrılmış. Hepsi küçük harf, Türkçe karakter yok. Örnek setten seç: #drai̇futbol → #draifutbol #yapayzeka #futbol #amatorfutbol #kulupyonetimi #futbolteknoloji #dijitalkulup #fkulubu #mackolik #sosyalmedya #futbolanaliz #futbolkulubu #futbolyonetimi #spormarketing #sporyazilim
8. Caption maksimum 2000 karakter (Instagram limiti).
9. Ürün dilini ezberlenebilir, paylaşılabilir, somut yap: 'Defter tutmak yok, AI yazıyor', 'Cuma kararı, Cumartesi kupa', 'Sponsor parası avucunda', vb.

ÇIKTI: Sadece metni döndür. Markdown, başlık, ekstra açıklama YOK."""


def caption_user_prompt(concept: Dict[str, Any]) -> str:
    return f"""Pazarlama görseli konsepti: "{concept['title']}"
Hook (örnek slogan): "{concept['hook']}"
Vurgulanması istenenler: {concept['caption_brief']}

Lütfen yukarıdaki kurallara birebir uyarak Instagram caption'ını yaz."""
