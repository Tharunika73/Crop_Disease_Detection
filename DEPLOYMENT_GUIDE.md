# 🚀 AgriCare: 1-Click Deployment Guide (Render)

This repository is pre-configured with a **Render Blueprint (`render.yaml`)** to deploy both the **FastAPI Backend** and the **React (Vite) Frontend** automatically on Render's free tier.

---

## 📋 Prerequisites
1. **GitHub Repository**: Push your latest commits to your GitHub repository ([Tharunika73/Crop_Disease_Detection](https://github.com/Tharunika73/Crop_Disease_Detection)).
2. **Render Account**: Sign up for free at [dashboard.render.com](https://dashboard.render.com) (Log in with your GitHub account).

---

## ⚡ Step 1: Push Latest Changes to GitHub

In your PowerShell or terminal in the project directory, push the commits:

```powershell
git push origin main
```

*(If prompted for authentication, enter your GitHub Username and a **Personal Access Token (classic)** with `repo` scope from [GitHub Token Settings](https://github.com/settings/tokens)).*

---

## 🌐 Step 2: Deploy on Render via Blueprint (Automated)

1. Open your browser and go to [**Render Dashboard**](https://dashboard.render.com/).
2. Click the **"New +"** button (top right) and select **"Blueprint"**.
3. Connect your GitHub account and choose repository:
   - **`Tharunika73/Crop_Disease_Detection`**
4. Render will automatically detect [`render.yaml`](./render.yaml) and configure two services:
   - **`crop-health-backend`** (Python 3.11 Web Service running FastAPI)
   - **`crop-health-frontend`** (Static React/Vite Site)
5. (Optional) In the configuration screen, you can provide:
   - `OPENAI_API_KEY`: *(Optional, for the AI Agronomist Chatbot)*
   - `WEATHER_API_KEY`: *(Optional, for OpenWeatherMap integration)*
6. Click **"Apply"**!

Render will now:
- Build and spin up the Python FastAPI backend.
- Build the React Vite frontend and automatically inject the backend URL into `VITE_API_BASE`.
- Issue free SSL certificates (`https://...`) with live public URLs for both!

---

## 🎯 Architecture & Configuration Details

| Service | Type | Build Command | Start Command | Public URL Pattern |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | Python 3.11 Web Service | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `https://crop-health-backend-xxxx.onrender.com` |
| **Frontend** | Static React Site | `npm install && npm run build` | *Static CDN (`/dist`)* | `https://crop-health-frontend-xxxx.onrender.com` |

### Environment Variables Managed by Render:
- `CORS_ORIGINS`: Set to `*` to allow frontend-backend communication.
- `DATABASE_URL`: Defaults to SQLite `sqlite:///./cropapp.db` or PostgreSQL if an external DB is linked.
- `VITE_API_BASE`: Automatically assigned to point to `crop-health-backend`.

---

## 🛠️ Verifying the Live Deployment
1. Open the backend health check URL: `https://<your-backend-name>.onrender.com/health` (should return `{"status":"ok"}`).
2. Open the frontend URL: `https://<your-frontend-name>.onrender.com`.
3. Log in with:
   - **Email**: `admin@agricare.com`
   - **Password**: `admin123`
4. Test **Scan Leaf**, **Farm Management**, **AI Chatbot**, and **Weather Monitoring**!
