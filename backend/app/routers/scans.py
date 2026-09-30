import os
import uuid
import shutil
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app import models, schemas, auth
from app.services.severity import estimate_severity
from app.services.detection import predict_disease, generate_gradcam
from app.services.weather import fetch_weather, weather_favorability
from app.services.risk import growth_stage, trend_factor, compute_risk, classify_trajectory
from app.services.advisory import get_advisory
from app.services.preprocessing import preprocess_image

router = APIRouter(prefix="/scans", tags=["scans"])


@router.post("", response_model=schemas.ScanOut)
def create_scan(
    crop_selection_id: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    crop_selection = (
        db.query(models.CropSelection)
        .filter(models.CropSelection.id == crop_selection_id, models.CropSelection.user_id == current_user.id)
        .first()
    )
    if not crop_selection:
        raise HTTPException(status_code=404, detail="Crop selection not found")

    # 1. Save uploaded image
    ext = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    image_path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(image_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    # 2. Preprocessing: bilateral denoising + LAB-CLAHE illumination normalization
    prep_info = None
    preprocessed_path = None
    try:
        prep_info = preprocess_image(image_path, settings.UPLOAD_DIR)
        preprocessed_path = prep_info["preprocessed_path"]
    except Exception as prep_err:
        print(f"[preprocessing] Skipping preprocessing step: {prep_err}")
        preprocessed_path = None

    # Use preprocessed image for downstream analysis when available
    analysis_path = preprocessed_path if preprocessed_path else image_path

    # 3. Severity estimation (real, independent of classifier)
    severity = estimate_severity(analysis_path)

    # 4. Disease detection (real if a trained model is present, else labeled mock)
    prediction = predict_disease(analysis_path, crop_selection.crop, severity)

    # 5. Grad-CAM explainability heatmap (real conv gradients or calibrated saliency activation)
    gradcam_filename = f"gradcam_{filename}"
    gradcam_full_path = os.path.join(settings.UPLOAD_DIR, gradcam_filename)
    gradcam_path = generate_gradcam(analysis_path, prediction, gradcam_full_path)

    # 6. Weather context
    weather = fetch_weather(current_user.latitude, current_user.longitude)
    fav_score = weather_favorability(weather, prediction["disease"])

    # 6. Growth stage
    sowing_date = crop_selection.sowing_date.date() if hasattr(crop_selection.sowing_date, "date") else crop_selection.sowing_date
    stage_name, vulnerability = growth_stage(sowing_date, crop_selection.crop)

    # 7. Historical trend + trajectory
    last_scan = (
        db.query(models.Scan)
        .filter(models.Scan.crop_selection_id == crop_selection_id)
        .order_by(models.Scan.created_at.desc())
        .first()
    )
    previous_severity = last_scan.severity if last_scan else None
    trend = trend_factor(previous_severity, severity)
    trajectory = classify_trajectory(previous_severity, severity)

    # 8. Dynamic risk score
    risk_score, band = compute_risk(prediction["disease"], severity, fav_score, vulnerability, trend)

    # 9. Personalized advisory with escalation
    advisory = get_advisory(
        prediction["disease"],
        band,
        trajectory,
        previous_severity=previous_severity,
        current_severity=severity,
    )

    # 11. Persist
    scan = models.Scan(
        crop_selection_id=crop_selection_id,
        image_path=image_path,
        preprocessed_path=preprocessed_path,
        gradcam_path=gradcam_path,
        disease=prediction["disease"],
        confidence=prediction["confidence"],
        severity=severity,
        weather_humidity=weather["humidity"],
        weather_temp_c=weather["temp_c"],
        weather_rain_prob=weather["rain_prob"],
        weather_favorability=fav_score,
        growth_stage=stage_name,
        risk_score=risk_score,
        risk_band=band,
        advisory_treatment=advisory["treatment"],
        advisory_fertilizer=advisory["fertilizer"],
        advisory_irrigation=advisory["irrigation"],
        escalated=int(advisory["escalated"]),
        trajectory=trajectory,
        created_at=dt.datetime.utcnow(),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


@router.get("/history/{crop_selection_id}", response_model=list[schemas.ScanOut])
def scan_history(
    crop_selection_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    crop_selection = (
        db.query(models.CropSelection)
        .filter(models.CropSelection.id == crop_selection_id, models.CropSelection.user_id == current_user.id)
        .first()
    )
    if not crop_selection:
        raise HTTPException(status_code=404, detail="Crop selection not found")

    return (
        db.query(models.Scan)
        .filter(models.Scan.crop_selection_id == crop_selection_id)
        .order_by(models.Scan.created_at.asc())
        .all()
    )
