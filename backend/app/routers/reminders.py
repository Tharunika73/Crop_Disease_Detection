import datetime as dt
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/reminders", tags=["reminders"])


class ReminderCreate(BaseModel):
    cropId: Optional[int] = None
    crop_id: Optional[int] = None
    cropName: Optional[str] = None
    title: str
    message: Optional[str] = None
    reminderDate: Optional[str] = None
    status: Optional[str] = "PENDING"


class ReminderStatusUpdate(BaseModel):
    status: str = "COMPLETED"


class ReminderOut(BaseModel):
    id: int
    cropId: Optional[int] = None
    crop_id: Optional[int] = None
    cropName: Optional[str] = None
    title: str
    message: Optional[str] = None
    reminderDate: str
    status: str = "PENDING"
    created_at: Optional[str] = None


_reminders: List[dict] = []
_reminder_counter = 1


def _to_reminder_out(r: dict) -> ReminderOut:
    return ReminderOut(
        id=r["id"],
        cropId=r.get("cropId"),
        crop_id=r.get("cropId"),
        cropName=r.get("cropName") or "Crop",
        title=r.get("title", ""),
        message=r.get("message", ""),
        reminderDate=r.get("reminderDate") or dt.date.today().isoformat(),
        status=r.get("status", "PENDING"),
        created_at=r.get("created_at"),
    )


@router.get("", response_model=List[ReminderOut])
def list_pending_reminders(
    current_user: models.User = Depends(auth.get_current_user),
):
    user_rems = [
        r for r in _reminders
        if r.get("user_id") == current_user.id and r.get("status") == "PENDING"
    ]
    return [_to_reminder_out(r) for r in user_rems]


@router.get("/crop/{crop_id}", response_model=List[ReminderOut])
def list_reminders_by_crop(
    crop_id: int,
    current_user: models.User = Depends(auth.get_current_user),
):
    rems = [
        r for r in _reminders
        if r.get("user_id") == current_user.id and (r.get("cropId") == crop_id or r.get("crop_id") == crop_id)
    ]
    return [_to_reminder_out(r) for r in rems]


@router.post("", response_model=ReminderOut, status_code=201)
def create_reminder(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    global _reminder_counter
    c_id = payload.cropId or payload.crop_id
    c_name = payload.cropName
    if c_id and not c_name:
        crop = db.query(models.CropSelection).filter(models.CropSelection.id == c_id).first()
        if crop:
            c_name = crop.crop

    rem = {
        "id": _reminder_counter,
        "user_id": current_user.id,
        "cropId": c_id,
        "crop_id": c_id,
        "cropName": c_name or "Crop",
        "title": payload.title,
        "message": payload.message or "",
        "reminderDate": payload.reminderDate or (dt.date.today() + dt.timedelta(days=3)).isoformat(),
        "status": payload.status or "PENDING",
        "created_at": dt.datetime.utcnow().isoformat(),
    }
    _reminders.append(rem)
    _reminder_counter += 1
    return _to_reminder_out(rem)


@router.put("/{reminder_id}/status", response_model=ReminderOut)
def update_reminder_status(
    reminder_id: int,
    payload: ReminderStatusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
):
    rem = next((r for r in _reminders if r["id"] == reminder_id and r["user_id"] == current_user.id), None)
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found")
    rem["status"] = payload.status
    return _to_reminder_out(rem)
