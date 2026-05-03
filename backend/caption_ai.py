"""
Instagram caption + 5 hashtag generator for Livanespor SaaS media outputs.

v2 (2026-05-03) — REWRITTEN for factual accuracy:
- Robust club identity matching (handles "Livanespor TEST" vs "Livanespor" mismatch)
- Structured FACTS block (AI cannot misread score/winner)
- Explicit outcome dictation (win/draw/loss/pending) — AI does NOT infer
- Post-validation: banned words by outcome; regenerate once if violated
- Per-template data assembly (full_time, match_day, lineup, motm, birthday, etc.)
"""
from __future__ import annotations
import json
import logging
import os
import re
import unicodedata
import uuid
from typing import Optional, Dict, Any, Tuple, List

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("livanespor.caption")

GENERIC_FOOTBALL_TAGS = ["amatorfutbol", "futbol", "amatorlig", "tribun", "saha"]

CONTENT_TYPE_TAGS = {
    "match_week":   ["macihaftasi", "yenibirhafta", "macgunu"],
    "match_day":    ["macgunu", "tribunehazir", "lansaga"],
    "lineup":       ["ilk11", "kadro", "saha"],
    "full_time":    ["macsonu", "skor", "puan"],
    "motm":         ["macinadami", "motm", "yildiz"],
    "birthday":     ["dogumgunu", "kutluolsun", "iyiyaslara"],
    "special_day":  ["ozelgun", "kutluolsun", "kulup"],
    "new_transfer": ["transfer", "hosgeldin", "yeniyuz"],
    "fan_invite":   ["taraftar", "tribun", "macgunu"],
}

# Words the AI MUST NOT use based on match outcome.
BANNED_WORDS = {
    "loss": [
        "galibiyet", "galip", "kazandık", "kazandi", "kazanma", "3 puan", "üç puan", "uc puan",
        "zafer", "yendik", "yendi bizi asla", "muhtesem galibiyet", "harika galibiyet",
    ],
    "draw": [
        "galibiyet", "galip geldik", "kazandık", "kazandi", "3 puan", "üç puan",
        "mağlubiyet", "maglubiyet", "yenildik", "kaybetmek",
    ],
    "win": [
        "mağlubiyet", "maglubiyet", "yenildik", "kaybettik", "üzgünüz", "uzgunuz",
        "hayal kırıklığı", "hayal kirikligi",
    ],
}


def _slugify_lower(text: str) -> str:
    if not text:
        return ""
    repl = {"ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
            "ü": "u", "Ü": "u", "ç": "c", "Ç": "c", "ö": "o", "Ö": "o"}
    for k, v in repl.items():
        text = text.replace(k, v)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "", text)
    return text.lower()


def _norm(s: str) -> str:
    """Normalize for fuzzy team-name matching: lowercase, remove accents/punct."""
    if not s:
        return ""
    return _slugify_lower(s)


def _team_is_us(team_name: str, our_names: List[str]) -> bool:
    """True if team_name refers to our club, using fuzzy matching.
    our_names should include site_title, short_name, and their first words."""
    tn = _norm(team_name)
    if not tn:
        return False
    for candidate in our_names:
        cn = _norm(candidate)
        if not cn:
            continue
        if cn == tn or cn in tn or tn in cn:
            return True
    return False


def _build_our_names(site: dict) -> List[str]:
    """Build list of name variants referring to our club (most specific first)."""
    names = []
    title = (site.get("site_title") or "").strip()
    short = (site.get("short_name") or "").strip()
    if title:
        names.append(title)
        # First word of title (e.g. "Livanespor TEST" → "Livanespor")
        first = title.split()[0] if title.split() else ""
        if first and first != title:
            names.append(first)
    if short:
        names.append(short)
    return names


