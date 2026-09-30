from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.config import settings
from app.routers import auth, crops, scans, admin, chatbot, ai_service, farms, dashboard, treatments, monitoring, reminders

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Based Crop Health Monitoring and Dynamic Disease Risk Advisory System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(crops.router)
app.include_router(scans.router)
app.include_router(admin.router)
app.include_router(chatbot.router)
app.include_router(ai_service.router)
app.include_router(farms.router)
app.include_router(dashboard.router)
app.include_router(treatments.router)
app.include_router(monitoring.router)
app.include_router(reminders.router)


@app.get("/health")
def health():
    return {"status": "ok"}
