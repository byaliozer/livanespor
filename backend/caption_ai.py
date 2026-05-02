"""
Instagram caption + 5 hashtag generator for Livanespor SaaS media outputs.

Port of DR AI Futbol's caption_ai.py — adapted to English-named DB fields.
- Uses EMERGENT_LLM_KEY → gpt-5.2 chat (Emergent integrations).
- Returns Turkish caption (2-6 lines, samimi tone, 1-3 emoji) + 5 deterministic hashtags.
- Hashtags pool: club_short_name + city + league + content_type_tag + generic.
"""
from __future__ import annotations
import json
import logging
import os
import re
import unicodedata
import uuid
from typing import Optional, Dict, Any

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("livanespor.caption")

GENERIC_FOOTBALL_TAGS = ["amatorfutbol", "futbol", "amatorlig", "tribun", "saha"]

CONTENT_TYPE_TAGS = {
    "match_week":   ["macihaftasi", "yenibirhafta", "macgunu"],
    "match_day":    ["macgunu", "tribunehazır", "lansaga"],
    "lineup":       ["ilk11", "kadro", "saha"],
    "full_time":    ["macsonu", "skor", "puan"],
    "motm":         ["macinadami", "motm", "yildiz"],
    "birthday":     ["dogumgunu", "kutluolsun", "iyiyaslara"],
    "special_day":  ["ozelgun", "kutluolsun", "kulup"],
    "new_transfer": ["transfer", "hosgeldin", "yeniyuz"],
    "fan_invite":   ["taraftar", "tribun", "macgunu"],
}


def _slugify_lower(text: str) -> str:
    if not text: return ""
    repl = {"ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
            "ü": "u", "Ü": "u", "ç": "c", "Ç": "c", "ö": "o", "Ö": "o"}
    for k, v in repl.items(): text = text.replace(k, v)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "", text)
    return text.lower()


def _build_hashtag_pool(site: dict, content_type: str) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()

    def add(raw: str):
        s = _slugify_lower(raw or "")
        if s and s not in seen:
            tags.append(s); seen.add(s)

    # Stable 5-tag pool
    add(site.get("short_name") or site.get("site_title") or "kulup")
    if site.get("city"):
        add(site["city"])
    add(site.get("league_name") or "amatorfutbol")
    for ct_tag in CONTENT_TYPE_TAGS.get(content_type, []):
        add(ct_tag)
        if len(tags) >= 4: break
    for gt in GENERIC_FOOTBALL_TAGS:
        if len(tags) >= 5: break
        add(gt)
    return tags[:5]


def _result_tone(template_key: str, ctx: dict, club_name: str) -> Optional[str]:
    if template_key != "full_time": return None
    h, a = ctx.get("home_score"), ctx.get("away_score")
    if h is None or a is None: return None
    home_is_us = (club_name or "").lower() in (ctx.get("home_name") or "").lower()
    if h == a:
        return "BERABERLİK — saygılı, ileriye bakış. 'Değerli bir puan' tonu."
    we_won = (home_is_us and h > a) or (not home_is_us and a > h)
    if we_won:
        return "GALİBİYET — coşkulu ama abartısız. Üç puan vurgusu, taraftara teşekkür."
    return ("MAĞLUBİYET — olgun, kötümser değil, tribüne teşekkür ve hedef "
            "odaklı. ASLA 'üzgünüz' / 'kayıp' / 'mağlubiyet' kelimeleri geçmesin; "
            "'Daha iyi yarınlar', 'tekrar sahalara' gibi pozitif ton.")


