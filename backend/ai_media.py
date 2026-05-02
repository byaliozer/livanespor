"""
AI Media Prompt Engine — port of DR AI Futbol's ai_image.py, adapted to
Livanespor's English field names.

Design DNA: every club gets a deterministic hash-based identity across
(layout × scene × typography × drama). User can override via "Özelleştir".

Templates (in user-prioritized order):
  1. match_week     — Maç Haftası
  2. match_day      — Maç Günü
  3. lineup         — İlk 11
  4. full_time      — Maç Sonucu (+gol atanlar paneli)
  5. motm           — Maçın Adamı
  6. birthday       — Doğum Günü
  7. special_day    — Özel Gün (bayram / 23 Nisan / kuruluş yıldönümü)
  8. new_transfer   — Yeni Transfer         (kept from earlier phase)
  9. fan_invite     — Taraftar Daveti       (kept from earlier phase)
"""
from __future__ import annotations
import hashlib
from typing import Dict, Any, List, Optional, Callable, Tuple

# ───────────────────────── DESIGN DNA CATALOG ─────────────────────────
LAYOUT_RECIPES = {
    "center_vs": (
        "CLASSIC CENTER-VS LAYOUT — heading large at TOP CENTER. Both crests at the "
        "MIDDLE facing each other with a glowing metallic 'VS' between them. Team names "
        "directly under each crest. Info panel (date/time/stadium) horizontal strip at "
        "BOTTOM. Vertically symmetric, balanced."
    ),
    "asymmetric": (
        "ASYMMETRIC SPLIT LAYOUT — vertical split into two unequal halves. LEFT 60% "
        "dominated by HOME crest large + oversized home team name. RIGHT 40% holds AWAY "
        "crest smaller and slightly desaturated. Heading TOP-LEFT at slight diagonal. "
        "Info panel in BOTTOM-RIGHT corner only."
    ),
    "diagonal": (
        "DIAGONAL SLASH LAYOUT — canvas split by DIAGONAL CUT upper-right to lower-left. "
        "HOME crest UPPER-LEFT triangle, AWAY crest LOWER-RIGHT triangle. CENTER straddles "
        "the diagonal with a HUGE numeric date as dominant focal element. Heading small at top."
    ),
    "editorial": (
        "EDITORIAL TOP-HEAVY LAYOUT — heading + league + date stacked as 3 lines in TOP HALF "
        "(Vogue / Sports Illustrated magazine cover style). Crests SMALL, CENTERED side-by-side "
        "at vertical midpoint (no large VS — just close with subtle dot). BOTTOM HALF filled with "
        "atmospheric scene. Info text thin single-line strip at very bottom."
    ),
    "stadium_pov": (
        "STADIUM POV LAYOUT — viewer standing on pitch looking up. Lower 60% pitch grass with "
        "perspective lines toward goal. Crests as suspended HOLOGRAPHIC PROJECTIONS floating above "
        "pitch with subtle glow. Heading at very top thin strip. Info mini-panel BOTTOM-RIGHT corner."
    ),
}

SCENE_DESCRIPTIONS = {
    "floodlight": "Dark night stadium with volumetric floodlights cutting through soft smoke, deep shadows, editorial sports magazine cover quality, high sharpness.",
    "daylight":   "Golden-hour pre-match daylight, lens flare, warm amber and teal tones, anticipatory atmosphere, soft sunlight streaming across the pitch.",
    "crowd":      "Crowded stadium silhouettes — backlit fans with raised scarves and flares, atmospheric haze, cinematic crowd energy framing the composition.",
    "low_angle":  "Dramatic low-angle from pitch surface — dew-glistening grass blades in foreground, shallow depth of field, blurred stands behind, hyper-real action vibe.",
    "abstract":   "Abstract modern sports illustration — geometric color planes in club colors, halftone dots, no photographic background, flat editorial illustration aesthetic.",
    "city":       "City skyline silhouette in the background (generic Anatolian skyline with mosque domes and minarets), warm city lights, atmospheric depth, urban sports identity.",
    "studio":     "Studio jet-black backdrop, single dramatic spotlight per crest, glossy reflective floor, polished editorial product-shot quality with minimal scenery.",
    "vintage":    "Vintage film grain, slightly desaturated palette, retro 1970s sports photography mood with soft halation around lights, archival magazine print feel.",
}

