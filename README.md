# AI-Based Crop Health Monitoring and Dynamic Disease Risk Advisory System

Full-stack implementation: FastAPI backend + PostgreSQL database + React frontend.

## What is real vs. placeholder — read this first

| Component | Status |
|---|---|
| Auth (JWT, bcrypt, register/login) | **Real** |
| Database (Postgres via Docker, SQLite for local dev) | **Real** |
| Severity estimation (HSV + Otsu, from actual image pixels) | **Real** |
| Dynamic risk scoring (weighted fusion formula) | **Real** |
| Advisory rule engine + escalation logic | **Real** |
| Historical monitoring / trajectory classification | **Real** |
| Regional aggregation + outbreak detection (admin) | **Real** |
| Chatbot (rule-based, grounded in scan data) | **Real** |
| Weather | **Real** if you add a free OpenWeatherMap API key; simulated fallback otherwise |
| CNN disease classification | **Mock** until you train a model with `ml/train_model.py` on a real dataset, then it's real |
| Grad-CAM | Only generated once a real trained model is loaded; otherwise skipped |

The mock classifier is clearly flagged (`is_mock: true` internally) so you always know which predictions came from a trained model vs. the placeholder.

## Project structure

```
cropapp/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app, CORS, router wiring
│   │   ├── config.py          Settings from environment variables
│   │   ├── database.py        SQLAlchemy engine/session
│   │   ├── models.py          User, CropSelection, Scan tables
│   │   ├── schemas.py         Pydantic request/response models
│   │   ├── auth.py            JWT + password hashing
│   │   ├── routers/           auth, crops, scans, admin, chatbot
│   │   └── services/          severity, detection, weather, risk, advisory, outbreak
│   ├── ml/train_model.py      Transfer-learning training script (run yourself)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml          Postgres + backend
└── frontend_api_client.js      Wire this into CropHealthApp.jsx (from earlier in this chat)
```

## Running locally (quickest path — SQLite, no Docker)

```bash
cd backend
cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs at `http://localhost:8000/docs` — try registering a user and creating a crop selection right away; the mock classifier means you can test the full pipeline before training anything.

## Running with Docker (Postgres, production-shaped)

```bash
cp backend/.env.example backend/.env   # edit SECRET_KEY, WEATHER_API_KEY
docker compose up --build
```

Backend available at `http://localhost:8000`.

## Training a real model

```bash
cd backend
pip install tensorflow
python ml/train_model.py --data_dir /path/to/dataset/tomato --epochs 20
```

Dataset must be organized as `class_name/image.jpg` folders (standard Keras `ImageDataGenerator` layout — PlantVillage works directly). This produces `ml/trained_model.h5` and `ml/class_names.json`. Point `MODEL_PATH` and `CLASS_NAMES_PATH` in `.env` at them and restart the backend — `/scans` now returns real predictions and real Grad-CAM overlays automatically, no code changes needed.

## Connecting the frontend

The React UI from earlier in this chat (`CropHealthApp.jsx`) currently uses mock functions for disease detection, weather, and risk scoring so it runs standalone. `frontend_api_client.js` gives you real `fetch()` wrappers for every endpoint — see the comment at the top of that file for exactly which mock functions to swap out.

## Creating an admin account

There's no separate admin signup UI — register normally, then either:
- pass `"role": "admin"` in the `/auth/register` request body, or
- update the row directly: `UPDATE users SET role = 'admin' WHERE email = '...';`

Admin users additionally need a `region` value set (e.g. `"Erode"`) for regional aggregation and outbreak detection to include them.

## Deployment notes

- Backend: any host that runs Docker (Render, Railway, Fly.io, EC2, etc.). Use the provided `docker-compose.yml` as your starting point; managed Postgres is a drop-in replacement for the `db` service via `DATABASE_URL`.
- Uploaded images and Grad-CAM overlays are stored in `backend/uploads` and served at `/uploads/<filename>` — mount this to persistent storage (or swap to S3) in production, since container filesystems are usually ephemeral.
- Set a strong, random `SECRET_KEY` and restrict `CORS_ORIGINS` to your actual frontend domain before going live.
- The `tensorflow` dependency is commented out in `requirements.txt` by default (it's large) — uncomment it once you're ready to use a real trained model, both for training and for the backend container that will serve inference.
