import datetime as dt
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services.risk import growth_stage
from app.routers.farms import _fields

router = APIRouter(prefix="/crops", tags=["crops"])

# Map crop_selection_id -> field_id
_crop_fields = {}
_crop_statuses = {}


def _to_crop_out(s: models.CropSelection) -> schemas.CropSelectionOut:
    s_date = s.sowing_date.date() if hasattr(s.sowing_date, "date") else s.sowing_date
    try:
        stage_name, _ = growth_stage(s_date, s.crop)
    except Exception:
        stage_name = "Vegetative"
    today = dt.date.today()
    age_days = max(0, (today - s_date).days)

    f_id = _crop_fields.get(s.id)
    f_name = None
    if f_id:
        fld = next((f for f in _fields if f.get("id") == f_id), None)
        if fld:
            f_name = fld.get("name")

    return schemas.CropSelectionOut(
        id=s.id,
        crop=s.crop,
        cropName=s.crop,
        crop_name=s.crop,
        variety=s.variety or "General",
        sowing_date=s_date,
        sowingDate=s_date.isoformat(),
        growth_stage=stage_name,
        growthStage=stage_name,
        field_id=f_id,
        fieldId=f_id,
        fieldName=f_name,
        cropAgeDays=age_days,
    )


@router.post("", response_model=schemas.CropSelectionOut, status_code=201)
def create_crop_selection(
    payload: schemas.CropSelectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    crop_name = payload.crop or payload.cropName or payload.crop_name
    if not crop_name:
        raise HTTPException(status_code=400, detail="Crop name is required")

    s_date = payload.sowing_date
    if not s_date and payload.sowingDate:
        try:
            s_date = dt.date.fromisoformat(payload.sowingDate.split("T")[0])
        except Exception:
            s_date = dt.date.today()
    if not s_date:
        s_date = dt.date.today()

    crop_selection = models.CropSelection(
        user_id=current_user.id,
        crop=crop_name,
        variety=payload.variety,
        sowing_date=dt.datetime.combine(s_date, dt.time.min),
    )
    db.add(crop_selection)
    db.commit()
    db.refresh(crop_selection)

    f_id = payload.fieldId or payload.field_id
    if f_id:
        _crop_fields[crop_selection.id] = f_id

    return _to_crop_out(crop_selection)


@router.get("", response_model=List[schemas.CropSelectionOut])
def list_crop_selections(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    selections = (
        db.query(models.CropSelection)
        .filter(models.CropSelection.user_id == current_user.id)
        .all()
    )
    return [_to_crop_out(s) for s in selections]


@router.get("/{crop_id}", response_model=schemas.CropSelectionOut)
def get_crop(
    crop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    s = (
        db.query(models.CropSelection)
        .filter(models.CropSelection.id == crop_id, models.CropSelection.user_id == current_user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Crop not found")
    return _to_crop_out(s)


@router.get("/field/{field_id}", response_model=List[schemas.CropSelectionOut])
def list_crops_by_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    selections = (
        db.query(models.CropSelection)
        .filter(models.CropSelection.user_id == current_user.id)
        .all()
    )
    matching = [s for s in selections if _crop_fields.get(s.id) == field_id]
    return [_to_crop_out(s) for s in matching]


@router.put("/{crop_id}", response_model=schemas.CropSelectionOut)
def update_crop(
    crop_id: int,
    payload: schemas.CropSelectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    s = (
        db.query(models.CropSelection)
        .filter(models.CropSelection.id == crop_id, models.CropSelection.user_id == current_user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Crop not found")

    if payload.crop or payload.cropName:
        s.crop = payload.crop or payload.cropName
    if payload.variety is not None:
        s.variety = payload.variety
    if payload.sowing_date or payload.sowingDate:
        s_date = payload.sowing_date
        if not s_date and payload.sowingDate:
            try:
                s_date = dt.date.fromisoformat(payload.sowingDate.split("T")[0])
            except Exception:
                pass
        if s_date:
            s.sowing_date = dt.datetime.combine(s_date, dt.time.min)

    f_id = payload.fieldId or payload.field_id
    if f_id is not None:
        _crop_fields[s.id] = f_id

    db.add(s)
    db.commit()
    db.refresh(s)
    return _to_crop_out(s)


@router.delete("/{crop_id}")
def delete_crop(
    crop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    s = (
        db.query(models.CropSelection)
        .filter(models.CropSelection.id == crop_id, models.CropSelection.user_id == current_user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Crop not found")
    db.delete(s)
    db.commit()
    _crop_fields.pop(crop_id, None)
    return {"message": "Crop deleted successfully"}
