from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, auth
from app.services.outbreak import region_summaries, detect_outbreaks
from app.services.detection import get_model_metadata

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/regions")
def get_regions(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    return region_summaries(db)


@router.get("/outbreaks")
def get_outbreaks(
    window_days: int = 30,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    return detect_outbreaks(db, window_days=window_days)


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
