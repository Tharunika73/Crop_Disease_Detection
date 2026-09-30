from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services.advisory import get_advisory

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/ask", response_model=schemas.ChatResponse)
def ask(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    scan = (
        db.query(models.Scan)
        .join(models.CropSelection)
        .filter(models.Scan.id == payload.scan_id, models.CropSelection.user_id == current_user.id)
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    previous_scan = (
        db.query(models.Scan)
        .filter(models.Scan.crop_selection_id == scan.crop_selection_id, models.Scan.id != scan.id)
        .order_by(models.Scan.created_at.desc())
        .first()
    )

    follow_up = get_advisory(
        scan.disease,
        scan.risk_band,
        scan.trajectory,
        previous_severity=previous_scan.severity if previous_scan else None,
        current_severity=scan.severity,
    )

    text = payload.message.lower()
    if "fertil" in text:
        reply = scan.advisory_fertilizer
    elif "irrigat" in text or "water" in text:
        reply = scan.advisory_irrigation
    elif "treat" in text or "spray" in text or "fungicide" in text:
        reply = scan.advisory_treatment
    elif "risk" in text:
        reply = f"Current risk is {scan.risk_band} ({scan.risk_score}/100), based on severity, weather, and growth stage."
    elif "severity" in text or "bad" in text:
        reply = f"Estimated severity is {scan.severity}% of leaf area affected."
    elif "rescan" in text or "when" in text:
        reply = "Rescan in about 5 days if risk is High or Critical, or 10 days if Low or Moderate."
    elif any(keyword in text for keyword in ["improv", "better", "worse", "follow", "progress", "periodic", "status", "update"]):
        reply = f"{follow_up['next_action']} {follow_up['explanation']}"
    else:
        reply = f"For {scan.disease}: {scan.advisory_treatment}"

    return {"reply": reply}
