"""
AI Media Templates for football club SaaS.

Each template defines:
  - key, name, description, default aspect_ratio, required inputs
  - build_prompt(ctx, settings) -> (prompt, title)

Adapter maps Livanespor/English field names (players.name, jersey_number, position, photo_url)
to natural-language prompt variables. DR AI Futbol used Turkish field names (ad_soyad, forma_no),
this adapter layer keeps our DB schema clean while porting the same prompt strategy.
"""
from typing import Dict, Any, List, Callable, Tuple

BRAND_GUIDE = (
    "Premium European football club social-media graphic. Cinematic lighting, "
    "bold typography, dramatic atmosphere. High contrast, sharp edges, printable "
    "at 1080p. Professional sports poster aesthetic."
)

def _club_style(settings: Dict[str, Any]) -> str:
    short = settings.get("short_name") or settings.get("site_title", "").split()[0] or "CLUB"
    primary = settings.get("primary_color") or "#f5dc4c"
    secondary = settings.get("secondary_color") or "#000000"
    return (
        f"Club identity: '{short}'. Primary color {primary} (use for accents, typography, highlights). "
        f"Secondary color {secondary} (use for base/background fills). Keep club colors consistent."
    )


def _player_desc(p: Dict[str, Any]) -> str:
    name = p.get("name", "Player")
    num = p.get("jersey_number", "—")
    pos = p.get("position", "")
    return f"{name} (#{num}{', ' + pos if pos else ''})"


# ───────────────────────── Template builders ─────────────────────────

def t_match_day(ctx: Dict[str, Any], s: Dict[str, Any]) -> Tuple[str, str]:
    home = ctx.get("home_team", "Our Club")
    away = ctx.get("away_team", "Rival")
    date = ctx.get("match_date", "Saturday")
    venue = ctx.get("venue", "Home Stadium")
    competition = ctx.get("competition", "League")
    prompt = (
        f"{BRAND_GUIDE} {_club_style(s)} "
        f"MATCH DAY announcement poster. Two team crests facing off ('{home}' vs '{away}'). "
        f"Large center text 'MATCH DAY' in bold uppercase. Below: '{home} vs {away}', "
        f"date '{date}', venue '{venue}', competition '{competition}'. "
        "Stadium lights, dramatic sky, electric atmosphere. Fans silhouette at bottom."
    )
    return prompt, f"Maç Günü — {home} vs {away}"


def t_starting_xi(ctx: Dict[str, Any], s: Dict[str, Any]) -> Tuple[str, str]:
    players: List[Dict[str, Any]] = ctx.get("players", [])[:11]
    formation = ctx.get("formation", "4-3-3")
    opponent = ctx.get("opponent", "rival")
    names = "\n".join([f"  {p.get('jersey_number','—')} — {p.get('name','?')} ({p.get('position','')})" for p in players])
    prompt = (
        f"{BRAND_GUIDE} {_club_style(s)} "
        f"STARTING ELEVEN graphic for match vs '{opponent}'. Formation: {formation}. "
        f"Football pitch viewed top-down with player name plates positioned tactically. "
        "Bold title 'İLK 11 / STARTING XI'. Club crest top-left. "
        f"Player list:\n{names}\n"
        "Stylish geometric overlay, football field lines visible."
    )
    return prompt, f"İlk 11 vs {opponent}"


def t_match_result(ctx: Dict[str, Any], s: Dict[str, Any]) -> Tuple[str, str]:
    home = ctx.get("home_team", "Home")
    away = ctx.get("away_team", "Away")
    hs = ctx.get("home_score", 0)
    as_ = ctx.get("away_score", 0)
    scorers: List[str] = ctx.get("scorers", [])
    scorers_txt = ", ".join(scorers) if scorers else "—"
    prompt = (
        f"{BRAND_GUIDE} {_club_style(s)} "
        f"FINAL SCORE poster. Large score '{hs} - {as_}' in dominant typography. "
        f"'{home}' vs '{away}' labels. Top banner 'FULL TIME / MAÇ SONU'. "
        f"Scorers credit at bottom: '{scorers_txt}'. "
        "Stadium crowd blurred in background, spotlights on score."
    )
    return prompt, f"Maç Sonu — {home} {hs}-{as_} {away}"


def t_goal(ctx: Dict[str, Any], s: Dict[str, Any]) -> Tuple[str, str]:
    player = ctx.get("player", {})
    minute = ctx.get("minute", "'?")
    opponent = ctx.get("opponent", "")
    desc = _player_desc(player)
    prompt = (
        f"{BRAND_GUIDE} {_club_style(s)} "
        f"GOAL CELEBRATION poster. Explosive text 'GOOOAL!' top center. "
        f"Player: {desc}. Minute: {minute}'{' vs ' + opponent if opponent else ''}. "
        "Dynamic motion blur, confetti or fireworks particles, crowd roar feel. "
        "Player silhouette with arms raised if no photo provided."
    )
    return prompt, f"Gol — {player.get('name','?')} {minute}'"


def t_birthday(ctx: Dict[str, Any], s: Dict[str, Any]) -> Tuple[str, str]:
    player = ctx.get("player", {})
    age = ctx.get("turning_age") or ctx.get("age") or ""
    desc = _player_desc(player)
    prompt = (
        f"{BRAND_GUIDE} {_club_style(s)} "
        f"BIRTHDAY CELEBRATION card for football player {desc}. "
        f"Large text 'DOĞUM GÜNÜN KUTLU OLSUN' / 'HAPPY BIRTHDAY'. "
        f"Age badge: '{age}'. Balloons, confetti, cake icons in club colors. "
        "Warm, celebratory, team-family atmosphere. Jersey number prominent."
    )
    return prompt, f"Doğum Günü — {player.get('name','?')}"


