"""
Dashboard router — provides a GET /dashboard summary endpoint.
Aggregates user scan & crop data for the frontend dashboard view.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, auth

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return a summary of the current user's crop health data."""
    crops = (
        db.query(models.CropSelection)
        .filter(models.CropSelection.user_id == current_user.id)
        .all()
    )
    crop_ids = [c.id for c in crops]

    scans = (
        db.query(models.Scan)
        .filter(models.Scan.crop_selection_id.in_(crop_ids))
        .order_by(models.Scan.created_at.desc())
        .all()
        if crop_ids else []
    )

    total_scans = len(scans)
    diseases_detected = sum(1 for s in scans if s.disease and s.disease.lower() not in ("healthy", "none", ""))
    avg_risk = round(sum(s.risk_score for s in scans) / total_scans, 1) if total_scans else 0.0
    recent_scans = [
        {
            "id": s.id,
            "crop": next((c.crop for c in crops if c.id == s.crop_selection_id), "Unknown"),
            "disease": s.disease,
            "risk_score": s.risk_score,
            "risk_band": s.risk_band,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in scans[:5]
    ]

    # Calculate crop health breakdown
    from app.routers.crops import _crop_statuses
    healthy_count = 0
    attention_count = 0
    monitoring_count = 0
    treatment_count = 0

    for c in crops:
        st = _crop_statuses.get(c.id, "HEALTHY").upper()
        if st == "HEALTHY":
            healthy_count += 1
        elif st == "ATTENTION":
            attention_count += 1
        elif st == "MONITORING":
            monitoring_count += 1
        elif st == "TREATMENT":
            treatment_count += 1
        else:
            healthy_count += 1

    from app.routers.farms import _farms
    user_farms_count = sum(1 for f in _farms if f.get("owner_id") == current_user.id)

    return {
        "total_farms": user_farms_count,
        "totalFarms": user_farms_count,
        "total_crops": len(crops),
        "totalCrops": len(crops),
        "healthy_crops": healthy_count,
        "healthyCrops": healthy_count,
        "attention_needed": attention_count,
        "attention_crops": attention_count,
        "attentionCrops": attention_count,
        "monitoring_crops": monitoring_count,
        "monitoringCrops": monitoring_count,
        "treatment_crops": treatment_count,
        "treatmentCrops": treatment_count,
        "total_scans": total_scans,
        "totalScans": total_scans,
        "diseases_detected": diseases_detected,
        "avg_risk_score": avg_risk,
        "recent_scans": recent_scans,
    }