TYPOGRAPHY_DESCRIPTIONS = {
    "athletic":  "SHARP CONDENSED ATHLETIC sans-serif (Bebas Neue / Druk Wide style) — tall narrow capitals, sportif energy, clean modern sports broadcast feel.",
    "editorial": "HEAVY EDITORIAL display sans-serif (Druk Bold / Founders Grotesk Black) — extremely thick black weights, magazine cover quality, dominant presence.",
    "heritage":  "ELEGANT DISPLAY SERIF (Cinzel / Trajan style) — classical capitals with subtle stroke contrast, prestigious heritage / traditional club feel.",
    "mono_geo":  "GEOMETRIC modern sans / wide monospaced display (TAN Pearl / FK Grotesk Mono) — clean tech-minimalist letterforms, even strokes, futuristic identity.",
}

DRAMA_LEVELS = {
    1: "DRAMA LEVEL 1 (subtle): restrained lighting, calm balanced composition, low contrast, refined editorial polish, no smoke or particles.",
    2: "DRAMA LEVEL 2 (balanced cinematic): moderate dramatic lighting, modest atmospheric particles, polished professional look — the default sports cover register.",
    3: "DRAMA LEVEL 3 (maximum cinematic): heavy volumetric lighting, abundant particles, deep shadows, magazine-cover-quality drama, epic mood, lens flares.",
}

THEME_DESC = {
    "koyu":     "very dark, moody color palette with deep blacks and subtle highlights",
    "modern":   "modern sleek look with cyan/blue neon accents and minimal typography",
    "enerjik":  "energetic high-contrast look with vivid yellow and lime accents",
    "minimal":  "minimalist composition with generous whitespace and soft tones",
    "dramatik": "highly dramatic cinematic look with heavy shadows and red accents",
}


# ───────────────────────── DNA Resolver ─────────────────────────
def _design_dna(seed: str, variation_index: int = 0) -> dict:
    h = hashlib.md5(f"{seed}:{variation_index}".encode()).hexdigest()
    layouts = list(LAYOUT_RECIPES.keys())
    scenes = list(SCENE_DESCRIPTIONS.keys())
    typographies = list(TYPOGRAPHY_DESCRIPTIONS.keys())
    return {
        "layout": layouts[int(h[0:2], 16) % len(layouts)],
        "scene": scenes[int(h[2:4], 16) % len(scenes)],
        "typography": typographies[int(h[4:6], 16) % len(typographies)],
        "drama": 2 if variation_index == 0 else ((int(h[6:8], 16) % 3) + 1),
    }


def resolve_design(
    *, club_id: str, variation_index: int = 0,
    custom_layout: Optional[str] = None, custom_typography: Optional[str] = None,
    custom_scene: Optional[str] = None, custom_drama: Optional[int] = None,
    custom_variation_diverse: bool = True,
    custom_show_city: bool = False, custom_show_year: bool = False,
    city_name: str = "", founded_year: Optional[int] = None,
) -> dict:
    base_idx = variation_index if custom_variation_diverse else 0
    dna = _design_dna(club_id or "default", base_idx)

    def _resolve(user_val: Optional[str], dna_val: str, catalog: dict) -> str:
        if not user_val or user_val in ("auto", "akilli", ""):
            return dna_val
        return user_val if user_val in catalog else dna_val

    layout = _resolve(custom_layout, dna["layout"], LAYOUT_RECIPES)
    scene = _resolve(custom_scene, dna["scene"], SCENE_DESCRIPTIONS)
    typography = _resolve(custom_typography, dna["typography"], TYPOGRAPHY_DESCRIPTIONS)
    drama = dna["drama"]
    try:
        if custom_drama is not None and int(custom_drama) in (1, 2, 3):
            drama = int(custom_drama)
    except (ValueError, TypeError):
        pass
    return {
        "layout_key": layout, "layout_text": LAYOUT_RECIPES[layout],
        "scene_key": scene, "scene_text": SCENE_DESCRIPTIONS[scene],
        "typography_key": typography, "typography_text": TYPOGRAPHY_DESCRIPTIONS[typography],
        "drama": drama, "drama_text": DRAMA_LEVELS[drama],
        "show_city": bool(custom_show_city) and bool(city_name),
        "show_year": bool(custom_show_year) and bool(founded_year),
        "city_name": city_name or "", "founded_year": founded_year,
    }


