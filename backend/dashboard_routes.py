"""
Livanespor — Admin Dashboard endpoints (split from server.py).
Stateless module: receives db + dependencies via register_dashboard_routes().
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from typing import Any, List, Dict, Optional, Callable, Awaitable
import asyncio


def _parse_birth(b) -> Optional[datetime]:
    if not b:
        return None
    try:
        if isinstance(b, str):
            return datetime.strptime(b[:10], '%Y-%m-%d')
    except Exception:
        return None
    return None


async def _upcoming_birthdays(db: Any, days_ahead: int = 30) -> List[dict]:
    rows = await db.players.find({'active': {'$ne': False}}, {'_id': 0}).to_list(500)
    today = datetime.now(timezone.utc).date()
    out = []
    for p in rows:
        bd = _parse_birth(p.get('birth_date'))
        if not bd:
            continue
        try:
            this_year = bd.replace(year=today.year).date()
        except ValueError:
            continue
        delta = (this_year - today).days
        if delta < 0:
            try:
                next_year = bd.replace(year=today.year + 1).date()
                delta = (next_year - today).days
                upcoming_date = next_year
            except ValueError:
                continue
        else:
            upcoming_date = this_year
        if 0 <= delta <= days_ahead:
            age_turning = upcoming_date.year - bd.year
            out.append({
                'id': p.get('id'),
                'slug': p.get('slug'),
                'name': p.get('name'),
                'photo_url': p.get('photo_url'),
                'position': p.get('position'),
                'jersey_number': p.get('jersey_number'),
                'birth_date': p.get('birth_date'),
                'upcoming_date': upcoming_date.isoformat(),
                'days_until': delta,
                'turning_age': age_turning,
            })
    out.sort(key=lambda x: x['days_until'])
    return out


def register_dashboard_routes(
    api_router: APIRouter,
    db: Any,
    require_admin,
    ensure_subscription_doc: Callable[[], Awaitable[dict]],
):
    """Attach dashboard endpoints to api_router."""

    @api_router.get("/admin/dashboard/birthdays")
    async def admin_birthdays(days: int = 30, user=Depends(require_admin)):
        return await _upcoming_birthdays(db, days_ahead=days)

    @api_router.get("/admin/dashboard/stats")
    async def admin_dashboard_stats(user=Depends(require_admin)):
        [posts_total, posts_pub, posts_draft, players_active, sponsors_active,
         upcoming_matches, applications_new, messages_unread, media_total,
         opponents_total] = await asyncio.gather(
            db.posts.count_documents({}),
            db.posts.count_documents({'status': 'published'}),
            db.posts.count_documents({'status': 'draft'}),
            db.players.count_documents({'active': {'$ne': False}}),
            db.sponsors.count_documents({'active': {'$ne': False}}),
            db.matches.count_documents({'status': 'upcoming'}),
            db.academy_applications.count_documents({'status': 'new'}),
            db.contact_messages.count_documents({'status': 'unread'}),
            db.media.count_documents({}),
            db.opponent_clubs.count_documents({}),
        )
        recent_apps = await db.academy_applications.find({}, {'_id': 0}).sort('created_at', -1).limit(5).to_list(5)
        recent_msgs = await db.contact_messages.find({}, {'_id': 0}).sort('created_at', -1).limit(5).to_list(5)
        birthdays = await _upcoming_birthdays(db, days_ahead=30)
        today_iso = datetime.now(timezone.utc).date().isoformat()
        birthdays_today = sum(1 for b in birthdays if b.get('upcoming_date') == today_iso)
        macko = await db.site_settings.find_one({'id': 'mackolik'}, {'_id': 0}) or {}
        subscription = await ensure_subscription_doc()

        upcoming_list = await db.matches.find(
            {'status': 'upcoming'}, {'_id': 0}
        ).sort('match_date', 1).limit(5).to_list(5)

        site = await db.site_settings.find_one({'id': 'main'}, {'_id': 0}) or {}
        own_full = (site.get('site_title') or site.get('short_name') or 'Livanespor').strip().lower()
        own_first = own_full.split()[0] if own_full else ''
        own_name = own_first or own_full

        def _team_matches_own(team_name: str) -> bool:
            tn = (team_name or '').strip().lower()
            if not tn:
                return False
            if tn == own_full or tn == own_name:
                return True
            return own_name in tn or tn in own_full

        standings_rows = await db.standings.find({}, {'_id': 0}).sort('rank', 1).to_list(50)
        own_row = next((r for r in standings_rows if _team_matches_own(r.get('team_name'))), None)
        last_5 = []
        league_status = None
        if own_row:
            last_5_played = await db.matches.find(
                {'status': 'finished'}, {'_id': 0}
            ).sort('match_date', -1).limit(5).to_list(5)
            for m in last_5_played:
                home_l = (m.get('home_team') or '').strip().lower()
                we_home = own_name in home_l
                our = m.get('home_score') if we_home else m.get('away_score')
                their = m.get('away_score') if we_home else m.get('home_score')
                if our is None or their is None:
                    continue
                last_5.append('G' if our > their else ('B' if our == their else 'M'))
            league_status = {
                'group_name': own_row.get('group_label') or own_row.get('league_group') or own_row.get('competition'),
                'season': own_row.get('season'),
                'rank': own_row.get('rank'),
                'total_teams': sum(1 for r in standings_rows if r.get('league_group') == own_row.get('league_group')) or len(standings_rows),
                'points': own_row.get('points'),
                'played': own_row.get('played'),
                'wins': own_row.get('wins'),
                'draws': own_row.get('draws'),
                'losses': own_row.get('losses'),
                'goals_for': own_row.get('goals_for'),
                'goals_against': own_row.get('goals_against'),
                'goal_diff': own_row.get('goal_difference') if own_row.get('goal_difference') is not None else (own_row.get('goals_for') or 0) - (own_row.get('goals_against') or 0),
                'last_5': last_5,
            }

        opps_existing = {(o.get('name') or '').strip().lower() for o in await db.opponent_clubs.find({}, {'_id': 0}).to_list(500)}
        all_match_opponents = set()
        async for m in db.matches.find({}, {'_id': 0, 'home_team': 1, 'away_team': 1}):
            for nm in (m.get('home_team'), m.get('away_team')):
                if not nm:
                    continue
                nl = nm.strip().lower()
                if nl == own_name or own_name in nl:
                    continue
                all_match_opponents.add(nl)
        missing_opponent_logos = sum(1 for nl in all_match_opponents if nl not in opps_existing and not any(o in nl or nl in o for o in opps_existing if o))

        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        media_last_7_days = await db.media.count_documents({'created_at': {'$gte': seven_days_ago}})

        recent_finished = await db.matches.find(
            {'status': 'finished'}, {'_id': 0}
        ).sort('match_date', -1).limit(10).to_list(10)
        season_form: List[Dict[str, Any]] = []
        for m in recent_finished:
            home_l = (m.get('home_team') or '').strip().lower()
            we_home = bool(own_name) and own_name in home_l
            our = m.get('home_score') if we_home else m.get('away_score')
            their = m.get('away_score') if we_home else m.get('home_score')
            if our is None or their is None:
                continue
            season_form.append({
                'id': m.get('id'),
                'date': m.get('match_date'),
                'opponent': m.get('opponent'),
                'is_home': we_home,
                'our_score': int(our),
                'their_score': int(their),
                'result': 'W' if our > their else ('D' if our == their else 'L'),
                'competition': m.get('competition'),
            })
        season_form = list(reversed(season_form))
        season_summary = {
            'wins': sum(1 for x in season_form if x['result'] == 'W'),
            'draws': sum(1 for x in season_form if x['result'] == 'D'),
            'losses': sum(1 for x in season_form if x['result'] == 'L'),
            'goals_for': sum(x['our_score'] for x in season_form),
            'goals_against': sum(x['their_score'] for x in season_form),
        }

        def _stat(p, key):
            return (p.get('stats') or {}).get(key) or 0

        players_full = await db.players.find({'active': {'$ne': False}}, {'_id': 0}).to_list(200)
        scorers = sorted(players_full, key=lambda p: -_stat(p, 'goals'))
        assists_list = sorted(players_full, key=lambda p: -_stat(p, 'assists'))
        top_performers = {
            'scorers': [{
                'id': p.get('id'), 'name': p.get('name'),
                'photo_url': p.get('photo_url'), 'jersey_number': p.get('jersey_number'),
                'position': p.get('position'),
                'goals': _stat(p, 'goals'),
            } for p in scorers if _stat(p, 'goals') > 0][:5],
            'assists': [{
                'id': p.get('id'), 'name': p.get('name'),
                'photo_url': p.get('photo_url'), 'jersey_number': p.get('jersey_number'),
                'position': p.get('position'),
                'assists': _stat(p, 'assists'),
            } for p in assists_list if _stat(p, 'assists') > 0][:5],
        }

        return {
            'posts_total': posts_total,
            'posts_published': posts_pub,
            'posts_draft': posts_draft,
            'players_active': players_active,
            'sponsors_active': sponsors_active,
            'upcoming_matches': upcoming_matches,
            'applications_new': applications_new,
            'messages_unread': messages_unread,
            'media_total': media_total,
            'recent_applications': recent_apps,
            'recent_messages': recent_msgs,
            'upcoming_birthdays': birthdays[:6],
            'birthdays_today': birthdays_today,
            'opponents_total': opponents_total,
            'missing_opponent_logos': missing_opponent_logos,
            'media_last_7_days': media_last_7_days,
            'season_form': season_form,
            'season_form_summary': season_summary,
            'top_performers': top_performers,
            'upcoming_matches_list': upcoming_list,
            'league_status': league_status,
            'mackolik': {
                'enabled': macko.get('enabled', False),
                'team_display_name': macko.get('team_display_name'),
                'last_sync_at': macko.get('last_sync_at'),
                'last_sync_status': macko.get('last_sync_status'),
                'last_sync_summary': macko.get('last_sync_summary'),
            },
            'subscription': {
                'plan_name': subscription.get('plan_name'),
                'plan_display_name': subscription.get('plan_display_name'),
                'credit_balance': subscription.get('credit_balance'),
                'monthly_credit_limit': subscription.get('monthly_credit_limit'),
                'last_reset_year_month': subscription.get('last_reset_year_month'),
            },
        }