def _build_hashtag_pool(site: dict, content_type: str) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()

    def add(raw: str):
        s = _slugify_lower(raw or "")
        if s and s not in seen:
            tags.append(s); seen.add(s)

    add(site.get("short_name") or site.get("site_title") or "kulup")
    if site.get("city"):
        add(site["city"])
    add(site.get("league_name") or "amatorfutbol")
    for ct_tag in CONTENT_TYPE_TAGS.get(content_type, []):
        add(ct_tag)
        if len(tags) >= 4:
            break
    for gt in GENERIC_FOOTBALL_TAGS:
        if len(tags) >= 5:
            break
        add(gt)
    return tags[:5]


def _compute_match_facts(ctx: dict, site: dict) -> Optional[dict]:
    """Given ctx (may contain home_name/away_name/home_score/away_score or home_team/away_team),
    return a dict of ground truth facts OR None if no match data.

    Keys:
      - our_name, opponent_name
      - we_are_home (bool)
      - our_score, their_score (int or None if not played yet)
      - outcome: "win" | "draw" | "loss" | "pending"
      - venue_side: "home" | "away"
      - date_str, time_str, stadium, league_display (passthrough)
    """
    # Team names (ai_media templates use home_name/away_name; match lookup uses home_team/away_team)
    home = (ctx.get("home_name") or ctx.get("home_team") or "").strip()
    away = (ctx.get("away_name") or ctx.get("away_team") or "").strip()
    if not home or not away:
        return None

    our_names = _build_our_names(site)
    home_is_us = _team_is_us(home, our_names)
    away_is_us = _team_is_us(away, our_names)

    # If neither matches (e.g. data error or neutral content), still produce fallback facts
    if not home_is_us and not away_is_us:
        logger.warning(f"Could not match own club to home='{home}' or away='{away}'. Using generic facts.")
        our_name = our_names[0] if our_names else home
        opp = home if home != our_name else away
        return {
            "our_name": our_name, "opponent_name": opp,
            "home_name": home, "away_name": away,
            "we_are_home": None, "our_score": None, "their_score": None,
            "outcome": "neutral", "venue_side": None,
            "home_score": ctx.get("home_score"), "away_score": ctx.get("away_score"),
            "date_str": ctx.get("date_str"), "time_str": ctx.get("time_str"),
            "stadium": ctx.get("stadium"), "league_display": ctx.get("league_display"),
        }

    we_are_home = bool(home_is_us)
    our_name = home if we_are_home else away
    opponent_name = away if we_are_home else home

    # Scores (may be None for upcoming matches)
    hs = ctx.get("home_score")
    ascore = ctx.get("away_score")
    try:
        hs = int(hs) if hs is not None and str(hs) != "" else None
    except (TypeError, ValueError):
        hs = None
    try:
        ascore = int(ascore) if ascore is not None and str(ascore) != "" else None
    except (TypeError, ValueError):
        ascore = None

    if hs is None or ascore is None:
        outcome = "pending"
        our_score = their_score = None
    else:
        our_score = hs if we_are_home else ascore
        their_score = ascore if we_are_home else hs
        if our_score > their_score:
            outcome = "win"
        elif our_score < their_score:
            outcome = "loss"
        else:
            outcome = "draw"

    return {
        "our_name": our_name, "opponent_name": opponent_name,
        "home_name": home, "away_name": away,
        "we_are_home": we_are_home,
        "our_score": our_score, "their_score": their_score,
        "outcome": outcome,
        "venue_side": "home" if we_are_home else "away",
        "home_score": hs, "away_score": ascore,
        "date_str": ctx.get("date_str"), "time_str": ctx.get("time_str"),
        "stadium": ctx.get("stadium"), "league_display": ctx.get("league_display"),
    }