def t_new_transfer(ctx: Dict[str, Any], s: Dict[str, Any]) -> Tuple[str, str]:
    player = ctx.get("player", {})
    from_club = ctx.get("from_club", "")
    prompt = (
        f"{BRAND_GUIDE} {_club_style(s)} "
        f"NEW SIGNING announcement. Huge text 'HOŞGELDİN / WELCOME'. "
        f"Player name: {player.get('name','?')}. Jersey: #{player.get('jersey_number','—')}. "
        f"Position: {player.get('position','')}. "
        f"{'Previous club: ' + from_club + '. ' if from_club else ''}"
        "Dramatic portrait-style layout, jersey reveal, spotlight beams. "
        "Signature scribble at bottom."
    )
    return prompt, f"Yeni Transfer — {player.get('name','?')}"


def t_player_of_week(ctx: Dict[str, Any], s: Dict[str, Any]) -> Tuple[str, str]:
    player = ctx.get("player", {})
    stats = ctx.get("stats", {})
    stats_txt = " · ".join([f"{k.upper()}: {v}" for k, v in stats.items()]) or "—"
    desc = _player_desc(player)
    prompt = (
        f"{BRAND_GUIDE} {_club_style(s)} "
        f"PLAYER OF THE WEEK / HAFTANIN OYUNCUSU. MVP trophy icon. "
        f"Player: {desc}. "
        f"Stats line: {stats_txt}. "
        "Star burst behind player, golden confetti, prestige medal design, "
        "bold serif typography for 'MVP'."
    )
    return prompt, f"Haftanın Oyuncusu — {player.get('name','?')}"


def t_fan_invite(ctx: Dict[str, Any], s: Dict[str, Any]) -> Tuple[str, str]:
    match_text = ctx.get("match_text", "Next match")
    message = ctx.get("message", "Tribünlere bekliyoruz! / See you at the stadium!")
    prompt = (
        f"{BRAND_GUIDE} {_club_style(s)} "
        f"FAN INVITATION poster. Large inviting headline. Match reference: '{match_text}'. "
        f"Supporter message: '{message}'. Packed stadium tribune scene with fans holding "
        "scarves and flags in club colors. Motivational, warm, community-driven. "
        "Hashtags placeholder at bottom."
    )
    return prompt, f"Taraftar Daveti — {match_text}"


TEMPLATES: Dict[str, Dict[str, Any]] = {
    "match_day": {
        "name": "Maç Günü",
        "description": "Yaklaşan maç duyurusu (rakip, tarih, yer).",
        "aspect_ratio": "1:1",
        "required_inputs": ["home_team", "away_team", "match_date", "venue"],
        "builder": t_match_day,
    },
    "starting_xi": {
        "name": "İlk 11",
        "description": "Kadro dizilişi ve formasyon.",
        "aspect_ratio": "9:16",
        "required_inputs": ["players", "formation", "opponent"],
        "builder": t_starting_xi,
    },
    "match_result": {
        "name": "Maç Sonucu",
        "description": "Skor ve gol atanlar.",
        "aspect_ratio": "1:1",
        "required_inputs": ["home_team", "away_team", "home_score", "away_score"],
        "builder": t_match_result,
    },
    "goal": {
        "name": "Gol Bildirimi",
        "description": "Canlı gol anı, oyuncu bilgisi.",
        "aspect_ratio": "1:1",
        "required_inputs": ["player_id", "minute"],
        "builder": t_goal,
    },
    "birthday": {
        "name": "Doğum Günü",
        "description": "Oyuncu doğum günü kutlaması.",
        "aspect_ratio": "1:1",
        "required_inputs": ["player_id"],
        "builder": t_birthday,
    },
    "new_transfer": {
        "name": "Yeni Transfer",
        "description": "Hoşgeldin kartı.",
        "aspect_ratio": "4:5",
        "required_inputs": ["player_id"],
        "builder": t_new_transfer,
    },
    "player_of_week": {
        "name": "Haftanın Oyuncusu",
        "description": "MVP kartı ve istatistikler.",
        "aspect_ratio": "1:1",
        "required_inputs": ["player_id"],
        "builder": t_player_of_week,
    },
    "fan_invite": {
        "name": "Taraftar Daveti",
        "description": "Maça davet / motivasyon posteri.",
        "aspect_ratio": "9:16",
        "required_inputs": ["match_text", "message"],
        "builder": t_fan_invite,
    },
}


def build_prompt(template_key: str, ctx: Dict[str, Any], site_settings: Dict[str, Any]) -> Tuple[str, str]:
    tpl = TEMPLATES.get(template_key)
    if not tpl:
        raise ValueError(f"Unknown template: {template_key}")
    builder: Callable = tpl["builder"]
    return builder(ctx, site_settings or {})


def list_templates() -> List[Dict[str, Any]]:
    return [
        {
            "key": k,
            "name": v["name"],
            "description": v["description"],
            "aspect_ratio": v["aspect_ratio"],
            "required_inputs": v["required_inputs"],
        } for k, v in TEMPLATES.items()
    ]
