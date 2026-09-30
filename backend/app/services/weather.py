"""
Weather and environmental context module.

Retrieves current/forecast weather for the farmer's registered coordinates
and computes a weather-favorability sub-score by comparing conditions
against disease-specific trigger thresholds.

If WEATHER_API_KEY is not configured, falls back to a deterministic
simulated forecast so the pipeline still runs end-to-end in local
development. This fallback is clearly flagged in the response.
"""
import random
import requests
from app.config import settings

# Disease-specific trigger conditions: (min_humidity_pct, min_rain_prob_pct)
DISEASE_TRIGGERS = {
    "Early Blight": (75, 40),
    "Late Blight": (85, 50),
    "Leaf Spot": (70, 30),
    "Leaf Rust": (75, 35),
    "Powdery Mildew": (60, 20),
    "Bacterial Blight": (80, 45),
    "Leaf Curl": (55, 20),
    "Healthy": (100, 100),
}


def fetch_weather(lat: float, lon: float) -> dict:
    if not settings.WEATHER_API_KEY or lat is None or lon is None:
        return _simulated_weather(flag=True)

    try:
        resp = requests.get(
            settings.WEATHER_API_URL,
            params={"lat": lat, "lon": lon, "appid": settings.WEATHER_API_KEY, "units": "metric"},
            timeout=6,
        )
        resp.raise_for_status()
        data = resp.json()
        first = data["list"][0]
        humidity = float(first["main"]["humidity"])
        temp_c = float(first["main"]["temp"])
        rain_prob = float(first.get("pop", 0)) * 100
        return {"humidity": humidity, "temp_c": temp_c, "rain_prob": rain_prob, "simulated": False}
    except Exception:
        return _simulated_weather(flag=True)


def _simulated_weather(flag: bool) -> dict:
    return {
        "humidity": round(random.uniform(55, 95), 1),
        "temp_c": round(random.uniform(20, 34), 1),
        "rain_prob": round(random.uniform(0, 100), 1),
        "simulated": flag,
    }


def weather_favorability(weather: dict, disease: str) -> float:
    min_humidity, min_rain = DISEASE_TRIGGERS.get(disease, (75, 40))
    score = 0.0
    if weather["humidity"] >= min_humidity:
        score += 45
    elif weather["humidity"] >= min_humidity - 15:
        score += 25
    else:
        score += 10

    if weather["rain_prob"] >= min_rain:
        score += 30
    elif weather["rain_prob"] >= min_rain - 15:
        score += 15

    if 20 <= weather["temp_c"] <= 30:
        score += 25
    else:
        score += 10

    return min(100.0, round(score, 1))
