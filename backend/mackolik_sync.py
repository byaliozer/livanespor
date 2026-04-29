"""
Mackolik scraper & sync engine.

Reads team config (team_id, team_name) from caller, fetches:
  • Standings (handles multi-group / play-off tables)
  • Fixtures (full season, finished + upcoming)
  • Squad (players w/ stats + photo)

White-label: caller passes any team_id (e.g. macko17265844851864372805 for Elbeyli Üzüm).
"""
import asyncio
import base64
import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import httpx
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE = "https://www.mackolik.com"
PHOTO_URL = "https://file.mackolikfeeds.com/people/{}"
TIMEOUT = httpx.Timeout(20.0, connect=10.0)
PHOTO_MIN_BYTES = 500  # smaller responses are placeholder

POS_MAP = {"K": "Kaleci", "D": "Defans", "O": "Orta Saha", "F": "Forvet"}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _new_id():
    return uuid4().hex[:24]


def _norm_name(s: str) -> str:
    s = (s or "").lower().strip()
    s = (s.replace("ı", "i").replace("ş", "s").replace("ç", "c")
         .replace("ğ", "g").replace("ü", "u").replace("ö", "o"))
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return " ".join(s.split())


def _slug(s: str) -> str:
    s = _norm_name(s)
    s = "".join(ch if ch.isalnum() or ch == " " else "" for ch in s)
    return "-".join(s.split())


def _to_int(v, default=0):
    if v is None:
        return default
    s = str(v).strip()
    if s in ("", "-", "—"):
        return default
    try:
        return int(s)
    except ValueError:
        return default


# ─────────────────────────── HTTP ───────────────────────────

async def _fetch_html(url: str, client: httpx.AsyncClient) -> str:
    r = await client.get(url, headers={"User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9"})
    r.raise_for_status()
    return r.text


# ─────────────────────────── Parsers ───────────────────────────

def parse_standings(html: str) -> list[dict]:
    """Returns flat list of standings rows from all tables on the page."""
    soup = BeautifulSoup(html, "lxml")
    out = []

    tables = soup.select("table")
    for table_idx, tbl in enumerate(tables):
        # Determine the group label from nearest previous <h2>/heading
        group_label = None
        for prev in tbl.find_all_previous(["h1", "h2", "h3", "h4"], limit=20):
            txt = prev.get_text(" ", strip=True) if prev else ""
            if txt and 5 < len(txt) < 200 and re.search(r"(Bursa|Grup|Play-?off|Süper Amatör)", txt, re.I):
                group_label = txt
                break
        if not group_label:
            group_label = f"Standings {table_idx + 1}"

        # Determine group_key:
        # 1) Explicit "X.Grup" wins
        # 2) Explicit "Play-Off" wins
        # 3) Otherwise, second+ table on a multi-table page is treated as Play-Off
        if re.search(r"(\d+)\.\s*Grup", group_label, re.I):
            m = re.search(r"(\d+)\.\s*Grup", group_label, re.I)
            group_key = f"{m.group(1)}.Grup"
        elif re.search(r"play-?off", group_label, re.I):
            group_key = "Play-Off"
            group_label = group_label + " (Play-Off)" if "Play-Off" not in group_label else group_label
        elif table_idx > 0:
            group_key = "Play-Off"
            group_label = group_label + " - Play-Off"
        else:
            group_key = "1.Grup"

        for tr in tbl.select("tbody tr[data-team-name]"):
            team_name = tr.get("data-team-name", "").strip()
            team_id = tr.get("data-team-id", "").strip()
            try:
                rank = _to_int(tr.select_one(".p0c-competition-tables__rank").get_text(strip=True))
            except Exception:
                rank = 0

            # Collect numeric stats from tds, skipping the first td (rank) and any link/rank-change td
            nums = []
            for idx, td in enumerate(tr.select("td")):
                if idx == 0:
                    continue  # rank cell ("1 1")
                if td.select_one("a, .p0c-competition-tables__rank-change"):
                    continue
                txt = td.get_text(" ", strip=True)
                if re.fullmatch(r"[-+]?\d+", txt):
                    nums.append(_to_int(txt))

            # Expected: [O, +/-, G, B, M, A, Y, AV, P]
            if len(nums) < 9:
                continue
            o, _plusminus, g, b, m, a, y, av, p = nums[:9]
            out.append({
                "league_group": group_key,
                "group_label": group_label,
                "rank": rank,
                "team_name": team_name,
                "team_macko_id": team_id,
                "played": o, "wins": g, "draws": b, "losses": m,
                "goals_for": a, "goals_against": y,
                "goal_difference": av, "points": p,
            })
    return out


