import os
import uuid
import shutil
import datetime as dt
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app import models, auth
from app.services.severity import estimate_severity
from app.services.detection import predict_disease, generate_gradcam
from app.services.weather import fetch_weather, weather_favorability
from app.services.risk import growth_stage, trend_factor, compute_risk, classify_trajectory
from app.services.advisory import get_advisory
from app.services.preprocessing import preprocess_image
from app.routers.ai_service import analyze as ai_analyze, AnalyzeRequest
from app.services.detection import predict_disease

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

_monitoring_sessions = []
_ai_analyses = []
_session_counter = 1
_analysis_counter = 1

class AiAnalysisSummary(BaseModel):
    id: int
    healthStatus: str
    health_status: Optional[str] = None
    disease: Optional[str] = None
    confidence: float
    severity: str
    severityPercentage: Optional[float] = None
    changeFromPrevious: Optional[str] = None
    change_from_previous: Optional[str] = None
    changeDescription: Optional[str] = None
    analyzedAt: str
    analyzed_at: Optional[str] = None
    # XAI fields
    gradcamUrl: Optional[str] = None
    symptoms: Optional[str] = None
    possibleCauses: Optional[str] = None
    recommendations: Optional[str] = None
    riskBand: Optional[str] = None
    trajectory: Optional[str] = None

class MonitoringSessionOut(BaseModel):
    id: int
    cropId: int
    crop_id: Optional[int] = None
    observationDate: str
    observation_date: Optional[str] = None
    healthStatus: str
    health_status: Optional[str] = None
    notes: Optional[str] = None
    imageUrls: List[str] = []
    image_urls: List[str] = []
    analysis: Optional[AiAnalysisSummary] = None

class AiAnalysisDetail(BaseModel):
    id: int
    cropIdentified: str
    healthStatus: str
    disease: Optional[str] = None
    confidence: float
    symptoms: str
    possibleCauses: str
    severity: str
    severityPercentage: float
    recommendations: str
    prevention: str
    followUpDays: int
    changeFromPrevious: str
    changeDescription: str
    createdAt: str

