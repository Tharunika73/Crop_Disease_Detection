"""
Farms & Fields router — provides the /farms and /fields endpoints
that the frontend api.js client expects.
"""
import datetime as dt
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models, auth

router = APIRouter(tags=["farms"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class FarmCreate(BaseModel):
    farmName: Optional[str] = None
    farm_name: Optional[str] = None
    name: Optional[str] = None
    location: Optional[str] = None
    area: Optional[float] = None
    total_area: Optional[float] = None
    areaUnit: Optional[str] = "Acres"
    size: Optional[float] = None
    soil_type: Optional[str] = None
    climate_zone: Optional[str] = None

class FarmOut(BaseModel):
    id: int
    name: str
    farmName: Optional[str] = None
    farm_name: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = ""
    area: Optional[float] = None
    total_area: Optional[float] = None
    areaUnit: Optional[str] = "Acres"
    area_unit: Optional[str] = "Acres"
    size: Optional[float] = None
    soil_type: Optional[str] = None
    climate_zone: Optional[str] = None
    fieldCount: int = 0
    cropCount: int = 0
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class FieldCreate(BaseModel):
    farm_id: Optional[int] = None
    farmId: Optional[int] = None
    name: Optional[str] = None
    fieldName: Optional[str] = None
    field_name: Optional[str] = None
    area: Optional[float] = None
    area_unit: Optional[str] = "Acres"
    areaUnit: Optional[str] = "Acres"
    crop_type: Optional[str] = None
    soil_type: Optional[str] = None
    soilType: Optional[str] = None
    irrigation_method: Optional[str] = None
    irrigationMethod: Optional[str] = None
    water_source: Optional[str] = None
    sunlight_condition: Optional[str] = None
    description: Optional[str] = None

class FieldOut(BaseModel):
    id: int
    farm_id: int
    farmId: Optional[int] = None
    name: str
    fieldName: Optional[str] = None
    field_name: Optional[str] = None
    area: Optional[float] = None
    area_unit: Optional[str] = "Acres"
    areaUnit: Optional[str] = "Acres"
    crop_type: Optional[str] = None
    soil_type: Optional[str] = None
    soilType: Optional[str] = None
    irrigation_method: Optional[str] = None
    irrigationMethod: Optional[str] = None
    water_source: Optional[str] = None
    sunlight_condition: Optional[str] = None
    description: Optional[str] = None


# ─── In-memory store (replace with DB models when ready) ────────────────────

_farms: List[dict] = []
_fields: List[dict] = []
_farm_counter = 1
_field_counter = 1


def _to_farm_out(f: dict, db: Optional[Session] = None) -> FarmOut:
    f_id = f["id"]
    field_cnt = sum(1 for fld in _fields if fld.get("farm_id") == f_id)
    crop_cnt = 0
    if db:
        crop_cnt = db.query(models.CropSelection).filter(models.CropSelection.user_id == f.get("owner_id")).count()
    area_val = f.get("area") or f.get("size")
    return FarmOut(
        id=f["id"],
        name=f["name"],
        farmName=f.get("farmName") or f["name"],
        farm_name=f.get("farm_name") or f.get("farmName") or f["name"],
        location=f.get("location"),
        state=f.get("state") or "",
        area=area_val,
        total_area=f.get("total_area") or area_val,
        areaUnit=f.get("areaUnit") or f.get("area_unit") or "Acres",
        area_unit=f.get("area_unit") or f.get("areaUnit") or "Acres",
        size=area_val,
        soil_type=f.get("soil_type"),
        climate_zone=f.get("climate_zone"),
        fieldCount=field_cnt,
        cropCount=crop_cnt,
        created_at=f.get("created_at"),
    )


def _to_field_out(fld: dict) -> FieldOut:
    f_name = fld["name"]
    return FieldOut(
        id=fld["id"],
        farm_id=fld["farm_id"],
        farmId=fld["farm_id"],
        name=f_name,
        fieldName=f_name,
        field_name=f_name,
        area=fld.get("area"),
        area_unit=fld.get("area_unit") or fld.get("areaUnit") or "Acres",
        areaUnit=fld.get("areaUnit") or fld.get("area_unit") or "Acres",
        crop_type=fld.get("crop_type"),
        soil_type=fld.get("soil_type"),
        soilType=fld.get("soil_type"),
        irrigation_method=fld.get("irrigation_method"),
        irrigationMethod=fld.get("irrigation_method"),
        water_source=fld.get("water_source"),
        sunlight_condition=fld.get("sunlight_condition"),
        description=fld.get("description"),
    )


# ─── Farms ──────────────────────────────────────────────────────────────────

@router.get("/farms", response_model=List[FarmOut])
def list_farms(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    user_farms = [f for f in _farms if f.get("owner_id") == current_user.id]
    return [_to_farm_out(f, db) for f in user_farms]


@router.post("/farms", response_model=FarmOut, status_code=201)
def create_farm(
    payload: FarmCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    global _farm_counter
    name = payload.farmName or payload.farm_name or payload.name or "My Farm"
    area_val = payload.area if payload.area is not None else (payload.total_area if payload.total_area is not None else payload.size)
    farm = {
        "id": _farm_counter,
        "owner_id": current_user.id,
        "name": name,
        "farmName": name,
        "location": payload.location,
        "area": area_val,
        "areaUnit": payload.areaUnit or "Acres",
        "size": area_val,
        "soil_type": payload.soil_type or current_user.soil_type,
        "climate_zone": payload.climate_zone,
        "created_at": dt.datetime.utcnow().isoformat(),
    }
    _farms.append(farm)
    _farm_counter += 1
    return _to_farm_out(farm, db)


@router.get("/farms/{farm_id}", response_model=FarmOut)
def get_farm(farm_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    farm = next((f for f in _farms if f["id"] == farm_id and f["owner_id"] == current_user.id), None)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return _to_farm_out(farm, db)


# ─── Fields ─────────────────────────────────────────────────────────────────

@router.get("/fields/farm/{farm_id}", response_model=List[FieldOut])
def list_fields(farm_id: int, current_user: models.User = Depends(auth.get_current_user)):
    return [_to_field_out(f) for f in _fields if f.get("farm_id") == farm_id]


@router.post("/fields", response_model=FieldOut, status_code=201)
def create_field(
    payload: FieldCreate,
    current_user: models.User = Depends(auth.get_current_user),
):
    global _field_counter
    farm_id = payload.farm_id or payload.farmId
    if not farm_id:
        raise HTTPException(status_code=400, detail="farm_id is required")
    # Resolve name from 'name', 'fieldName', or 'field_name'
    name = payload.name or payload.fieldName or payload.field_name
    if not name:
        raise HTTPException(status_code=400, detail="Field name is required")
    field = {
        "id": _field_counter,
        "farm_id": farm_id,
        "name": name,
        "fieldName": name,
        "field_name": name,
        "area": payload.area,
        "area_unit": payload.area_unit or payload.areaUnit or "Acres",
        "crop_type": payload.crop_type,
        "soil_type": payload.soil_type or payload.soilType,
        "irrigation_method": payload.irrigation_method or payload.irrigationMethod,
        "water_source": payload.water_source,
        "sunlight_condition": payload.sunlight_condition,
        "description": payload.description,
    }
    _fields.append(field)
    _field_counter += 1
    return _to_field_out(field)
