"""
Regional outbreak / new-disease detection.

Flags a disease in a region when its case count within a recent window
crosses OUTBREAK_CASE_THRESHOLD, or when a disease is observed in a
region for the first time (no prior scans of that disease exist there).
"""
import datetime as dt
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.config import settings


def region_summaries(db: Session) -> list[dict]:
    rows = (
        db.query(
            models.User.region.label("region"),
            models.Scan.disease.label("disease"),
            func.count(models.Scan.id).label("count"),
            func.avg(models.Scan.severity).label("avg_severity"),
        )
        .join(models.CropSelection, models.CropSelection.user_id == models.User.id)
        .join(models.Scan, models.Scan.crop_selection_id == models.CropSelection.id)
        .filter(models.User.region.isnot(None))
        .group_by(models.User.region, models.Scan.disease)
        .all()
    )

    summary: dict[str, dict] = {}
    for r in rows:
        s = summary.setdefault(r.region, {"region": r.region, "total_scans": 0, "diseases": {}, "severities": []})
        s["total_scans"] += r.count
        s["diseases"][r.disease] = r.count
        s["severities"].append(r.avg_severity or 0)

    results = []
    for region, data in summary.items():
        top_disease = max(data["diseases"], key=data["diseases"].get) if data["diseases"] else None
        avg_sev = sum(data["severities"]) / len(data["severities"]) if data["severities"] else 0
        results.append({
            "region": region,
            "total_scans": data["total_scans"],
            "avg_severity": round(avg_sev, 1),
            "top_disease": top_disease,
            "case_counts": data["diseases"],
            "risk_band_counts": data["diseases"],
        })
    return results


def detect_outbreaks(db: Session, window_days: int = 30) -> list[dict]:
    since = dt.datetime.utcnow() - dt.timedelta(days=window_days)
    rows = (
        db.query(
            models.User.region.label("region"),
            models.Scan.disease.label("disease"),
            func.count(models.Scan.id).label("count"),
        )
        .join(models.CropSelection, models.CropSelection.user_id == models.User.id)
        .join(models.Scan, models.Scan.crop_selection_id == models.CropSelection.id)
        .filter(models.User.region.isnot(None), models.Scan.created_at >= since, models.Scan.disease != "Healthy")
        .group_by(models.User.region, models.Scan.disease)
        .having(func.count(models.Scan.id) >= settings.OUTBREAK_CASE_THRESHOLD)
        .all()
    )
    return [
        {"region": r.region, "disease": r.disease, "case_count": r.count, "threshold": settings.OUTBREAK_CASE_THRESHOLD}
        for r in rows
    ]