@router.post("/crop/{crop_id}/upload", response_model=MonitoringSessionOut, status_code=201)
def upload_and_analyze(
    crop_id: int,
    images: List[UploadFile] = File(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    global _session_counter, _analysis_counter
    crop = db.query(models.CropSelection).filter(
        models.CropSelection.id == crop_id, 
        models.CropSelection.user_id == current_user.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "monitoring", str(crop_id))
    os.makedirs(upload_dir, exist_ok=True)

    image_urls = []
    primary_image_path = None
    session_id = _session_counter

    for file in images:
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        filename = f"{session_id}_{uuid.uuid4().hex}{ext}"
        dest = os.path.join(upload_dir, filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        url = f"/uploads/monitoring/{crop_id}/{filename}"
        image_urls.append(url)
        if not primary_image_path:
            primary_image_path = dest

    # Get previous analysis
    prev_session = next((s for s in sorted(_monitoring_sessions, key=lambda x: x["observationDate"], reverse=True) 
                         if s["cropId"] == crop_id), None)
    prev_analysis = next((a for a in _ai_analyses if prev_session and a["session_id"] == prev_session["id"]), None)

    # Call AI analysis
    req = AnalyzeRequest(
        crop_name=crop.crop,
        variety=crop.variety,
        image_path=primary_image_path,
        image_urls=image_urls,
        previous_disease=prev_analysis.get("disease") if prev_analysis else None,
        previous_severity=prev_analysis.get("severityPercentage") if prev_analysis else None,
        previous_health_status=prev_analysis.get("healthStatus") if prev_analysis else None,
    )
    result = ai_analyze(req)

    health_status = result["health_status"]

    # ── XAI: Generate Grad-CAM heatmap ──────────────────────────────────────
    gradcam_url = None
    if primary_image_path:
        try:
            gradcam_filename = f"gradcam_{session_id}_{uuid.uuid4().hex}.jpg"
            gradcam_full_path = os.path.join(upload_dir, gradcam_filename)
            # Build a minimal prediction dict for generate_gradcam
            prediction = {
                "disease": result.get("disease") or "Healthy",
                "confidence": result.get("confidence", 0.90),
                "severity": result.get("severity_percentage", 0.0),
            }
            saved_path = generate_gradcam(primary_image_path, prediction, gradcam_full_path)
            if saved_path:
                gradcam_url = f"/uploads/monitoring/{crop_id}/{gradcam_filename}"
        except Exception as gc_err:
            print(f"[monitoring] Grad-CAM generation skipped: {gc_err}")

    # ── Risk scoring (XAI layer 3) ─────────────────────────────────────────
    try:
        from app.services.weather import fetch_weather, weather_favorability
        from app.services.risk import compute_risk, classify_trajectory
        weather = fetch_weather(
            getattr(current_user, "latitude", None),
            getattr(current_user, "longitude", None)
        )
        fav_score = weather_favorability(weather, result.get("disease"))
        prev_sev = prev_analysis.get("severityPercentage") if prev_analysis else None
        curr_sev = result.get("severity_percentage", 0.0)
        from app.services.risk import trend_factor
        trend = trend_factor(prev_sev, curr_sev)
        trajectory = classify_trajectory(prev_sev, curr_sev)
        risk_score, risk_band = compute_risk(
            result.get("disease"), curr_sev, fav_score, 0.5, trend
        )
    except Exception as risk_err:
        print(f"[monitoring] Risk scoring skipped: {risk_err}")
        trajectory = result.get("change_from_previous", "STABLE")
        risk_band = health_status

    analysis_record = {
        "id": _analysis_counter,
        "session_id": session_id,
        "cropIdentified": result["crop_identified"],
        "healthStatus": health_status,
        "disease": result["disease"],
        "confidence": result["confidence"],
        "symptoms": result["symptoms"],
        "possibleCauses": result["possible_causes"],
        "severity": result["severity"],
        "severityPercentage": result["severity_percentage"],
        "recommendations": result["recommendations"],
        "prevention": result["prevention"],
        "followUpDays": result["follow_up_days"],
        "changeFromPrevious": result["change_from_previous"],
        "changeDescription": result["change_description"],
        "createdAt": dt.datetime.utcnow().isoformat(),
        # XAI fields
        "gradcamUrl": gradcam_url,
        "riskBand": risk_band,
        "trajectory": trajectory,
    }
    _ai_analyses.append(analysis_record)
    
    session_record = {
        "id": session_id,
        "cropId": crop_id,
        "observationDate": dt.datetime.utcnow().isoformat(),
        "healthStatus": health_status,
        "notes": notes,
        "imageUrls": image_urls,
        "analysis_id": analysis_record["id"]
    }
    _monitoring_sessions.append(session_record)
    
    _session_counter += 1
    _analysis_counter += 1
    
    # Update crop status
    from app.routers.crops import _crop_statuses
    _crop_statuses[crop_id] = health_status

    # Save to db models.Scan for dashboard consistency
    try:
        new_scan = models.Scan(
            crop_selection_id=crop_id,
            image_path=primary_image_path,
            disease=result["disease"] or "Healthy",
            confidence=result["confidence"],
            severity=result["severity_percentage"],
            risk_score=result["severity_percentage"] / 10.0, # simplified
            risk_band=health_status,
        )
        db.add(new_scan)
        db.commit()
    except Exception as e:
        print(f"Error saving to db: {e}")

    # Schedule next reminder
    from app.routers.reminders import _reminders, _reminder_counter
    import app.routers.reminders as rem_mod
    rem = {
        "id": rem_mod._reminder_counter,
        "user_id": current_user.id,
        "cropId": crop_id,
        "crop_id": crop_id,
        "cropName": crop.crop,
        "title": "Photo Monitoring Reminder",
        "message": f"Your {crop.crop} crop is due for its next health check. Upload a new photo.",
        "reminderDate": (dt.date.today() + dt.timedelta(days=result["follow_up_days"])).isoformat(),
        "status": "PENDING",
        "created_at": dt.datetime.utcnow().isoformat(),
    }
    rem_mod._reminders.append(rem)
    rem_mod._reminder_counter += 1

    return _to_session_response(session_record, analysis_record)

def _to_session_response(s: dict, a: dict = None) -> MonitoringSessionOut:
    if not a and s.get("analysis_id"):
        a = next((x for x in _ai_analyses if x["id"] == s["analysis_id"]), None)
    
    summary = None
    if a:
        summary = AiAnalysisSummary(
            id=a["id"],
            healthStatus=a["healthStatus"],
            health_status=a["healthStatus"],
            disease=a.get("disease") or "Healthy (No Disease Detected)",
            confidence=a["confidence"],
            severity=a["severity"],
            severityPercentage=a.get("severityPercentage", 0.0),
            changeFromPrevious=a.get("changeFromPrevious") or "Stable",
            change_from_previous=a.get("changeFromPrevious") or "Stable",
            changeDescription=a.get("changeDescription"),
            analyzedAt=a["createdAt"],
            analyzed_at=a["createdAt"],
            # XAI fields
            gradcamUrl=a.get("gradcamUrl"),
            symptoms=a.get("symptoms"),
            possibleCauses=a.get("possibleCauses"),
            recommendations=a.get("recommendations"),
            riskBand=a.get("riskBand"),
            trajectory=a.get("trajectory"),
        )
    return MonitoringSessionOut(
        id=s["id"],
        cropId=s["cropId"],
        crop_id=s["cropId"],
        observationDate=s["observationDate"],
        observation_date=s["observationDate"],
        healthStatus=s["healthStatus"],
        health_status=s["healthStatus"],
        notes=s["notes"],
        imageUrls=s["imageUrls"],
        image_urls=s["imageUrls"],
        analysis=summary
    )

@router.get("/crop/{crop_id}", response_model=List[MonitoringSessionOut])
def get_sessions(
    crop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    crop = db.query(models.CropSelection).filter(
        models.CropSelection.id == crop_id, 
        models.CropSelection.user_id == current_user.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
        
    sessions = [s for s in _monitoring_sessions if s["cropId"] == crop_id]
    return [_to_session_response(s) for s in sorted(sessions, key=lambda x: x["observationDate"], reverse=True)]

@router.get("/session/{session_id}", response_model=MonitoringSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    s = next((x for x in _monitoring_sessions if x["id"] == session_id), None)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return _to_session_response(s)

@router.get("/analysis/{analysis_id}", response_model=AiAnalysisDetail)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    a = next((x for x in _ai_analyses if x["id"] == analysis_id), None)
    if not a:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return AiAnalysisDetail(**a)
