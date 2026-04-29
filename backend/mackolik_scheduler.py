"""
Mackolik scheduled auto-sync.

Reads schedule from DB (`site_settings` id='mackolik').
Default: Sunday 00:00 Europe/Istanbul.
Admin can toggle on/off and change day/hour from UI.
"""
import logging
from typing import Optional

import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

import mackolik_sync

logger = logging.getLogger(__name__)

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_LABELS_TR = {
    "mon": "Pazartesi", "tue": "Salı", "wed": "Çarşamba", "thu": "Perşembe",
    "fri": "Cuma", "sat": "Cumartesi", "sun": "Pazar",
}
DEFAULT_TZ = "Europe/Istanbul"
JOB_ID = "mackolik_auto_sync"

_scheduler: Optional[AsyncIOScheduler] = None
_db = None


def _now_iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


async def _run_job():
    """Execute the scheduled sync."""
    settings = await _db.site_settings.find_one({"id": "mackolik"}, {"_id": 0})
    if not settings or not settings.get("enabled", True):
        logger.info("[macko-scheduler] Skipped: sync disabled")
        return
    if not settings.get("auto_sync_enabled", False):
        logger.info("[macko-scheduler] Skipped: auto-sync disabled")
        return
    team_id = settings.get("macko_team_id")
    team_name = settings.get("team_display_name")
    if not team_id or not team_name:
        logger.warning("[macko-scheduler] Skipped: missing team config")
        return

    options = settings.get("auto_sync_options") or {
        "standings": True, "fixtures": True, "squad": True,
        "photos": True, "force_photos": False,
    }

    logger.info(f"[macko-scheduler] Running auto-sync for team={team_name}")
    try:
        await _db.site_settings.update_one(
            {"id": "mackolik"},
            {"$set": {"last_sync_status": "running",
                      "last_sync_started_at": _now_iso(),
                      "last_sync_trigger": "auto"}},
        )
        summary = await mackolik_sync.sync_to_db(_db, team_id, team_name, options)
        await _db.site_settings.update_one(
            {"id": "mackolik"},
            {"$set": {
                "last_sync_status": "success",
                "last_sync_at": _now_iso(),
                "last_sync_summary": summary,
                "last_sync_error": None,
                "last_sync_trigger": "auto",
            }},
        )
        logger.info(f"[macko-scheduler] Auto-sync OK: {summary['applied']}")
    except Exception as e:
        logger.exception("[macko-scheduler] Auto-sync failed")
        await _db.site_settings.update_one(
            {"id": "mackolik"},
            {"$set": {
                "last_sync_status": "error",
                "last_sync_error": str(e),
                "last_sync_at": _now_iso(),
                "last_sync_trigger": "auto",
            }},
        )


def init(db) -> AsyncIOScheduler:
    """Initialize and start the scheduler. Idempotent."""
    global _scheduler, _db
    _db = db
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
        _scheduler.start()
        logger.info("[macko-scheduler] Started")
    return _scheduler


async def reschedule_from_db():
    """Reload schedule from DB and (re)register the job."""
    if _scheduler is None or _db is None:
        return None
    settings = await _db.site_settings.find_one({"id": "mackolik"}, {"_id": 0})
    # Remove existing job
    try:
        _scheduler.remove_job(JOB_ID)
    except Exception:
        pass

    if not settings or not settings.get("auto_sync_enabled"):
        return None

    day = settings.get("auto_sync_day", "sun")
    if day not in DAYS:
        day = "sun"
    hour = int(settings.get("auto_sync_hour", 0))
    minute = int(settings.get("auto_sync_minute", 0))
    tz_name = settings.get("auto_sync_timezone", DEFAULT_TZ)
    try:
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = pytz.timezone(DEFAULT_TZ)

    trigger = CronTrigger(day_of_week=day, hour=hour, minute=minute, timezone=tz)
    _scheduler.add_job(_run_job, trigger=trigger, id=JOB_ID, replace_existing=True)
    job = _scheduler.get_job(JOB_ID)
    next_run = job.next_run_time.isoformat() if job and job.next_run_time else None
    logger.info(f"[macko-scheduler] Scheduled: {day} {hour:02d}:{minute:02d} {tz_name} → next={next_run}")
    return next_run


def get_next_run_iso() -> Optional[str]:
    if _scheduler is None:
        return None
    job = _scheduler.get_job(JOB_ID)
    if not job or not job.next_run_time:
        return None
    return job.next_run_time.isoformat()
