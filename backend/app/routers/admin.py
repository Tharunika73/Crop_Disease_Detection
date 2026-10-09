"""
Admin Router — Provides admin-only endpoints for:
  - Region / area disease summaries and heatmaps
  - Outbreak / new disease alerts
  - User management (farmer list with location & crop data)
  - AI model metadata & training trigger
  - Dataset statistics
"""
import os
import subprocess
import datetime as dt
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, auth
from app.services.outbreak import region_summaries, detect_outbreaks, detect_new_diseases
from app.services.detection import get_model_metadata
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Region / Area Disease Heatmap ─────────────────────────────────────────

@router.get("/regions")
def get_regions(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Returns per-region disease summaries for the heatmap / map view."""
    return region_summaries(db)


@router.get("/regions/{region}/diseases")
def get_region_diseases(
    region: str,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Returns detailed disease breakdown for a specific region."""
    rows = (
        db.query(
            models.Scan.disease.label("disease"),
            func.count(models.Scan.id).label("count"),
            func.avg(models.Scan.severity).label("avg_severity"),
            func.max(models.Scan.created_at).label("last_seen"),
        )
        .join(models.CropSelection, models.CropSelection.id == models.Scan.crop_selection_id)
        .join(models.User, models.User.id == models.CropSelection.user_id)
        .filter(models.User.region == region)
        .group_by(models.Scan.disease)
        .order_by(func.count(models.Scan.id).desc())
        .all()
    )
    total = sum(r.count for r in rows)
    return {
        "region": region,
        "total_scans": total,
        "diseases": [
            {
                "disease": r.disease,
                "count": r.count,
                "percentage": round(r.count / total * 100, 1) if total > 0 else 0,
                "avg_severity": round(r.avg_severity or 0, 1),
                "last_seen": r.last_seen.isoformat() if r.last_seen else None,
            }
            for r in rows
        ],
    }


# ─── Outbreak & New Disease Alerts ─────────────────────────────────────────

@router.get("/outbreaks")
def get_outbreaks(
    window_days: int = 30,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Returns active outbreak alerts based on case threshold within window_days."""
    return detect_outbreaks(db, window_days=window_days)


@router.get("/new-diseases")
def get_new_diseases(
    window_days: int = 14,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Returns diseases newly detected in regions within the past window_days."""
    return detect_new_diseases(db, window_days=window_days)


@router.get("/alerts")
def get_all_alerts(
    window_days: int = 30,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Combined endpoint returning both outbreaks and new disease alerts."""
    outbreaks = detect_outbreaks(db, window_days=window_days)
    new_diseases = detect_new_diseases(db, window_days=window_days)
    return {
        "outbreaks": outbreaks,
        "new_diseases": new_diseases,
        "total_alerts": len(outbreaks) + len(new_diseases),
        "generated_at": dt.datetime.utcnow().isoformat(),
    }


# ─── Farmer / User Management ──────────────────────────────────────────────

@router.get("/farmers")
def list_farmers(
    region: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Returns all farmers with their crop/scan counts, optionally filtered by region."""
    query = db.query(models.User).filter(models.User.role == models.Role.farmer)
    if region:
        query = query.filter(models.User.region == region)
    farmers = query.order_by(models.User.created_at.desc()).all()

    result = []
    for f in farmers:
        crop_count = db.query(func.count(models.CropSelection.id)).filter(
            models.CropSelection.user_id == f.id
        ).scalar() or 0
        scan_count = (
            db.query(func.count(models.Scan.id))
            .join(models.CropSelection, models.CropSelection.id == models.Scan.crop_selection_id)
            .filter(models.CropSelection.user_id == f.id)
            .scalar() or 0
        )
        last_scan = (
            db.query(func.max(models.Scan.created_at))
            .join(models.CropSelection, models.CropSelection.id == models.Scan.crop_selection_id)
            .filter(models.CropSelection.user_id == f.id)
            .scalar()
        )
        result.append({
            "id": f.id,
            "name": f.name,
            "email": f.email,
            "phone": f.phone,
            "region": f.region,
            "latitude": f.latitude,
            "longitude": f.longitude,
            "soil_type": f.soil_type,
            "field_size": f.field_size,
            "irrigation_type": f.irrigation_type,
            "crop_count": crop_count,
            "scan_count": scan_count,
            "last_scan": last_scan.isoformat() if last_scan else None,
            "joined_at": f.created_at.isoformat() if f.created_at else None,
        })
    return result


@router.get("/farmers/{farmer_id}/crops")
def get_farmer_crops(
    farmer_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Returns crops and latest scan results for a specific farmer."""
    farmer = db.query(models.User).filter(models.User.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    crops = db.query(models.CropSelection).filter(models.CropSelection.user_id == farmer_id).all()
    result = []
    for crop in crops:
        latest_scan = (
            db.query(models.Scan)
            .filter(models.Scan.crop_selection_id == crop.id)
            .order_by(models.Scan.created_at.desc())
            .first()
        )
        result.append({
            "crop_id": crop.id,
            "crop": crop.crop,
            "variety": crop.variety,
            "sowing_date": crop.sowing_date.isoformat() if crop.sowing_date else None,
            "latest_scan": {
                "disease": latest_scan.disease,
                "severity": latest_scan.severity,
                "risk_band": latest_scan.risk_band,
                "created_at": latest_scan.created_at.isoformat(),
            } if latest_scan else None,
        })
    return {"farmer": {"id": farmer.id, "name": farmer.name, "region": farmer.region}, "crops": result}


# ─── Dashboard Summary / Statistics ────────────────────────────────────────

@router.get("/summary")
def get_admin_summary(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Returns global platform statistics for the admin dashboard overview."""
    total_farmers = db.query(func.count(models.User.id)).filter(
        models.User.role == models.Role.farmer
    ).scalar() or 0
    total_scans = db.query(func.count(models.Scan.id)).scalar() or 0
    total_crops = db.query(func.count(models.CropSelection.id)).scalar() or 0
    outbreaks = detect_outbreaks(db, window_days=30)
    new_diseases = detect_new_diseases(db, window_days=14)
    top_diseases = (
        db.query(
            models.Scan.disease.label("disease"),
            func.count(models.Scan.id).label("count"),
        )
        .filter(models.Scan.disease != "Healthy")
        .group_by(models.Scan.disease)
        .order_by(func.count(models.Scan.id).desc())
        .limit(5)
        .all()
    )
    affected_regions = (
        db.query(func.count(func.distinct(models.User.region)))
        .join(models.CropSelection, models.CropSelection.user_id == models.User.id)
        .join(models.Scan, models.Scan.crop_selection_id == models.CropSelection.id)
        .filter(models.User.region.isnot(None), models.Scan.disease != "Healthy")
        .scalar() or 0
    )
    scan_trend = []
    for i in range(6, -1, -1):
        day = dt.datetime.utcnow().date() - dt.timedelta(days=i)
        start = dt.datetime.combine(day, dt.time.min)
        end = dt.datetime.combine(day, dt.time.max)
        count = db.query(func.count(models.Scan.id)).filter(
            models.Scan.created_at >= start, models.Scan.created_at <= end
        ).scalar() or 0
        scan_trend.append({"date": day.strftime("%b %d"), "scans": count})

    return {
        "total_farmers": total_farmers,
        "total_scans": total_scans,
        "total_crops": total_crops,
        "active_outbreaks": len(outbreaks),
        "new_disease_alerts": len(new_diseases),
        "affected_regions": affected_regions,
        "top_diseases": [{"disease": r.disease, "count": r.count} for r in top_diseases],
        "scan_trend": scan_trend,
    }


# ─── AI Model Info & Training ───────────────────────────────────────────────

@router.get("/model-info")
def get_model_info(
    _admin: models.User = Depends(auth.require_admin),
):
    return get_model_metadata()


@router.get("/model-stats")
def get_model_stats(
    _admin: models.User = Depends(auth.require_admin),
):
    return get_model_metadata()


@router.post("/train-model")
def trigger_model_training(
    background_tasks: BackgroundTasks,
    arch: str = Query(default="mobilenetv2", enum=["mobilenetv2", "resnet50", "efficientnetb0"]),
    epochs: int = Query(default=20, ge=5, le=100),
    data_dir: str = Query(default=None),
    _admin: models.User = Depends(auth.require_admin),
):
    """Triggers AI model training in the background using the Dataset folder."""
    dataset_path = data_dir
    if not dataset_path:
        for candidate in [
            "../Dataset",
            "./Dataset",
            os.path.join(os.path.dirname(__file__), "../../../Dataset"),
        ]:
            candidate = os.path.abspath(candidate)
            if os.path.isdir(candidate):
                dataset_path = candidate
                break

    if not dataset_path or not os.path.isdir(dataset_path):
        raise HTTPException(
            status_code=400,
            detail=f"Dataset directory not found. Provide data_dir query param or place Dataset/ at project root.",
        )

    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ml"))
    train_script = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ml/train_model.py"))

    def run_training():
        try:
            cmd = [
                "python", train_script,
                "--data_dir", dataset_path,
                "--output_dir", output_dir,
                "--arch", arch,
                "--epochs", str(epochs),
                "--fine_tune_epochs", "10",
                "--batch_size", "32",
            ]
            print(f"[Admin] Starting training: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=7200)
            print(f"[Admin] Training stdout:\n{result.stdout}")
            if result.returncode != 0:
                print(f"[Admin] Training stderr:\n{result.stderr}")
            else:
                print("[Admin] Training completed successfully!")
        except subprocess.TimeoutExpired:
            print("[Admin] Training timed out after 2 hours!")
        except Exception as e:
            print(f"[Admin] Training error: {e}")

    background_tasks.add_task(run_training)
    return {
        "status": "training_started",
        "message": f"Model training started in background with {arch} for {epochs} epochs.",
        "dataset": dataset_path,
        "output_dir": output_dir,
        "arch": arch,
        "epochs": epochs,
        "note": "Training runs asynchronously. Reload model-info after completion to see updated stats.",
    }


@router.get("/dataset-stats")
def get_dataset_stats(
    _admin: models.User = Depends(auth.require_admin),
):
    """Returns statistics about the available training dataset."""
    dataset_path = None
    for candidate in [
        "../Dataset",
        "./Dataset",
        os.path.join(os.path.dirname(__file__), "../../../Dataset"),
    ]:
        candidate = os.path.abspath(candidate)
        if os.path.isdir(candidate):
            dataset_path = candidate
            break

    if not dataset_path:
        return {"available": False, "message": "Dataset directory not found"}

    classes = []
    total_images = 0
    for class_name in sorted(os.listdir(dataset_path)):
        class_dir = os.path.join(dataset_path, class_name)
        if os.path.isdir(class_dir):
            images = [f for f in os.listdir(class_dir)
                      if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp"))]
            count = len(images)
            total_images += count
            parts = class_name.replace("(", "").replace(")", "").split("_")
            crop = parts[0] if parts else class_name
            disease = " ".join(parts[1:]) if len(parts) > 1 else "Unknown"
            classes.append({
                "class_name": class_name,
                "crop": crop,
                "disease": disease.replace("_", " "),
                "image_count": count,
            })

    return {
        "available": True,
        "dataset_path": dataset_path,
        "total_classes": len(classes),
        "total_images": total_images,
        "classes": classes,
    }
