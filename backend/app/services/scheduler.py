"""Runs the daily job by itself, once a day, inside the FastAPI server."""
from __future__ import annotations

import logging
from datetime import timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.services import daily_job

logger = logging.getLogger("docdue.scheduler")

JOB_ID = "daily-job"
_scheduler: Optional[AsyncIOScheduler] = None


async def _scheduled_run() -> None:
    try:
        await daily_job.run_daily_job()
    except daily_job.JobBusy:
        logger.warning("Scheduled run skipped: the job is already running")
    except Exception:                                        # noqa: BLE001
        logger.exception("Scheduled daily job crashed")


def start_scheduler() -> None:
    """Call once at server startup, from inside the running event loop."""
    global _scheduler
    if not settings.SCHEDULER_ENABLED:
        logger.info("Scheduler is disabled (SCHEDULER_ENABLED=false)")
        return
    scheduler = AsyncIOScheduler(timezone=timezone.utc)
    scheduler.add_job(
        _scheduled_run,
        CronTrigger(hour=settings.DAILY_JOB_HOUR_UTC,
                    minute=settings.DAILY_JOB_MINUTE_UTC,
                    timezone=timezone.utc),
        id=JOB_ID,
        replace_existing=True,
        max_instances=1,            # never two runs at the same time
        coalesce=True,              # if several runs were missed, run once
        misfire_grace_time=3600,    # a run up to 1 hour late (server was off) still happens
    )
    scheduler.start()
    _scheduler = scheduler
    job = scheduler.get_job(JOB_ID)
    logger.info("Scheduler started. Next daily job: %s", job.next_run_time if job else "unknown")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None