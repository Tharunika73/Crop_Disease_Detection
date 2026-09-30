"""
Growth-stage determination and dynamic disease risk scoring.
"""
import datetime as dt

CROP_DURATIONS_DAYS = {
    "Tomato": 120,
    "Potato": 100,
    "Wheat": 140,
    "Cotton": 160,
}

# (fraction_of_duration_upper_bound, stage_name, vulnerability_0_to_1)
STAGE_TABLE = [
    (0.15, "Seedling", 0.35),
    (0.40, "Vegetative", 0.55),
    (0.65, "Flowering", 0.80),
    (0.85, "Fruiting", 0.65),
    (1.01, "Maturity", 0.40),
]

# Disease-specific fusion weights: severity, weather, growth-stage, trend (sum to 1.0)
DISEASE_WEIGHTS = {
    "Early Blight": (0.35, 0.35, 0.15, 0.15),
    "Late Blight": (0.30, 0.40, 0.15, 0.15),
    "Leaf Spot": (0.40, 0.25, 0.20, 0.15),
    "Leaf Rust": (0.35, 0.30, 0.20, 0.15),
    "Powdery Mildew": (0.30, 0.35, 0.20, 0.15),
    "Bacterial Blight": (0.35, 0.30, 0.20, 0.15),
    "Leaf Curl": (0.40, 0.20, 0.25, 0.15),
    "Healthy": (0.50, 0.20, 0.15, 0.15),
}


def growth_stage(sowing_date: dt.date, crop: str) -> tuple[str, float]:
    duration = CROP_DURATIONS_DAYS.get(crop, 120)
    days_elapsed = (dt.date.today() - sowing_date).days
    fraction = max(0.0, min(1.0, days_elapsed / duration))
    for upper, name, vulnerability in STAGE_TABLE:
        if fraction <= upper:
            return name, vulnerability
    return STAGE_TABLE[-1][1], STAGE_TABLE[-1][2]


def trend_factor(previous_severity: float | None, current_severity: float) -> float:
    """Higher when severity is rising relative to the last scan; neutral (20) if no history."""
    if previous_severity is None:
        return 20.0
    delta = current_severity - previous_severity
    return max(0.0, min(100.0, 30 + delta * 2))


def compute_risk(disease: str, severity: float, weather_score: float,
                  vulnerability: float, trend: float) -> tuple[float, str]:
    w1, w2, w3, w4 = DISEASE_WEIGHTS.get(disease, DISEASE_WEIGHTS["Healthy"])
    raw = w1 * severity + w2 * weather_score + w3 * (vulnerability * 100) + w4 * trend
    score = max(0.0, min(100.0, round(raw, 1)))
    band = risk_band(score)
    return score, band


def risk_band(score: float) -> str:
    if score <= 25:
        return "Low"
    if score <= 50:
        return "Moderate"
    if score <= 75:
        return "High"
    return "Critical"


def classify_trajectory(previous_severity: float | None, current_severity: float) -> str | None:
    if previous_severity is None:
        return None
    delta = current_severity - previous_severity
    if delta < -3:
        return "improving"
    if delta > 3:
        return "worsening"
    return "stable"
