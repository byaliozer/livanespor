"""
Match Pre-Game Analysis — Data enrichment helpers.

Goal: gather rich, structured data to feed the LLM so the final report reads like
an expert football commentator's analysis (opponent recent form, home/away split,
top scorers, goal averages, danger scenarios, tactical weaknesses).

All functions are pure (no DB writes). Mackolik fetches are best-effort — failures
degrade gracefully by returning partial data rather than raising.
"""
from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import logging

import mackolik_sync

logger = logging.getLogger(__name__)


# ─────────────────────────── Pure computations on finished-match lists ───────────────────────────

def _result_for(team_name: str, m: Dict[str, Any]) -> Optional[Tuple[str, int, int, bool, str]]:
    """Returns (result_letter, our_score, their_score, is_home, opponent_name) for given team.
    Returns None if scores missing."""
    ht = (m.get('home_team') or '').lower()
    at = (m.get('away_team') or '').lower()
    tn = team_name.lower()
    is_home = tn in ht
    is_away = tn in at
    if not (is_home or is_away):
        return None
    hs = m.get('home_score')
    as_ = m.get('away_score')
    if hs is None or as_ is None:
        return None
    os_ = hs if is_home else as_
    ts_ = as_ if is_home else hs
    opp = m.get('away_team') if is_home else m.get('home_team')
    res = 'G' if os_ > ts_ else ('B' if os_ == ts_ else 'M')
    return (res, int(os_), int(ts_), is_home, opp or '—')


def compute_form_summary(team_name: str, finished_matches: List[Dict[str, Any]], limit: int = 10) -> Dict[str, Any]:
    """Compute form/home-away/goal-averages from a team's recent finished matches.

    finished_matches: sorted desc by match_date, raw dicts with home_team, away_team,
    home_score, away_score, match_date, venue? etc.
    """
    lines: List[str] = []
    home_w = home_d = home_l = home_gf = home_ga = 0
    away_w = away_d = away_l = away_gf = away_ga = 0
    clean_sheets = 0
    total = 0
    considered = finished_matches[:limit]
    for m in considered:
        r = _result_for(team_name, m)
        if not r:
            continue
        res, os_, ts_, is_home, opp = r
        tag = 'Ev' if is_home else 'Dep'
        date_s = (m.get('match_date') or '')[:10]
        lines.append(f"{res} {date_s} {opp} {os_}-{ts_} ({tag})")
        total += 1
        if ts_ == 0:
            clean_sheets += 1
        if is_home:
            home_gf += os_
            home_ga += ts_
            if res == 'G':
                home_w += 1
            elif res == 'B':
                home_d += 1
            else:
                home_l += 1
        else:
            away_gf += os_
            away_ga += ts_
            if res == 'G':
                away_w += 1
            elif res == 'B':
                away_d += 1
            else:
                away_l += 1
    home_n = home_w + home_d + home_l
    away_n = away_w + away_d + away_l

    def _avg(n: int, d: int) -> float:
        return round(n / d, 2) if d > 0 else 0.0

    return {
        'total': total,
        'lines': lines,
        'home': {
            'played': home_n, 'wins': home_w, 'draws': home_d, 'losses': home_l,
            'gf': home_gf, 'ga': home_ga,
            'gf_avg': _avg(home_gf, home_n), 'ga_avg': _avg(home_ga, home_n),
            'points': home_w * 3 + home_d,
            'ppm': _avg(home_w * 3 + home_d, home_n),
        },
        'away': {
            'played': away_n, 'wins': away_w, 'draws': away_d, 'losses': away_l,
            'gf': away_gf, 'ga': away_ga,
            'gf_avg': _avg(away_gf, away_n), 'ga_avg': _avg(away_ga, away_n),
            'points': away_w * 3 + away_d,
            'ppm': _avg(away_w * 3 + away_d, away_n),
        },
        'overall': {
            'gf_avg': _avg(home_gf + away_gf, total),
            'ga_avg': _avg(home_ga + away_ga, total),
            'clean_sheets': clean_sheets,
            'clean_sheet_pct': round(100 * clean_sheets / total) if total > 0 else 0,
        },
        # Last 5 compact streak like "GGBMG"
        'last5_streak': ''.join(_result_for(team_name, m)[0] for m in considered[:5] if _result_for(team_name, m)),
    }