def _design_block(design: Optional[dict]) -> list[str]:
    if not design:
        return []
    lines = [
        "", "DESIGN DIRECTION (must follow):",
        f"• {design['layout_text']}",
        f"• Scene/atmosphere: {design['scene_text']}",
        f"• Typography: {design['typography_text']}",
        f"• {design['drama_text']}",
    ]
    if design.get("show_city") and design.get("city_name"):
        lines.append(
            f"• Subtle BRAND SIGNATURE — incorporate a faint silhouette / motif representing "
            f"the city of {design['city_name']} as a background element (do not overpower)."
        )
    if design.get("show_year") and design.get("founded_year"):
        lines.append(
            f"• Subtle HERITAGE STAMP — small mark in a corner: \"EST. {design['founded_year']}\" "
            "in muted accent color, do not overlap main content."
        )
    return lines + [""]


def _style_header(theme: str, primary: str, secondary: str, bg: str) -> list[str]:
    td = THEME_DESC.get(theme, THEME_DESC["dramatik"])
    return [
        f"Visual style: {td}. Premium sports editorial magazine cover aesthetic, "
        "sharp typography, high contrast, rich shadows.",
        f"Club colors: primary={primary}, accent={secondary}, background tone close to {bg}. "
        "Use these colors for headings, borders and accents.",
    ]


def _footer_lines(website: Optional[str], instagram: Optional[str]) -> list[str]:
    handle = f"@{instagram.lstrip('@')}" if instagram else ""
    if website and handle:
        return [
            "• FOOTER — thin accent-color divider line, then on the SAME ROW with equal padding:",
            f"  - LEFT: website url \"{website}\" in accent color (no protocol).",
            f"  - RIGHT: instagram handle \"{handle}\" in accent color, same baseline.",
        ]
    if website:
        return ["• FOOTER — thin accent-color divider line, then centered website", f"  \"{website}\" in accent color."]
    if handle:
        return ["• FOOTER — thin accent-color divider line, then centered instagram", f"  \"{handle}\" in accent color."]
    return ["• FOOTER — thin accent-color divider line only."]


def _typography_rules(no_extra_logos: bool = True) -> list[str]:
    rules = [
        "", "TYPOGRAPHY RULES:",
        "• Render ALL text using correct Turkish characters: ı İ ş Ş ğ Ğ ü Ü ç Ç ö Ö.",
        "• Spelling must be EXACT — do not abbreviate or re-letter any name.",
        "• No lorem ipsum, no placeholder text.",
    ]
    if no_extra_logos:
        rules.append("• Do not add any extra logos or brand marks beyond the given references.")
    return rules


