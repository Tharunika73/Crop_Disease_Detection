"""
Personalized advisory engine.

Selects treatment / fertilizer / irrigation recommendations from a
disease-indexed decision table and adds explainable follow-up guidance
for farmers: whether the existing treatment is working, whether they need
an alternative, and why.
"""

ADVISORY_TABLE = {
    "Early Blight": {
        "treatment": "Apply a chlorothalonil or mancozeb-based fungicide at 7-day intervals.",
        "fertilizer": "Avoid excess nitrogen; supplement with potassium to strengthen tissue.",
        "irrigation": "Switch to drip irrigation; avoid wetting foliage in the evening.",
    },
    "Late Blight": {
        "treatment": "Apply a copper-based or metalaxyl fungicide immediately; remove infected leaves.",
        "fertilizer": "Hold nitrogen top-dressing until infection is controlled.",
        "irrigation": "Reduce irrigation frequency; ensure good field drainage.",
    },
    "Leaf Spot": {
        "treatment": "Apply a broad-spectrum fungicide; prune for better air circulation.",
        "fertilizer": "Maintain balanced NPK; avoid over-fertilizing with nitrogen.",
        "irrigation": "Water at the base of the plant, early morning only.",
    },
    "Leaf Rust": {
        "treatment": "Apply a triazole-based fungicide at first sign of pustules.",
        "fertilizer": "Balanced NPK; avoid late-season nitrogen flushes.",
        "irrigation": "Avoid overhead sprinklers during humid spells.",
    },
    "Powdery Mildew": {
        "treatment": "Apply sulfur-based fungicide or neem oil spray weekly.",
        "fertilizer": "Reduce nitrogen; mildew favors soft, lush new growth.",
        "irrigation": "Improve airflow; avoid high ambient humidity around canopy.",
    },
    "Bacterial Blight": {
        "treatment": "Apply copper oxychloride spray; remove and destroy infected plant debris.",
        "fertilizer": "Avoid overhead nutrient sprays that spread bacteria between leaves.",
        "irrigation": "Avoid overhead irrigation entirely; use drip only.",
    },
    "Leaf Curl": {
        "treatment": "Control the whitefly vector with an appropriate insecticide; remove infected plants.",
        "fertilizer": "Maintain balanced feeding to support plant recovery.",
        "irrigation": "Maintain consistent soil moisture; avoid drought stress.",
    },
    "Healthy": {
        "treatment": "No treatment required. Continue routine field scouting.",
        "fertilizer": "Maintain current fertilization schedule.",
        "irrigation": "Maintain current irrigation schedule.",
    },
}


def get_advisory(
    disease: str,
    risk_band: str,
    trajectory: str | None,
    previous_severity: float | None = None,
    current_severity: float | None = None,
) -> dict:
    base = ADVISORY_TABLE.get(disease, ADVISORY_TABLE["Healthy"]).copy()
    escalated = False

    if risk_band == "Critical":
        base["treatment"] = "URGENT: " + base["treatment"] + " Consult a local agricultural officer immediately."
        escalated = True
    elif risk_band == "High":
        base["treatment"] = "Escalate treatment now: " + base["treatment"]
        escalated = True

    prev = previous_severity if previous_severity is not None else 0.0
    current = current_severity if current_severity is not None else 0.0

    if trajectory == "worsening" and risk_band in ("Moderate", "High", "Critical"):
        base["treatment"] += " Previous treatment does not appear effective — consider an alternative active ingredient."
        base["next_action"] = "Switch to an alternative treatment and recheck the crop in 3-5 days."
        base["explanation"] = (
            "The crop is not improving; the disease is worsening and the current treatment is not controlling the infection. "
            f"Severity moved from {prev:.1f}% to {current:.1f}% over the recent checks, so the treatment should be changed."
        )
        escalated = True
    elif trajectory == "improving":
        base["treatment"] += " Severity has decreased since the last scan — current treatment appears effective; continue it."
        base["next_action"] = "Continue the current treatment and maintain the same irrigation and fertilizer schedule."
        base["explanation"] = (
            "The crop is improving because the disease trend is moving downward. "
            f"Severity went from {prev:.1f}% to {current:.1f}%, which suggests the existing treatment is working."
        )
    else:
        base["next_action"] = "Monitor the field for 5-7 days and re-scan before changing the treatment plan."
        base["explanation"] = (
            "The situation is stable for now, so the AI recommends regular observation rather than a rapid change in treatment. "
            "Keep the current field care routine and watch for signs of new spread or reduced leaf damage."
        )

    if disease == "Healthy":
        base["next_action"] = "Continue routine scouting and keep the current crop care schedule."
        base["explanation"] = "The crop appears healthy, so no corrective treatment is required at this point."

    return {**base, "escalated": escalated, "trajectory": trajectory or "stable"}
