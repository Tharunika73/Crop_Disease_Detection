from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    region = payload.region or payload.location
    display_name = payload.name or payload.full_name or payload.email.split("@")[0]
    user = models.User(
        name=display_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=auth.hash_password(payload.password),
        role=models.Role.admin if payload.role == "admin" else models.Role.farmer,
        region=region,
        latitude=payload.latitude,
        longitude=payload.longitude,
        soil_type=payload.soil_type,
        field_size=payload.field_size,
        irrigation_type=payload.irrigation_type,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id), "role": user.role.value if hasattr(user.role, "value") else str(user.role)})

    # Auto-create initial farm if farmName supplied
    if payload.farmName:
        try:
            import datetime as _dt
            from app.routers.farms import _farms
            import app.routers.farms as farms_mod
            farm = {
                "id": farms_mod._farm_counter,
                "owner_id": user.id,
                "name": payload.farmName,
                "farmName": payload.farmName,
                "location": region or "Tamil Nadu",
                "state": "Tamil Nadu",
                "area": payload.field_size or 5.0,
                "areaUnit": "Acres",
                "size": payload.field_size or 5.0,
                "soil_type": payload.soil_type or "Loamy",
                "created_at": _dt.datetime.utcnow().isoformat(),
            }
            farms_mod._farms.append(farm)
            farms_mod._farm_counter += 1
        except Exception:
            pass

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "region": user.region,
        "location": user.region,
        "phone": user.phone,
        "latitude": user.latitude,
        "longitude": user.longitude,
        "soil_type": user.soil_type,
        "field_size": user.field_size,
        "irrigation_type": user.irrigation_type,
        "access_token": token,
        "token": token,
    }


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = auth.create_access_token({"sub": str(user.id), "role": role_val})
    return {
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": role_val,
        "location": user.region,
        "region": user.region,
        "phone": user.phone,
        "latitude": user.latitude,
        "longitude": user.longitude,
        "soil_type": user.soil_type,
        "field_size": user.field_size,
        "irrigation_type": user.irrigation_type,
    }


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Update fields if provided
    data = payload.dict(exclude_unset=True)
    if "location" in data:
        current_user.region = data.pop("location")
    for field, value in data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