SYSTEM_PROMPT = """Sen bir Türkiye futbol kulübünün sosyal medya editörüsün.
Görevin: verilen bilgilerden Instagram için tek bir post caption'ı yazmak.

KURALLAR:
1. Türkçe, samimi ama profesyonel ton. Klişeden kaçın
   ("zafer için savaşacağız", "kazanmak boynumuzun borcu" gibi yasak).
2. Uzunluk: tarih/skor gibi bilgi varsa 4-6 satır, kısa duygu içerikse 2-3 satır.
   Asla 6 satırı geçme.
3. 1-3 emoji kullan (futbol/spor temalı: ⚽🔥💪🏆🎯🏟️🟡⚫).
4. Kulüp ve rakip adlarını AYNEN, Türkçe karakterlerle yaz.
5. Maç bilgileri (tarih/saat/stadyum) varsa doğal akışta geçsin.
6. Sonunda 1 cümlelik çağrı: "tribünlere bekliyoruz", "destek olun" gibi.
7. CAPTION'da HASHTAG yazma — onlar JSON'un ayrı alanında dönecek.
8. Çıktı SADECE JSON. Açıklama yapma, kod bloğu kullanma."""

USER_TEMPLATE = """KULÜP: {club_name}
İÇERİK TİPİ: {content_type}
{tone_block}VERİLER:
{data_block}

Yukarıdaki bilgilerle bir Instagram caption üret. Çıktı format:
{{"caption": "..."}}"""


async def _llm_call(system: str, user: str) -> str:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")
    chat = LlmChat(
        api_key=api_key,
        session_id=f"caption-{uuid.uuid4().hex[:8]}",
        system_message=system,
    ).with_model("openai", "gpt-5.2")
    resp = await chat.send_message(UserMessage(text=user))
    return str(resp).strip()


def _parse_caption(raw: str) -> str:
    txt = raw.strip()
    if txt.startswith("```"):
        txt = re.sub(r"^```(?:json)?\s*|\s*```\s*$", "", txt, flags=re.MULTILINE).strip()
    try:
        obj = json.loads(txt)
        if isinstance(obj, dict) and obj.get("caption"):
            return str(obj["caption"]).strip()
    except json.JSONDecodeError:
        pass
    m = re.search(r'"caption"\s*:\s*"([^"]+)"', txt)
    if m: return m.group(1).strip()
    return txt[:600]


async def generate_social_caption(
    *, template_key: str, ctx: Dict[str, Any], site_settings: Dict[str, Any]
) -> Optional[dict]:
    try:
        club_name = site_settings.get("site_title") or site_settings.get("short_name") or "Kulübümüz"
        tone = _result_tone(template_key, ctx, club_name)
        tone_block = f"SONUÇ TONU: {tone}\n" if tone else ""

        labels = {
            "home_name": "Ev sahibi",
            "away_name": "Deplasman",
            "date_str": "Tarih",
            "time_str": "Saat",
            "stadium": "Stadyum",
            "league_display": "Lig",
            "home_score": "Ev sahibi skoru",
            "away_score": "Deplasman skoru",
            "title": "Başlık",
            "body_text": "Metin",
            "match_text": "Maç",
            "message": "Mesaj",
            "from_club": "Önceki kulüp",
            "extra_text": "Ekstra metin",
        }
        data_lines = []
        for key, label in labels.items():
            v = ctx.get(key)
            if v not in (None, "", 0): data_lines.append(f"- {label}: {v}")
        # Player info (motm, birthday, new_transfer)
        player = ctx.get("player") or ctx.get("person") or {}
        if isinstance(player, dict) and player.get("name"):
            data_lines.append(f"- Oyuncu: {player['name']}"
                              f"{' #' + str(player['jersey_number']) if player.get('jersey_number') else ''}"
                              f"{' (' + player['position'] + ')' if player.get('position') else ''}")
        if not data_lines:
            data_lines.append("- Genel kulüp paylaşımı")

        user_msg = USER_TEMPLATE.format(
            club_name=club_name,
            content_type=template_key,
            tone_block=tone_block,
            data_block="\n".join(data_lines),
        )
        raw = await _llm_call(SYSTEM_PROMPT, user_msg)
        caption = _parse_caption(raw)
        if not caption:
            logger.warning("Caption empty")
            return None

        hashtags = [f"#{t}" for t in _build_hashtag_pool(site_settings, template_key)]
        return {
            "caption": caption,
            "hashtags": hashtags,
            "combined": f"{caption}\n\n{' '.join(hashtags)}",
        }
    except Exception as e:
        logger.exception(f"caption gen failed: {e}")
        return None