def danger_scenarios(opp_form: Dict[str, Any], opp_standing: Optional[Dict[str, Any]], we_are_home: bool) -> List[str]:
    """Produce coach-friendly alert lines based on opponent form + venue."""
    alerts: List[str] = []
    streak = opp_form.get('last5_streak', '')
    # Winning streak
    if streak.startswith('GGG'):
        alerts.append(f"⚠️ Rakip son 3+ maçı ÜST ÜSTE kazanıyor ({streak[:5]}) — momentum yüksek.")
    elif streak[:3].count('G') >= 2 and streak[:3].count('M') == 0:
        alerts.append(f"⚠️ Rakip son 3 maçın 2'sini kazandı ({streak[:5]}), formda geliyor.")
    # Losing streak → our advantage
    if streak.startswith('MMM'):
        alerts.append(f"✓ Rakip son 3 maçı ÜST ÜSTE kaybetti ({streak[:5]}) — moral zayıf, baskı şansımız yüksek.")
    # Home fortress vs away weakness
    if we_are_home:
        away = opp_form.get('away', {})
        if away.get('played', 0) >= 3 and away.get('ppm', 0) < 1.0:
            alerts.append(f"✓ Rakip deplasmanda zayıf: {away['played']} maçta sadece {away['points']} puan (maç başı {away['ppm']}).")
        if away.get('played', 0) >= 3 and away.get('ga_avg', 0) >= 2.0:
            alerts.append(f"✓ Rakip deplasmanda maç başı {away['ga_avg']} gol yiyor — hücum fırsatı.")
        # NEW: Away-strong opponent visiting us — real threat
        if away.get('played', 0) >= 3 and away.get('ppm', 0) >= 2.0:
            alerts.append(f"⚠️ Rakip deplasmanda ÇOK GÜÇLÜ: son {away['played']} dep. maçta {away['points']} puan (PPM {away['ppm']}) — sahamıza rahat gelen bir rakip, ciddiye al.")
        if away.get('played', 0) >= 3 and away.get('gf_avg', 0) >= 2.5:
            alerts.append(f"⚠️ Rakip deplasmanda maç başı {away['gf_avg']} gol atıyor — ev sahibi olmak bizi rahatlatmamalı, savunmaya yüklenmeli.")
    else:
        home = opp_form.get('home', {})
        if home.get('played', 0) >= 3 and home.get('ppm', 0) >= 2.0:
            alerts.append(f"⚠️ Rakip KENDİ SAHASINDA çok güçlü: {home['played']} maçta {home['points']} puan (maç başı {home['ppm']}).")
        if home.get('played', 0) >= 3 and home.get('gf_avg', 0) >= 2.0:
            alerts.append(f"⚠️ Rakip iç sahada maç başı {home['gf_avg']} gol atıyor — hücum hattına dikkat.")
        # NEW: Away-traveling-to-weak-home — our opportunity
        if home.get('played', 0) >= 3 and home.get('ppm', 0) < 1.0:
            alerts.append(f"✓ Rakip kendi sahasında zayıf: son {home['played']} iç saha maçta sadece {home['points']} puan — deplasmanda bile puan alma şansımız yüksek.")
    # Defensive leakiness
    if opp_form.get('overall', {}).get('clean_sheet_pct', 0) < 20 and opp_form.get('total', 0) >= 4:
        alerts.append(f"✓ Rakip son {opp_form['total']} maçta sadece {opp_form['overall']['clean_sheets']} kez gol yemeden bitirdi — savunma kırılgan.")
    # Standings-based
    if opp_standing and opp_standing.get('rank') and opp_standing.get('rank') > 10:
        alerts.append(f"✓ Rakip ligde {opp_standing['rank']}. sırada — puan durumu lehimize.")
    return alerts[:6]  # Limit to 6 most important


def threat_scorer_alerts(opp_top_scorers_raw: List[Dict[str, Any]]) -> List[str]:
    """Generate a focused alert about opponent's most dangerous scorer(s)."""
    out = []
    for p in opp_top_scorers_raw[:2]:
        s = p.get('stats') or {}
        goals = s.get('goals') or 0
        matches = s.get('matches') or 0
        if goals >= 10 and matches > 0:
            per = round(goals / matches, 2)
            out.append(
                f"⚠️ {p.get('name')} (#{p.get('jersey_number')}, {p.get('position')}) — "
                f"{goals} gol / {matches} maç (maç başı {per}). "
                f"{'Maç başı 1+ gol eşiğinde gerçek sınıf forveti, çift stoper marking + 6 numara desteği şart.' if per >= 1.0 else 'Ceza sahası içi top temasına izin vermemeli.'}"
            )
    return out


def top_scorers_from_squad(squad: List[Dict[str, Any]], n: int = 3) -> List[Dict[str, Any]]:
    """Sort a Mackolik-parsed squad list by goals desc and return top N with stats."""
    def _goals(p):
        return (p.get('stats') or {}).get('goals') or 0
    return sorted([p for p in squad if _goals(p) > 0], key=lambda p: -_goals(p))[:n]


def format_opp_scorers(scorers: List[Dict[str, Any]]) -> List[str]:
    out = []
    for p in scorers:
        s = p.get('stats') or {}
        matches = s.get('matches') or 0
        goals = s.get('goals') or 0
        per_match = round(goals / matches, 2) if matches > 0 else goals
        out.append(
            f"{p.get('name','?')} (#{p.get('jersey_number','?')}, {p.get('position','?')}) — "
            f"{goals} gol / {matches} maç (maç başı {per_match})"
        )
    return out


# ─────────────────────────── Mackolik fetch (best-effort) ───────────────────────────

async def fetch_opponent_mackolik(opp_row: Optional[Dict[str, Any]], opp_club: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Fetch opponent's fixtures + squad from Mackolik using team_macko_id.

    Prefers team_macko_id from opp_club (opponent_clubs collection), falls back to
    opp_row (standings). Returns None if no id is available or fetch fails.
    """
    team_macko_id = None
    team_name = None
    if opp_club and opp_club.get('team_macko_id'):
        team_macko_id = opp_club['team_macko_id']
        team_name = opp_club.get('name')
    elif opp_row and opp_row.get('team_macko_id'):
        team_macko_id = opp_row['team_macko_id']
        team_name = opp_row.get('team_name')
    if not team_macko_id or not team_name:
        return None
    try:
        payload = await mackolik_sync.fetch_all(team_macko_id, team_name)
        return payload
    except Exception as e:
        logger.warning("opponent mackolik fetch failed: %s", e)
        return None


def filter_finished(fixtures: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filter Mackolik fixtures list to finished-only, sorted desc by date."""
    done = [f for f in fixtures if f.get('status') == 'finished' and f.get('home_score') is not None and f.get('away_score') is not None]
    done.sort(key=lambda m: m.get('match_date') or '', reverse=True)
    return done