def _outcome_directive(facts: Optional[dict], template_key: str) -> str:
    """Return a strict tone/content directive based on facts + template."""
    if not facts:
        return ""
    outcome = facts.get("outcome")
    our = facts.get("our_name") or "kulübümüz"
    opp = facts.get("opponent_name") or "rakibimiz"
    os_, ts_ = facts.get("our_score"), facts.get("their_score")

    if outcome == "win":
        return (
            f"SONUÇ: GALİBİYET. {our} {os_}-{ts_} kazandı ({opp} karşısında). "
            "Coşkulu ama abartısız ton. 'Üç puan bizim', 'tribüne teşekkür' gibi doğal ifadeler. "
            "ASLA 'mağlubiyet', 'yenildik', 'kaybettik', 'üzgünüz' yazma."
        )
    if outcome == "loss":
        return (
            f"SONUÇ: MAĞLUBİYET. {our} {os_}-{ts_} yenildi ({opp} karşısında). "
            "Olgun, dik duran, ama ASLA 'galibiyet' veya 'kazandık' yazma. "
            "'Üç puan kaçtı', 'hedefe daha güçlü döneceğiz', 'tribünlerin desteği için teşekkür', "
            "'bir sonraki maça odaklanıyoruz' tonunda. Skoru belirt ama dramatize etme. "
            "KESİNLİKLE YASAK KELİMELER: 'galibiyet', 'kazandık', '3 puan Livanespor\\'un', 'zafer', 'yendik'."
        )
    if outcome == "draw":
        return (
            f"SONUÇ: BERABERLİK. {our} {os_}-{ts_} berabere kaldı ({opp} karşısında). "
            "Saygılı ton. 'Değerli bir puan', 'mücadeleci 90 dakika', 'ileriye bakıyoruz'. "
            "ASLA 'galibiyet', 'kazandık', 'mağlubiyet', 'yenildik' yazma."
        )
    if outcome == "pending":
        # Upcoming match — maç henüz oynanmadı
        side = "evinde" if facts.get("we_are_home") else "deplasmanda"
        return (
            f"DURUM: MAÇ HENÜZ OYNANMADI. {our}, {opp} ile {side} karşılaşacak. "
            "Heyecan + davet tonu. ASLA skordan veya sonuçtan bahsetme; ASLA "
            "'kazandık', 'galibiyet', 'mağlubiyet' gibi sonuç kelimeleri yazma. "
            "Taraftarı çağır, maça hazırlanış vurgusu yap."
        )
    # neutral / no match identity resolved
    return "DURUM: Genel içerik. Skor veya sonuç hakkında spekülasyon yapma."


def _build_facts_block(facts: Optional[dict], template_key: str, ctx: dict) -> str:
    """Produce the KESİN GERÇEKLER block that AI must follow literally."""
    lines: List[str] = []
    if facts:
        lines.append(f"- Bizim kulüp: {facts['our_name']}")
        if facts.get("opponent_name"):
            lines.append(f"- Rakip: {facts['opponent_name']}")
        if facts.get("we_are_home") is True:
            lines.append("- Oyun yeri: BİZİM SAHAMIZ (ev sahibi biz)")
        elif facts.get("we_are_home") is False:
            lines.append("- Oyun yeri: DEPLASMAN (rakibin sahası)")
        if facts.get("outcome") in ("win", "loss", "draw"):
            our_s, their_s = facts["our_score"], facts["their_score"]
            lines.append(f"- Skor: {facts['our_name']} {our_s} - {their_s} {facts['opponent_name']}")
            res_label = {"win": "GALİBİYET", "loss": "MAĞLUBİYET", "draw": "BERABERLİK"}[facts["outcome"]]
            lines.append(f"- Sonuç: {res_label}")
        if facts.get("date_str"):
            lines.append(f"- Tarih: {facts['date_str']}")
        if facts.get("time_str"):
            lines.append(f"- Saat: {facts['time_str']}")
        if facts.get("stadium"):
            lines.append(f"- Stadyum: {facts['stadium']}")
        if facts.get("league_display"):
            lines.append(f"- Lig: {facts['league_display']}")

    # Per-template extra fields
    if template_key in ("birthday", "motm", "new_transfer", "special_day"):
        player = ctx.get("player") or ctx.get("person") or {}
        if isinstance(player, dict) and player.get("name"):
            extra = []
            if player.get("jersey_number"):
                extra.append(f"#{player['jersey_number']}")
            if player.get("position"):
                extra.append(player["position"])
            extra_str = f" ({' '.join(extra)})" if extra else ""
            lines.append(f"- Oyuncu: {player['name']}{extra_str}")
    if template_key == "birthday" and ctx.get("age"):
        lines.append(f"- Yaş: {ctx['age']}")
    if template_key == "new_transfer" and ctx.get("from_club"):
        lines.append(f"- Önceki kulüp: {ctx['from_club']}")
    if template_key == "special_day":
        if ctx.get("title"):
            lines.append(f"- Gün başlığı: {ctx['title']}")
        if ctx.get("body_text"):
            lines.append(f"- Açıklama: {ctx['body_text']}")
        if ctx.get("message"):
            lines.append(f"- Mesaj: {ctx['message']}")
    if template_key == "fan_invite":
        if ctx.get("match_text"):
            lines.append(f"- Maç bilgisi: {ctx['match_text']}")
        if ctx.get("message"):
            lines.append(f"- Çağrı metni: {ctx['message']}")
    if template_key == "lineup":
        players = ctx.get("players") or []
        if players:
            names = ", ".join([p.get("name", "?") for p in players[:11]])
            lines.append(f"- İlk 11: {names}")
        if ctx.get("formation"):
            lines.append(f"- Diziliş: {ctx['formation']}")
    if template_key == "motm" and ctx.get("extra_text"):
        lines.append(f"- Not: {ctx['extra_text']}")

    # Fallback: if truly nothing, say so
    if not lines:
        lines.append("- Genel kulüp paylaşımı (spesifik veri yok)")
    return "\n".join(lines)


