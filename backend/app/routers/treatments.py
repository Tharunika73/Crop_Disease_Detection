import datetime as dt
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/treatments", tags=["treatments"])

class TreatmentCreate(BaseModel):
    cropId: Optional[int] = None
    crop_id: Optional[int] = None
    treatmentType: Optional[str] = "CHEMICAL"
    treatment_type: Optional[str] = None
    treatmentDescription: Optional[str] = None
    treatment_description: Optional[str] = None
    productName: Optional[str] = None
    product_name: Optional[str] = None
    applicationDate: Optional[str] = None
    application_date: Optional[str] = None
    applied_date: Optional[str] = None
    dosage: Optional[str] = None
    application_method: Optional[str] = None
    followUpDate: Optional[str] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None

class TreatmentUpdate(BaseModel):
    result: Optional[str] = None
    notes: Optional[str] = None
    followUpDate: Optional[str] = None
    follow_up_date: Optional[str] = None

class TreatmentOut(BaseModel):
    id: int
    cropId: int
    crop_id: int
    cropName: Optional[str] = None
    treatmentType: str
    treatment_type: Optional[str] = None
    treatmentDescription: Optional[str] = None
    treatment_description: Optional[str] = None
    productName: Optional[str] = None
    product_name: Optional[str] = None
    applicationDate: str
    application_date: Optional[str] = None
    dosage: Optional[str] = None
    application_method: Optional[str] = None
    followUpDate: Optional[str] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None
    result: str = "APPLIED"
    created_at: Optional[str] = None

_treatments: List[dict] = []
_treatment_counter = 1

def _to_treatment_out(t: dict) -> TreatmentOut:
    prod = t.get("productName") or t.get("product_name")
    app_date = t.get("applicationDate") or t.get("application_date") or t.get("applied_date") or dt.date.today().isoformat()
    ttype = t.get("treatmentType") or t.get("treatment_type") or "CHEMICAL"
    return TreatmentOut(
        id=t["id"],
        cropId=t["cropId"],
        crop_id=t["cropId"],
        cropName=t.get("cropName") or "Crop",
        treatmentType=ttype,
        treatment_type=ttype,
        treatmentDescription=t.get("treatmentDescription") or t.get("treatment_description"),
        treatment_description=t.get("treatmentDescription") or t.get("treatment_description"),
        productName=prod,
        product_name=prod,
        applicationDate=app_date,
        application_date=app_date,
        dosage=t.get("dosage"),
        application_method=t.get("application_method"),
        followUpDate=t.get("followUpDate") or t.get("follow_up_date"),
        follow_up_date=t.get("followUpDate") or t.get("follow_up_date"),
        notes=t.get("notes"),
        result=t.get("result", "APPLIED"),
        created_at=t.get("created_at"),
    )

@router.get("/crop/{crop_id}", response_model=List[TreatmentOut])
def list_treatments(
    crop_id: int,
    current_user: models.User = Depends(auth.get_current_user),
):
    rems = [
        t for t in _treatments
        if t.get("user_id") == current_user.id and (t.get("cropId") == crop_id or t.get("crop_id") == crop_id)
    ]
    return [_to_treatment_out(t) for t in sorted(rems, key=lambda x: x.get("created_at", ""), reverse=True)]

@router.post("", response_model=TreatmentOut, status_code=201)
def create_treatment(
    payload: TreatmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    global _treatment_counter
    c_id = payload.cropId or payload.crop_id
    if not c_id:
        raise HTTPException(status_code=400, detail="cropId is required")

    crop = db.query(models.CropSelection).filter(models.CropSelection.id == c_id).first()
    c_name = crop.crop if crop else "Crop"

    prod = payload.productName or payload.product_name
    app_date = payload.applicationDate or payload.application_date or payload.applied_date or dt.date.today().isoformat()
    ttype = payload.treatmentType or payload.treatment_type or "CHEMICAL"
    t = {
        "id": _treatment_counter,
        "user_id": current_user.id,
        "cropId": c_id,
        "crop_id": c_id,
        "cropName": c_name,
        "treatmentType": ttype,
        "treatment_type": ttype,
        "treatmentDescription": payload.treatmentDescription or payload.treatment_description,
        "treatment_description": payload.treatmentDescription or payload.treatment_description,
        "productName": prod,
        "product_name": prod,
        "applicationDate": app_date,
        "application_date": app_date,
        "dosage": payload.dosage,
        "application_method": payload.application_method,
        "followUpDate": payload.followUpDate or payload.follow_up_date,
        "notes": payload.notes,
        "result": "APPLIED",
        "created_at": dt.datetime.utcnow().isoformat(),
    }
    _treatments.append(t)
    _treatment_counter += 1
    
    # Schedule a reminder if followUpDate is provided
    if t["followUpDate"]:
        from app.routers.reminders import _reminders, _reminder_counter
        import app.routers.reminders as rem_mod
        rem = {
            "id": rem_mod._reminder_counter,
            "user_id": current_user.id,
            "cropId": c_id,
            "crop_id": c_id,
            "cropName": c_name,
            "title": f"Follow-up for {t['treatmentType']} Treatment",
            "message": f"Check efficacy of {t['productName'] or 'treatment'} applied on {t['applicationDate']}.",
            "reminderDate": t["followUpDate"],
            "status": "PENDING",
            "created_at": dt.datetime.utcnow().isoformat(),
        }
        rem_mod._reminders.append(rem)
        rem_mod._reminder_counter += 1

    return _to_treatment_out(t)

@router.put("/{treatment_id}", response_model=TreatmentOut)
def update_treatment(
    treatment_id: int,
    payload: TreatmentUpdate,
    current_user: models.User = Depends(auth.get_current_user),
):
    t = next((t for t in _treatments if t["id"] == treatment_id and t["user_id"] == current_user.id), None)
    if not t:
        raise HTTPException(status_code=404, detail="Treatment not found")
    
    if payload.result is not None:
        t["result"] = payload.result
    if payload.notes is not None:
        t["notes"] = payload.notes
    
    f_date = payload.followUpDate or payload.follow_up_date
    if f_date is not None:
        t["followUpDate"] = f_date

    return _to_treatment_out(t)

@router.delete("/{treatment_id}")
def delete_treatment(
    treatment_id: int,
    current_user: models.User = Depends(auth.get_current_user),
):
    global _treatments
    t = next((t for t in _treatments if t["id"] == treatment_id and t["user_id"] == current_user.id), None)
    if not t:
        raise HTTPException(status_code=404, detail="Treatment not found")
    _treatments = [x for x in _treatments if x["id"] != treatment_id]
    return {"message": "Treatment deleted successfully"}
