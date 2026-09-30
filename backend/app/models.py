import enum
import datetime as dt
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class Role(str, enum.Enum):
    farmer = "farmer"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(Role), default=Role.farmer, nullable=False)

    region = Column(String, index=True, nullable=True)   # e.g. district/city, used for admin aggregation
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    soil_type = Column(String, nullable=True)
    field_size = Column(Float, nullable=True)
    irrigation_type = Column(String, nullable=True)

    created_at = Column(DateTime, default=dt.datetime.utcnow)

    @property
    def location(self):
        return self.region

    @location.setter
    def location(self, val):
        self.region = val

    @property
    def full_name(self):
        return self.name

    @full_name.setter
    def full_name(self, val):
        self.name = val

    crops = relationship("CropSelection", back_populates="owner", cascade="all, delete-orphan")


class CropSelection(Base):
    __tablename__ = "crop_selections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    crop = Column(String, nullable=False)
    variety = Column(String, nullable=True)
    sowing_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    owner = relationship("User", back_populates="crops")
    scans = relationship("Scan", back_populates="crop_selection", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    crop_selection_id = Column(Integer, ForeignKey("crop_selections.id"), nullable=False)

    image_path = Column(String, nullable=False)
    preprocessed_path = Column(String, nullable=True)   # bilateral + CLAHE preprocessed artifact
    gradcam_path = Column(String, nullable=True)

    disease = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    severity = Column(Float, nullable=False)

    weather_humidity = Column(Float, nullable=True)
    weather_temp_c = Column(Float, nullable=True)
    weather_rain_prob = Column(Float, nullable=True)
    weather_favorability = Column(Float, nullable=True)

    growth_stage = Column(String, nullable=True)

    risk_score = Column(Float, nullable=False)
    risk_band = Column(String, nullable=False)

    advisory_treatment = Column(Text, nullable=True)
    advisory_fertilizer = Column(Text, nullable=True)
    advisory_irrigation = Column(Text, nullable=True)
    escalated = Column(Integer, default=0)  # 0/1 boolean flag

    trajectory = Column(String, nullable=True)  # improving / stable / worsening / null (first scan)

    created_at = Column(DateTime, default=dt.datetime.utcnow, index=True)

    crop_selection = relationship("CropSelection", back_populates="scans")