# ───────────────────────── Template Builders ─────────────────────────
def build_match_day(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    home = ctx.get("home_name", "HOME")
    away = ctx.get("away_name", "AWAY")
    date = ctx.get("date_str", "")
    time_ = ctx.get("time_str", "")
    stadium = ctx.get("stadium", "")
    league = ctx.get("league_display", "")
    theme = ctx.get("theme", "dramatik")
    team_photo = ctx.get("team_photo_provided", False)
    primary = s.get("primary_color") or "#f5dc4c"
    secondary = s.get("secondary_color") or "#ffffff"
    bg = s.get("bg_color") or "#0b0b0b"
    website = s.get("website") or s.get("site_url")
    instagram = s.get("instagram_username") or (s.get("social") or {}).get("instagram")

    parts = ["Create a premium, cinematic 1:1 square football MATCH DAY poster.",
             *_style_header(theme, primary, secondary, bg)]
    if team_photo:
        parts.append(
            "The THIRD reference image is the OFFICIAL team squad/atmosphere photo. USE IT AS THE BACKGROUND "
            "— keep the actual players' faces, postures and uniforms clearly recognizable behind a subtle dark "
            "gradient overlay. Composite crests, headings and info panel ON TOP with cinematic dramatic lighting."
        )
    parts += _design_block(design)
    parts += [
        "LAYOUT (follow DESIGN DIRECTION above; content placement rules below):",
        "• Heading text: giant bold Turkish uppercase \"MAÇ GÜNÜ\" in primary accent color.",
    ]
    if league:
        parts.append(f"• Subtitle near heading, smaller uppercase white: \"{league}\".")
    parts += [
        "• TWO team crests according to chosen layout:",
        "  - HOME crest = FIRST reference image. Keep shape and details EXACTLY.",
        "  - AWAY crest = SECOND reference image. Keep shape and details EXACTLY.",
        f"  - Home team name exactly: \"{home.upper()}\" (uppercase, white bold).",
        f"  - Away team name exactly: \"{away.upper()}\" (uppercase, white bold).",
        "  - Crests roughly same visual size unless layout dictates otherwise.",
        "",
        "• INFO PANEL — dark rounded panel containing:",
    ]
    if date: parts.append(f"  - \"TARİH\": \"{date}\".")
    if time_: parts.append(f"  - \"SAAT\":  \"{time_}\".")
    if stadium: parts.append(f"  - \"STAT\":  \"{stadium.upper()}\".")
    parts.append("  All values must FIT inside slot with padding; NEVER overflow.")
    parts += [""]
    parts += _footer_lines(website, instagram)
    parts += _typography_rules()
    if team_photo:
        parts.append("• Preserve the real team photo faces — do NOT generate fictional players.")
    else:
        parts.append("• No players, no faces, no mascots — just crests + typography + scenery.")
    extra = ctx.get("extra_text")
    if extra: parts.append(f"\nEMPHASIS TEXT: \"{extra}\".")
    return "\n".join(parts), f"Maç Günü — {home} vs {away}"


def build_match_week(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    ctx = {**ctx, "theme": ctx.get("theme", "enerjik")}
    p, _ = build_match_day(ctx, s, design)
    p = p.replace("MATCH DAY poster", "MATCH WEEK announcement poster").replace("\"MAÇ GÜNÜ\"", "\"MAÇ HAFTASI\"")
    return p, f"Maç Haftası — {ctx.get('home_name','?')} vs {ctx.get('away_name','?')}"


def build_full_time(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    home = ctx.get("home_name", "HOME")
    away = ctx.get("away_name", "AWAY")
    hs = ctx.get("home_score", 0); as_ = ctx.get("away_score", 0)
    score_type = ctx.get("score_type", "normal")
    stadium = ctx.get("stadium", ""); date = ctx.get("date_str", ""); time_ = ctx.get("time_str", "")
    league = ctx.get("league_display", ""); theme = ctx.get("theme", "dramatik")
    show_goals = bool(ctx.get("show_goals"))
    home_goals = ctx.get("home_goals") or []; away_goals = ctx.get("away_goals") or []
    team_photo = ctx.get("team_photo_provided", False)
    primary = s.get("primary_color") or "#f5dc4c"; secondary = s.get("secondary_color") or "#ffffff"
    bg = s.get("bg_color") or "#0b0b0b"
    website = s.get("website") or s.get("site_url")
    instagram = s.get("instagram_username") or (s.get("social") or {}).get("instagram")

    pen = " (Penaltılar sonucu)" if str(score_type).lower() == "penalty" else ""
    parts = ["Create a premium cinematic 1:1 square football FULL TIME result poster.",
             *_style_header(theme, primary, secondary, bg)]
    if team_photo:
        parts.append("The THIRD reference image is the OFFICIAL team squad photo. USE IT AS THE BACKGROUND with a subtle dark overlay; composite crests, score, and panels on top.")
    parts += _design_block(design)
    parts += [
        "LAYOUT:",
        "• Heading text: giant bold Turkish uppercase \"MAÇ SONU\" in accent color.",
    ]
    if league: parts.append(f"• Subtitle: \"{league}\".")
    parts += [
        "• MIDDLE — two crests with score between:",
        "  - LEFT crest = FIRST reference image (shape preserved).",
        "  - RIGHT crest = SECOND reference image (shape preserved).",
        f"  - Score between crests, giant bold: \"{hs}  -  {as_}\" in accent color.",
        f"  - Under left crest, uppercase white: \"{home.upper()}\".",
        f"  - Under right crest, uppercase white: \"{away.upper()}\".",
    ]
    if pen: parts.append(f"• Small line under score: \"{pen.strip()}\".")

    def _fmt(goals):
        out = []
        for g in goals or []:
            n = (g or {}).get("player_name") or ""
            m = (g or {}).get("minute")
            if not n: continue
            out.append(f"{n.upper()} {int(m)}'" if m not in (None, "", 0) else n.upper())
        return out
    hgl = _fmt(home_goals) if show_goals else []
    agl = _fmt(away_goals) if show_goals else []
    has_goals = bool(hgl or agl)
    if has_goals:
        parts += [
            "• GOL ATANLAR PANEL — semi-transparent dark rounded rectangle, two columns:",
            "  - Title centered: \"GOLLERİ ATANLAR\" (uppercase, accent color).",
            f"  - LEFT header: \"{home.upper()}\", lines: " + (" | ".join(f'"{g}"' for g in hgl) if hgl else '"—"') + ".",
            f"  - RIGHT header: \"{away.upper()}\", lines: " + (" | ".join(f'"{g}"' for g in agl) if agl else '"—"') + ".",
        ]
    parts.append("• BOTTOM INFO PANEL — three columns:")
    if date: parts.append(f"  - \"TARİH\": \"{date}\".")
    if time_: parts.append(f"  - \"SAAT\":  \"{time_}\".")
    if stadium: parts.append(f"  - \"STAT\":  \"{stadium.upper()}\".")
    parts += _footer_lines(website, instagram)
    parts += _typography_rules()
    parts += [
        "", "STRICT NEGATIVE RULES:",
        "• NO yellow/red cards, NO referee whistles, NO possession bars, NO statistics or heatmaps.",
        "• NO MVP badges unless requested. NO invented dates/stadium/time.",
    ]
    if not has_goals:
        parts.append("• NO scorer names, NO 'goals scored by' panel — render ONLY the score itself.")
    extra = ctx.get("extra_text")
    if extra: parts.append(f"\nEMPHASIS TEXT: \"{extra}\".")
    return "\n".join(parts), f"Maç Sonu — {home} {hs}-{as_} {away}"


def build_lineup(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    formation = ctx.get("formation", "4-3-3")
    players: List[Dict[str, Any]] = ctx.get("players", [])[:11]
    coach = ctx.get("coach", "")
    home = ctx.get("home_name", ""); away = ctx.get("away_name", "")
    theme = ctx.get("theme", "enerjik")
    primary = s.get("primary_color") or "#f5dc4c"; secondary = s.get("secondary_color") or "#ffffff"
    bg = s.get("bg_color") or "#0b0b0b"
    website = s.get("website") or s.get("site_url")
    instagram = s.get("instagram_username") or (s.get("social") or {}).get("instagram")

    parts = ["Create a premium 1:1 square STARTING XI tactics board poster.",
             *_style_header(theme, primary, secondary, bg),
             "Football pitch viewed top-down, clean turf lines, subtle stadium bokeh around edges."]
    parts += _design_block(design)
    parts += [
        "LAYOUT:",
        "• TOP CENTER — giant bold Turkish heading: \"İLK 11\" in accent color.",
    ]
    if home and away:
        parts.append(f"• Subtitle: \"{home.upper()} vs {away.upper()}\".")
    parts += [
        f"• Formation badge: \"{formation}\" in small accent pill.",
        "",
        "• MIDDLE — vertical pitch graphic. 11 player slots per formation lines (GK top, defence below, midfield, forwards).",
        "",
        "  PLAYER SLOTS (render EXACTLY; do NOT invent):",
    ]
    for i, p in enumerate(players, start=1):
        num = p.get("jersey_number")
        num_str = f"#{num}" if num not in (None, "", "None") else "#—"
        name = (p.get("name") or "").strip()
        parts.append(f"    - Slot {i}: {num_str} {name.upper()}")
    parts += [
        "",
        "  Each slot: small circular jersey with number (accent color) + surname below in white uppercase. Text small enough to NEVER overlap adjacent slots.",
    ]
    if coach:
        parts.append(f"\n• BELOW PITCH — \"TEKNİK DİREKTÖR: {coach.upper()}\" in accent color.")
    parts += _footer_lines(website, instagram)
    parts += _typography_rules()
    parts.append("• Do not draw real faces — only jersey/number tokens per slot.")
    return "\n".join(parts), f"İlk 11 — {formation}"


def build_motm(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    player = ctx.get("player") or {}
    name = player.get("name", "Oyuncu")
    number = str(player.get("jersey_number", "") or "")
    position = player.get("position", "")
    subtitle = ctx.get("subtitle")
    match_context = ctx.get("match_context")
    theme = ctx.get("theme", "dramatik")
    primary = s.get("primary_color") or "#f5dc4c"; secondary = s.get("secondary_color") or "#ffffff"
    bg = s.get("bg_color") or "#0b0b0b"
    website = s.get("website") or s.get("site_url")
    instagram = s.get("instagram_username") or (s.get("social") or {}).get("instagram")

    parts = [
        "Create a premium cinematic 1:1 MAN OF THE MATCH hero portrait poster.",
        *_style_header(theme, primary, secondary, bg),
        "Dramatic stadium atmosphere behind subject: volumetric floodlight rays, smoke, bokeh.",
    ]
    parts += _design_block(design)
    parts += [
        "", "COMPOSITION:",
        "• FIRST reference image = PLAYER PORTRAIT. Hero subject:",
        "  cut out / backlit against dramatic stadium backdrop, positioned LEFT 60% of canvas.",
        "  Subtle rim light in accent color around silhouette. Preserve face EXACTLY.",
        "",
        "• RIGHT 40% — dark vertical panel:",
        "  - Small uppercase badge: \"MAÇIN ADAMI\" in accent color.",
    ]
    if subtitle: parts.append(f"  - Small white line above name: \"{subtitle}\".")
    parts.append(f"  - HUGE bold uppercase player name (up to 2 lines): \"{name.upper()}\" in white.")
    if number:
        parts.append(f"  - Giant translucent jersey \"{number}\" behind name (low-opacity accent watermark).")
    if position:
        parts.append(f"  - Below name, smaller accent-color: \"{position.upper()}\".")
    if match_context:
        parts.append(f"  - Bottom of panel: \"{match_context}\" (small white).")
    parts += _footer_lines(website, instagram)
    parts += _typography_rules(no_extra_logos=False)
    parts.append("• Only ONE person in poster — no crowd faces, no other players.")
    return "\n".join(parts), f"Maçın Adamı — {name}"


def build_birthday(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    person = ctx.get("person") or ctx.get("player") or {}
    name = person.get("name", "Oyuncu")
    number = str(person.get("jersey_number", "") or "")
    role = person.get("position") or person.get("role_title") or ""
    age = ctx.get("turning_age") or ctx.get("age")
    wish = ctx.get("wish_message")
    birth_dm = ctx.get("birth_day_month")
    theme = ctx.get("theme", "enerjik")
    primary = s.get("primary_color") or "#f5dc4c"; secondary = s.get("secondary_color") or "#ffffff"
    bg = s.get("bg_color") or "#0b0b0b"
    website = s.get("website") or s.get("site_url")
    instagram = s.get("instagram_username") or (s.get("social") or {}).get("instagram")

    parts = [
        "Create a premium cinematic 1:1 square BIRTHDAY greeting poster for a football club.",
        *_style_header(theme, primary, secondary, bg),
        "Festive yet classy: subtle confetti particles, soft bokeh lights, warm rim light. Stadium lighting background, not overwhelming.",
    ]
    parts += _design_block(design)
    parts += [
        "", "COMPOSITION:",
        "• FIRST reference image = PERSON PORTRAIT. Hero subject LEFT 55%, cut out / backlit against festive backdrop. Preserve face EXACTLY.",
        "",
        "• RIGHT 45% — dark vertical panel:",
        "  - Top small uppercase badge: \"DOĞUM GÜNÜN KUTLU OLSUN\" in accent color.",
        f"  - HUGE bold uppercase name (up to 2 lines): \"{name.upper()}\" in white.",
    ]
    bits = []
    if number: bits.append(f"#{number}")
    if role: bits.append(role.upper())
    if bits: parts.append(f"  - Below name, smaller accent: \"{' • '.join(bits)}\".")
    if birth_dm: parts.append(f"  - Date badge: \"{birth_dm}\" in accent-color pill.")
    if age:
        parts.append(f"  - Giant translucent \"{age}\" behind name as watermark (low opacity, accent color).")
    if wish:
        parts.append(f"  - Italic white blockquote below: \"{wish}\" (max 3 lines).")
    parts += _footer_lines(website, instagram)
    parts += _typography_rules(no_extra_logos=False)
    parts.append("• Only ONE person — no crowd, no other faces.")
    return "\n".join(parts), f"Doğum Günü — {name}"


def build_special_day(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    """Resmi/dini bayramlar, 23 Nisan, kuruluş yıldönümü, vs."""
    title = ctx.get("title", "ÖZEL GÜN")
    body_text = ctx.get("body_text", "")
    occasion_hint = ctx.get("occasion_hint", "")  # "kurban bayrami", "23 nisan" gibi
    theme = ctx.get("theme", "dramatik")
    primary = s.get("primary_color") or "#f5dc4c"; secondary = s.get("secondary_color") or "#ffffff"
    bg = s.get("bg_color") or "#0b0b0b"
    website = s.get("website") or s.get("site_url")
    instagram = s.get("instagram_username") or (s.get("social") or {}).get("instagram")

    parts = [
        "Create a premium 1:1 square SPECIAL DAY / HOLIDAY football club poster.",
        *_style_header(theme, primary, secondary, bg),
        "Respectful, warm, ceremonial atmosphere befitting a national or religious occasion.",
    ]
    if occasion_hint:
        parts.append(f"Occasion context (adapt scenery subtly): \"{occasion_hint}\". Do NOT include explicit religious symbols unless culturally appropriate for the occasion.")
    parts += _design_block(design)
    parts += [
        "",
        "CONTENT:",
        f"• TOP CENTER — giant bold Turkish uppercase heading: \"{title.upper()}\" in accent color. Break into two lines if long.",
    ]
    if body_text:
        parts.append(f"• Below heading — 2-3 lines max, clean white: \"{body_text}\".")
    parts += _footer_lines(website, instagram)
    parts += _typography_rules(no_extra_logos=False)
    parts.append("• Editorial magazine layout, not an Instagram template. No players, no match data.")
    return "\n".join(parts), f"Özel Gün — {title}"


def build_new_transfer(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    player = ctx.get("player") or {}
    name = player.get("name", "")
    number = str(player.get("jersey_number", "") or "")
    position = player.get("position", "")
    from_club = ctx.get("from_club", "")
    theme = ctx.get("theme", "enerjik")
    primary = s.get("primary_color") or "#f5dc4c"; secondary = s.get("secondary_color") or "#ffffff"
    bg = s.get("bg_color") or "#0b0b0b"
    website = s.get("website") or s.get("site_url")
    instagram = s.get("instagram_username") or (s.get("social") or {}).get("instagram")

    parts = [
        "Create a premium 1:1 square NEW SIGNING announcement football poster.",
        *_style_header(theme, primary, secondary, bg),
    ]
    parts += _design_block(design)
    parts += [
        "", "COMPOSITION:",
        "• FIRST reference image = player portrait (if present); cut out against dramatic backdrop.",
        "• Large uppercase text: \"HOŞGELDİN / WELCOME\" in accent color.",
        f"• Player name: \"{name.upper()}\" (large, white).",
    ]
    if number: parts.append(f"• Jersey: \"#{number}\" prominent.")
    if position: parts.append(f"• Position: \"{position.upper()}\".")
    if from_club: parts.append(f"• \"Önceki kulüp: {from_club.upper()}\" (small).")
    parts += _footer_lines(website, instagram)
    parts += _typography_rules(no_extra_logos=False)
    return "\n".join(parts), f"Yeni Transfer — {name or '?'}"


def build_fan_invite(ctx: dict, s: dict, design: Optional[dict] = None) -> Tuple[str, str]:
    match_text = ctx.get("match_text", "")
    message = ctx.get("message", "")
    theme = ctx.get("theme", "enerjik")
    primary = s.get("primary_color") or "#f5dc4c"; secondary = s.get("secondary_color") or "#ffffff"
    bg = s.get("bg_color") or "#0b0b0b"
    website = s.get("website") or s.get("site_url")
    instagram = s.get("instagram_username") or (s.get("social") or {}).get("instagram")

    parts = [
        "Create a premium 1:1 square FAN INVITATION football poster (supporter mobilization).",
        *_style_header(theme, primary, secondary, bg),
        "Packed stadium tribune scene with fans holding scarves and flares in club colors.",
    ]
    parts += _design_block(design)
    parts += [
        "", "CONTENT:",
        "• TOP CENTER — large uppercase heading: \"TRİBÜNLERE DAVETLİSİN\" in accent color.",
    ]
    if match_text: parts.append(f"• Subtitle: \"{match_text.upper()}\" (smaller white).")
    if message: parts.append(f"• Supporter message: \"{message}\" (3 lines max).")
    parts += _footer_lines(website, instagram)
    parts += _typography_rules(no_extra_logos=False)
    return "\n".join(parts), f"Taraftar Daveti — {match_text or 'Maç'}"


# ───────────────────────── Registry ─────────────────────────
TEMPLATES: Dict[str, Dict[str, Any]] = {
    "match_week":   {"name": "Maç Haftası",     "description": "Haftanın maç duyurusu.",
                     "aspect_ratio": "1:1", "required_inputs": ["home_name", "away_name"],
                     "reference_slots": ["home_crest", "away_crest", "team_photo?"],
                     "builder": build_match_week, "order": 1},
    "match_day":    {"name": "Maç Günü",        "description": "Maç günü duyuru afişi.",
                     "aspect_ratio": "1:1", "required_inputs": ["home_name", "away_name"],
                     "reference_slots": ["home_crest", "away_crest", "team_photo?"],
                     "builder": build_match_day, "order": 2},
    "lineup":       {"name": "İlk 11",          "description": "Kadro dizilişi taktik tahtası.",
                     "aspect_ratio": "1:1", "required_inputs": ["players", "formation"],
                     "reference_slots": ["club_crest?"],
                     "builder": build_lineup, "order": 3},
    "full_time":    {"name": "Maç Sonucu",      "description": "Maç sonu skor + opsiyonel gol atanlar.",
                     "aspect_ratio": "1:1", "required_inputs": ["home_name", "away_name", "home_score", "away_score"],
                     "reference_slots": ["home_crest", "away_crest", "team_photo?"],
                     "builder": build_full_time, "order": 4},
    "motm":         {"name": "Maçın Adamı",     "description": "Man of the Match hero portresi.",
                     "aspect_ratio": "1:1", "required_inputs": ["player_id"],
                     "reference_slots": ["player_photo"],
                     "builder": build_motm, "order": 5},
    "birthday":     {"name": "Doğum Günü",      "description": "Oyuncu/ekip üyesi doğum günü.",
                     "aspect_ratio": "1:1", "required_inputs": ["player_id"],
                     "reference_slots": ["player_photo"],
                     "builder": build_birthday, "order": 6},
    "special_day":  {"name": "Özel Gün",        "description": "Resmi/dini bayram, 23 Nisan, yıldönümü.",
                     "aspect_ratio": "1:1", "required_inputs": ["title"],
                     "reference_slots": [],
                     "builder": build_special_day, "order": 7},
    "new_transfer": {"name": "Yeni Transfer",   "description": "Hoşgeldin kartı.",
                     "aspect_ratio": "4:5", "required_inputs": ["player_id"],
                     "reference_slots": ["player_photo?"],
                     "builder": build_new_transfer, "order": 8},
    "fan_invite":   {"name": "Taraftar Daveti", "description": "Maça davet / motivasyon.",
                     "aspect_ratio": "9:16", "required_inputs": ["match_text"],
                     "reference_slots": [],
                     "builder": build_fan_invite, "order": 9},
}


def build_prompt(template_key: str, ctx: dict, site_settings: dict,
                 design: Optional[dict] = None) -> Tuple[str, str]:
    tpl = TEMPLATES.get(template_key)
    if not tpl:
        raise ValueError(f"Unknown template: {template_key}")
    builder: Callable = tpl["builder"]
    return builder(ctx, site_settings or {}, design)


def list_templates() -> List[Dict[str, Any]]:
    rows = [
        {"key": k, "name": v["name"], "description": v["description"],
         "aspect_ratio": v["aspect_ratio"], "required_inputs": v["required_inputs"],
         "reference_slots": v["reference_slots"], "order": v["order"]}
        for k, v in TEMPLATES.items()
    ]
    rows.sort(key=lambda x: x["order"])
    return rows