def _detect_competition(text: str) -> str:
    if re.search(r"play-?off", text, re.I):
        return "Süper Amatör Lig - Bursa Play-Off"
    return "Süper Amatör Lig - Bursa 1.Grup"


_DATE_RE = re.compile(r"(\d{1,2})/(\d{1,2})(\d{4})")  # Mackolik writes "10/182025" → month/day year compressed


def _parse_macko_date(s: str) -> Optional[datetime]:
    # Format observed: "10/182025" → 2025-10-18
    m = _DATE_RE.search(s)
    if not m:
        return None
    month, day, year = m.group(1), m.group(2), m.group(3)
    try:
        return datetime(int(year), int(month), int(day), 15, 0, tzinfo=timezone.utc)
    except ValueError:
        return None


def parse_fixtures(html: str, team_name: str) -> list[dict]:
    """Returns list of match dicts."""
    soup = BeautifulSoup(html, "lxml")
    out = []
    seen = set()

    tbl = soup.select_one("table")
    if not tbl:
        return out

    team_norm = _norm_name(team_name)

    for tr in tbl.select("tbody tr"):
        link = tr.select_one('a[href*="/mac/"]')
        if not link:
            continue
        href = link.get("href", "")
        match_id_m = re.search(r"/mac/[^/]+/([\w-]+)", href)
        match_id = match_id_m.group(1) if match_id_m else _new_id()
        if match_id in seen:
            continue
        seen.add(match_id)

        # Date from data-start-timestamp (seconds) or data-utc on date span (ms)
        ts = link.get("data-start-timestamp")
        match_dt = None
        if ts and ts.isdigit():
            try:
                match_dt = datetime.fromtimestamp(int(ts), tz=timezone.utc)
            except (ValueError, OSError):
                match_dt = None
        if not match_dt:
            span_utc = tr.select_one("[data-utc]")
            if span_utc and span_utc.get("data-utc", "").isdigit():
                try:
                    match_dt = datetime.fromtimestamp(int(span_utc["data-utc"]) / 1000, tz=timezone.utc)
                except (ValueError, OSError):
                    pass

        # Team names from team-full-name spans (in order: home, away)
        team_spans = tr.select("span.p0c-team-matches__team-full-name")
        if len(team_spans) < 2:
            continue
        home_team = team_spans[0].get_text(strip=True)
        away_team = team_spans[1].get_text(strip=True)

        # Scores from p0c-team-matches__score spans (in order: home, away)
        score_spans = tr.select("span.p0c-team-matches__score")
        home_score = away_score = None
        status = "upcoming"
        if len(score_spans) >= 2:
            hs = score_spans[0].get_text(strip=True)
            as_ = score_spans[1].get_text(strip=True)
            if hs.isdigit() and as_.isdigit():
                home_score = int(hs)
                away_score = int(as_)
                status = "finished"

        # Result class hints status (win/lose/draw classes mean the match has finished)
        link_cls = " ".join(link.get("class") or [])
        if any(k in link_cls for k in ("--win", "--lose", "--draw")):
            if home_score is None or away_score is None:
                status = "finished"
        elif "--upcoming" in link_cls or status == "upcoming":
            status = "upcoming"

        # Competition: heuristic by date — Bursa SAL play-off starts late March 2026
        comp = "Süper Amatör Lig - Bursa 1.Grup"
        if match_dt and match_dt >= datetime(2026, 3, 20, tzinfo=timezone.utc):
            comp = "Süper Amatör Lig - Bursa Play-Off"

        is_home = (_norm_name(home_team) == team_norm)
        opponent = away_team if is_home else home_team

        out.append({
            "match_macko_id": match_id,
            "season": "2025-2026",
            "competition": comp,
            "home_team": home_team,
            "away_team": away_team,
            "opponent": opponent,
            "is_home": is_home,
            "home_score": home_score,
            "away_score": away_score,
            "match_date": match_dt.isoformat() if match_dt else _now(),
            "status": status,
        })
    return out