SYSTEM_PROMPT = """Sen bir Türkiye futbol kulübünün sosyal medya editörüsün.
Görevin: verilen KESİN GERÇEKLER'den Instagram için tek bir post caption'ı yazmak.

EN ÖNEMLİ KURAL: KESİN GERÇEKLER bölümündeki bilgilere HARFİYEN uy.
- Gerçeklerde yazan skoru, rakibi, sonucu AYNEN kullan.
- Sonuç "MAĞLUBİYET" ise ASLA "galibiyet", "kazandık", "3 puan bizim", "zafer" yazma.
- Sonuç "GALİBİYET" ise ASLA "mağlubiyet", "yenildik", "üzgünüz" yazma.
- Sonuç "BERABERLİK" ise ASLA "galibiyet", "kazandık", "yenildik", "mağlubiyet" yazma.
- Maç henüz oynanmadıysa ASLA skordan veya sonuçtan bahsetme.

DİĞER KURALLAR:
1. Türkçe, samimi ama profesyonel ton. Klişeden kaçın.
2. Uzunluk: 3-5 kısa satır. Asla 6 satırı geçme.
3. 1-3 emoji kullan (⚽🔥💪🏆🎯🏟️🟡⚫).
4. Kulüp ve rakip adlarını AYNEN, Türkçe karakterleriyle yaz.
5. Sonunda 1 cümlelik çağrı: "tribünlere bekliyoruz", "destek olun" gibi.
6. CAPTION'da HASHTAG yazma — ayrı alanda dönecek.
7. Çıktı SADECE JSON. Açıklama yapma, kod bloğu kullanma.

Çıktı formatı: {"caption": "..."}"""

USER_TEMPLATE = """KULÜP: {club_name}
İÇERİK TİPİ: {content_type}
{outcome_directive}

KESİN GERÇEKLER (bu bilgileri harfiyen kullan, yorum yapma):
{facts_block}

Bu gerçeklere birebir uyan, 3-5 satırlık bir Instagram caption üret.
Çıktı format: {{"caption": "..."}}"""


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
    if m:
        return m.group(1).strip()
    return txt[:600]


def _violates_outcome(caption: str, facts: Optional[dict]) -> Optional[str]:
    """Returns the banned word found if caption contradicts facts, else None."""
    if not facts or facts.get("outcome") not in ("win", "loss", "draw"):
        return None
    banned = BANNED_WORDS.get(facts["outcome"], [])
    lower = caption.lower()
    # Normalize Turkish chars to match banned list robustly
    norm = lower.translate(str.maketrans("ıİşŞğĞüÜçÇöÖ", "iisszgguucco"[:12]))
    for w in banned:
        if w in lower or w in norm:
            return w
    return None


