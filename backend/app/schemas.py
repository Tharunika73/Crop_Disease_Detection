import datetime as dt
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: str = "farmer"
    region: Optional[str] = None
    location: Optional[str] = None   # alias for region sent by frontend
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    soil_type: Optional[str] = None
    field_size: Optional[float] = None
    irrigation_type: Optional[str] = None
    farmName: Optional[str] = None   # ignored for now; farm created separately


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None   # maps to region
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    soil_type: Optional[str] = None
    field_size: Optional[float] = None
    irrigation_type: Optional[str] = None

class UserOut(BaseModel):
    id: int
    name: str
    full_name: Optional[str] = None
    email: str
    role: str
    region: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    soil_type: Optional[str] = None
    field_size: Optional[float] = None
    irrigation_type: Optional[str] = None
    access_token: Optional[str] = None
    token: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token: Optional[str] = None
    token_type: str = "bearer"
    id: Optional[int] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    region: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    soil_type: Optional[str] = None
    field_size: Optional[float] = None
    irrigation_type: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CropSelectionCreate(BaseModel):
    crop: Optional[str] = None
    cropName: Optional[str] = None
    crop_name: Optional[str] = None
    variety: Optional[str] = None
    sowing_date: Optional[dt.date] = None
    sowingDate: Optional[str] = None
    growth_stage: Optional[str] = None
    growthStage: Optional[str] = None
    fieldId: Optional[int] = None
    field_id: Optional[int] = None


class CropSelectionOut(BaseModel):
    id: int
    crop: str
    cropName: Optional[str] = None
    crop_name: Optional[str] = None
    variety: Optional[str] = None
    sowing_date: dt.date
    sowingDate: Optional[str] = None
    growth_stage: str
    growthStage: Optional[str] = None
    field_id: Optional[int] = None
    fieldId: Optional[int] = None
    fieldName: Optional[str] = None
    cropAgeDays: Optional[int] = 0
    status: Optional[str] = "HEALTHY"

    class Config:
        from_attributes = True


class ScanOut(BaseModel):
    id: int
    disease: str
    confidence: float
    severity: float
    weather_humidity: Optional[float]
    weather_temp_c: Optional[float]
    weather_rain_prob: Optional[float]
    growth_stage: Optional[str]
    risk_score: float
    risk_band: str
    advisory_treatment: Optional[str]
    advisory_fertilizer: Optional[str]
    advisory_irrigation: Optional[str]
    escalated: int
    trajectory: Optional[str]
    image_path: str
    preprocessed_path: Optional[str]
    gradcam_path: Optional[str]
    created_at: dt.datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    scan_id: int
    message: str


class ChatResponse(BaseModel):
    reply: str


class RegionSummary(BaseModel):
    region: str
    total_scans: int
    avg_severity: float
    top_disease: Optional[str]
    risk_band_counts: dict


class OutbreakAlert(BaseModel):
    region: str
    disease: str
    case_count: int
    threshold: int

class ModelStatsOut(BaseModel):
    architecture: str
    total_scans: int
    avg_latency_ms: float
    accuracy: float
    classes: list[str]

    class Config:
        from_attributes = True