def parse_squad(html: str) -> list[dict]:
    """Returns list of player dicts.
    Mackolik squad table columns: [_, no, name, _, POS, age, MAÇ, İLK11, GOL, ASİST, SARI, KIRMIZI]
    """
    soup = BeautifulSoup(html, "lxml")
    out = []
    tbl = soup.select_one("table")
    if not tbl:
        return out

    for tr in tbl.select("tbody tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.select("td")]
        if len(cells) < 12:
            continue
        link = tr.select_one('a[href*="/futbolcu/"]')
        if not link:
            continue
        href = link.get("href", "")
        macko_id_m = re.search(r"/futbolcu/[^/]+/([\w-]+)", href)
        macko_id = macko_id_m.group(1) if macko_id_m else None

        no = _to_int(cells[1])
        name = cells[2]
        pos_code = cells[4]
        age = _to_int(cells[5])
        matches = _to_int(cells[6])
        starts = _to_int(cells[7])
        goals = _to_int(cells[8])
        assists = _to_int(cells[9])
        yellow = _to_int(cells[10])
        red = _to_int(cells[11])
        position = POS_MAP.get(pos_code, pos_code or "Oyuncu")
        out.append({
            "macko_player_id": macko_id,
            "jersey_number": no,
            "name": name,
            "position": position,
            "age": age,
            "stats": {
                "matches": matches, "starts": starts, "goals": goals,
                "assists": assists, "yellow_cards": yellow, "red_cards": red,
            },
        })
    return out


# ─────────────────────────── Photo fetch ───────────────────────────

async def fetch_player_photo(client: httpx.AsyncClient, macko_id: str) -> Optional[str]:
    """Returns base64 data URL, or None if placeholder."""
    if not macko_id:
        return None
    try:
        r = await client.get(PHOTO_URL.format(macko_id))
        if r.status_code != 200 or len(r.content) < PHOTO_MIN_BYTES:
            return None
        ctype = r.headers.get("content-type", "image/png").split(";")[0].strip() or "image/png"
        b64 = base64.b64encode(r.content).decode("ascii")
        return f"data:{ctype};base64,{b64}"
    except Exception:
        return None


# ─────────────────────────── Sync orchestrator ───────────────────────────

async def fetch_all(team_id: str, team_name: str) -> dict:
    """Fetches the 3 Mackolik pages and returns parsed payload (no DB writes)."""
    slug = _slug(team_name)
    standings_url = f"{BASE}/takim/{slug}/puan-durumu/{team_id}"
    fixtures_url = f"{BASE}/takim/{slug}/maçlar/{team_id}"
    squad_url = f"{BASE}/takim/{slug}/kadro/{team_id}"

    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        s_html, f_html, k_html = await asyncio.gather(
            _fetch_html(standings_url, client),
            _fetch_html(fixtures_url, client),
            _fetch_html(squad_url, client),
        )

    return {
        "standings": parse_standings(s_html),
        "fixtures": parse_fixtures(f_html, team_name),
        "squad": parse_squad(k_html),
        "urls": {"standings": standings_url, "fixtures": fixtures_url, "squad": squad_url},
    }


async def sync_to_db(db, team_id: str, team_name: str, options: dict) -> dict:
    """Run sync against MongoDB. options: {standings, fixtures, squad, photos, force_photos}."""
    payload = await fetch_all(team_id, team_name)
    summary = {
        "fetched": {k: len(payload[k]) if isinstance(payload[k], list) else 0
                    for k in ("standings", "fixtures", "squad")},
        "applied": {"standings": 0, "fixtures": 0, "players_updated": 0,
                    "players_created": 0, "photos_updated": 0, "photos_skipped": 0},
        "warnings": [],
        "urls": payload["urls"],
    }

    # Standings
    if options.get("standings", True) and payload["standings"]:
        await db.standings.delete_many({})
        docs = []
        for r in payload["standings"]:
            docs.append({
                "id": _new_id(),
                "rank": r["rank"], "team_name": r["team_name"],
                "logo_url": "", "played": r["played"],
                "wins": r["wins"], "draws": r["draws"], "losses": r["losses"],
                "goals_for": r["goals_for"], "goals_against": r["goals_against"],
                "goal_difference": r["goal_difference"], "points": r["points"],
                "season": "2025-2026",
                "league_group": r["league_group"], "group_label": r["group_label"],
                "team_macko_id": r.get("team_macko_id", ""),
                "created_at": _now(), "updated_at": _now(),
            })
        if docs:
            await db.standings.insert_many(docs)
        summary["applied"]["standings"] = len(docs)

    # Fixtures
    if options.get("fixtures", True) and payload["fixtures"]:
        await db.matches.delete_many({})
        docs = []
        home_venue = "Tesisleri"
        for m in payload["fixtures"]:
            docs.append({
                "id": _new_id(),
                "season": m["season"], "competition": m["competition"],
                "home_team": m["home_team"], "away_team": m["away_team"],
                "opponent": m["opponent"], "is_home": m["is_home"],
                "home_score": m["home_score"], "away_score": m["away_score"],
                "match_date": m["match_date"],
                "venue": f"{team_name} {home_venue}" if m["is_home"] else f"{m['opponent']} Sahası",
                "status": m["status"], "summary": "",
                "opponent_logo": "", "match_macko_id": m["match_macko_id"],
                "created_at": _now(), "updated_at": _now(),
            })
        if docs:
            await db.matches.insert_many(docs)
        summary["applied"]["fixtures"] = len(docs)

    # Squad (with optional photo fetch)
    if options.get("squad", True) and payload["squad"]:
        existing = await db.players.find({}, {"_id": 0}).to_list(500)
        by_norm = {_norm_name(p["name"]): p for p in existing}
        max_goals = max((p["stats"]["goals"] for p in payload["squad"]), default=0)
        max_assists = max((p["stats"]["assists"] for p in payload["squad"]), default=0)
        top_scorer = next((p["name"] for p in payload["squad"]
                          if p["stats"]["goals"] == max_goals and max_goals > 0), None)
        top_assist = next((p["name"] for p in payload["squad"]
                          if p["stats"]["assists"] == max_assists and max_assists > 0), None)

        async with httpx.AsyncClient(timeout=TIMEOUT) as photo_client:
            for p in payload["squad"]:
                nkey = _norm_name(p["name"])
                doc = by_norm.get(nkey)
                update = {
                    "jersey_number": p["jersey_number"],
                    "position": p["position"],
                    "age": p["age"], "birth_year": 2026 - p["age"] if p["age"] else None,
                    "stats": p["stats"],
                    "macko_player_id": p["macko_player_id"],
                    "top_scorer": (p["name"] == top_scorer),
                    "top_assist": (p["name"] == top_assist),
                    "updated_at": _now(),
                }

                # Photo handling
                photo_done = False
                if options.get("photos", True):
                    has_photo = bool(doc and doc.get("photo_url"))
                    photo_source = doc.get("photo_source") if doc else None
                    can_overwrite = options.get("force_photos", False) or not has_photo or photo_source == "mackolik"
                    if can_overwrite and p["macko_player_id"]:
                        data_url = await fetch_player_photo(photo_client, p["macko_player_id"])
                        if data_url:
                            update["photo_url"] = data_url
                            update["photo_source"] = "mackolik"
                            summary["applied"]["photos_updated"] += 1
                            photo_done = True
                if not photo_done and options.get("photos", True):
                    summary["applied"]["photos_skipped"] += 1

                if doc:
                    await db.players.update_one({"id": doc["id"]}, {"$set": update})
                    summary["applied"]["players_updated"] += 1
                else:
                    new_doc = {
                        "id": _new_id(),
                        "slug": _slug(p["name"]),
                        "name": p["name"], "active": True,
                        "is_captain": False, "is_featured": False,
                        "preferred_foot": "", "height_cm": None,
                        "photo_url": update.get("photo_url", ""),
                        "photo_source": update.get("photo_source", ""),
                        "bio": f"{p['name']}, {team_name} {p['position'].lower()} mevkiindeki oyuncularımızdandır.",
                        "gallery": [], "social": {},
                        "created_at": _now(),
                        **update,
                    }
                    await db.players.insert_one(new_doc)
                    summary["applied"]["players_created"] += 1

    summary["completed_at"] = _now()
    return summary