async def generate_social_caption(
    *, template_key: str, ctx: Dict[str, Any], site_settings: Dict[str, Any]
) -> Optional[dict]:
    """Generate caption. If AI violates outcome banned words, retry once with stricter prompt."""
    try:
        club_name = site_settings.get("site_title") or site_settings.get("short_name") or "Kulübümüz"
        facts = _compute_match_facts(ctx, site_settings)
        directive = _outcome_directive(facts, template_key)
        facts_block = _build_facts_block(facts, template_key, ctx)

        user_msg = USER_TEMPLATE.format(
            club_name=club_name,
            content_type=template_key,
            outcome_directive=directive,
            facts_block=facts_block,
        )

        raw = await _llm_call(SYSTEM_PROMPT, user_msg)
        caption = _parse_caption(raw)

        # Post-validation: if AI contradicted the outcome, retry once
        bad = _violates_outcome(caption, facts)
        if bad:
            logger.warning(f"Caption violated outcome (banned word '{bad}' for outcome={facts.get('outcome')}). Retrying.")
            strict_suffix = (
                f"\n\n!!! UYARI !!! Önceki üretim '{bad}' kelimesini kullanarak sonucu yanlış yansıttı. "
                f"Gerçek sonuç: {facts.get('outcome').upper()}. Bu kez kesinlikle doğru sonucu yansıtan "
                f"(ve yasaklı kelimelerden kaçınan) bir caption üret."
            )
            raw2 = await _llm_call(SYSTEM_PROMPT, user_msg + strict_suffix)
            caption2 = _parse_caption(raw2)
            bad2 = _violates_outcome(caption2, facts)
            if not bad2:
                caption = caption2
            else:
                logger.error(f"Caption STILL violates outcome after retry ('{bad2}'). Using deterministic fallback.")
                caption = _deterministic_fallback(facts, template_key, ctx, club_name)

        if not caption:
            logger.warning("Caption empty after all attempts")
            return None

        hashtags = [f"#{t}" for t in _build_hashtag_pool(site_settings, template_key)]
        return {
            "caption": caption,
            "hashtags": hashtags,
            "combined": f"{caption}\n\n{' '.join(hashtags)}",
            "outcome": facts.get("outcome") if facts else None,
        }
    except Exception as e:
        logger.exception(f"caption gen failed: {e}")
        return None


def _deterministic_fallback(facts: Optional[dict], template_key: str, ctx: dict, club_name: str) -> str:
    """Last-resort deterministic caption when AI keeps violating. Not fancy but factually correct."""
    if not facts:
        return f"{club_name} · yeni bir gün, yeni bir mücadele. Tribünlere bekliyoruz. 💪"
    our = facts.get("our_name")
    opp = facts.get("opponent_name")
    outcome = facts.get("outcome")
    os_, ts_ = facts.get("our_score"), facts.get("their_score")
    if outcome == "win":
        return (f"{our} {os_}-{ts_} {opp}. Sahada tempo, tribünde destek. "
                f"Üç puan bizim. Yanımızda olan herkese teşekkürler. 🔥")
    if outcome == "loss":
        return (f"{our} {os_}-{ts_} {opp}. Bugün istediğimiz sonucu alamadık. "
                f"Hedefe daha güçlü döneceğiz. Tribünde bizimle olan herkese teşekkürler. 💪")
    if outcome == "draw":
        return (f"{our} {os_}-{ts_} {opp}. Mücadeleci bir 90 dakika. "
                f"Değerli bir puanla ayrılıyoruz. Destekleriniz için teşekkürler. ⚽")
    # pending / neutral
    side = "evinde" if facts.get("we_are_home") else "deplasmanda"
    return (f"{our}, {opp} ile {side} karşılaşacak. Tribünlere bekliyoruz, "
            f"birlikte kazanalım. 🏟️")
