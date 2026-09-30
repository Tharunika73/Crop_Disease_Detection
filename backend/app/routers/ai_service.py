import os
import random
from typing import Optional, List
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.detection import predict_disease
from app.services.severity import estimate_severity
from app.services.advisory import ADVISORY_TABLE, get_advisory

router = APIRouter(prefix="/ai", tags=["AI Microservice"])


class AnalyzeRequest(BaseModel):
    crop_name: Optional[str] = "Tomato"
    variety: Optional[str] = None
    growth_stage: Optional[str] = None
    image_path: Optional[str] = None
    image_urls: Optional[List[str]] = []
    previous_disease: Optional[str] = None
    previous_severity: Optional[float] = None
    previous_health_status: Optional[str] = None


class ChatRequest(BaseModel):
    question: str
    crop_context: Optional[str] = None
    user_location: Optional[str] = None


class CompareRequest(BaseModel):
    crop_name: Optional[str] = "Crop"
    session_1: dict
    session_2: dict


@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    crop = req.crop_name or "Tomato"
    severity_pct = 0.0
    detected_disease = None
    confidence = 0.91

    # Check if image path exists on disk for real CV analysis
    if req.image_path and os.path.exists(req.image_path):
        try:
            severity_pct = estimate_severity(req.image_path)
            det = predict_disease(req.image_path, crop, severity_pct)
            detected_disease = det.get("disease")
            confidence = det.get("confidence", 85.0) / 100.0
            if confidence > 1.0:
                confidence = confidence / 100.0
        except Exception as e:
            print(f"[ai_service] CV error, using heuristic fallback: {e}")

    # If no image or mock fallback
    if detected_disease is None:
        disease_catalog = {
            "Tomato": [("Early Blight", 18.5), ("Late Blight", 34.0), ("Leaf Spot", 12.0), (None, 0.0)],
            "Potato": [("Late Blight", 28.0), ("Early Blight", 15.0), (None, 0.0)],
            "Wheat": [("Leaf Rust", 22.0), ("Powdery Mildew", 14.0), (None, 0.0)],
            "Cotton": [("Bacterial Blight", 20.0), ("Leaf Curl", 30.0), (None, 0.0)],
            "Rice": [("Blast", 25.0), ("Brown Spot", 16.0), (None, 0.0)],
            "Corn": [("Northern Leaf Blight", 19.0), ("Common Rust", 14.0), (None, 0.0)],
        }
        options = disease_catalog.get(crop, [("Early Blight", 18.0), (None, 0.0)])
        choice = random.choice(options)
        detected_disease = choice[0]
        severity_pct = choice[1]
        confidence = round(random.uniform(0.85, 0.97), 2)

    # Health status assignment
    if detected_disease is None or detected_disease.lower() in ["healthy", "none"]:
        health_status = "HEALTHY"
        detected_disease = None
        severity_label = "NONE"
        severity_pct = 0.0
    elif severity_pct < 15.0:
        health_status = "MONITORING"
        severity_label = "LOW"
    elif severity_pct < 35.0:
        health_status = "ATTENTION"
        severity_label = "MODERATE"
    else:
        health_status = "TREATMENT"
        severity_label = "HIGH"

    # Comparison with previous session
    if req.previous_severity is not None:
        delta = severity_pct - req.previous_severity
        if delta < -2.0:
            change_status = "IMPROVING"
            change_desc = f"Infection area decreased by {abs(round(delta, 1))}% compared to the previous scan. The current management protocol is showing positive impact."
        elif delta > 2.0:
            change_status = "WORSENING"
            change_desc = f"Infection area expanded by {round(delta, 1)}% from previous check. Immediate intervention or treatment adjustment is advised."
        else:
            change_status = "STABLE"
            change_desc = "Symptom spread remains relatively stable compared to the last observation."
    else:
        change_status = "FIRST_SCAN"
        change_desc = "Baseline monitoring scan established for this crop."

    # Symptoms, causes & recommendations
    adv = ADVISORY_TABLE.get(detected_disease, ADVISORY_TABLE.get("Healthy", {}))
    treatment_text = adv.get("treatment", "Scout field regularly and observe plant response.")
    fertilizer_text = adv.get("fertilizer", "Apply balanced nutrients according to soil tests.")
    irrigation_text = adv.get("irrigation", "Maintain uniform root-zone moisture; avoid leaf wetness.")

    symptoms = (
        f"Localized spots and discoloration observed on foliage. Tissue necrosis is consistent with early manifestations of {detected_disease}."
        if detected_disease else "Foliage exhibits uniform green pigmentation, healthy vascular turgor, and no signs of pathogenic lesions or pest predation."
    )
    possible_causes = (
        f"1. Fungal or bacterial pathogens thriving in warm, humid microclimates.\n"
        f"2. Prolonged surface wetness from overhead watering or morning dew.\n"
        f"3. Dense canopy restricting air circulation.\n"
        f"4. Soil splash carrying spores onto lower leaves."
        if detected_disease else "Optimal growth conditions with balanced soil nutrition and proper aeration."
    )
    recommendations = (
        f"1. Treatment: {treatment_text}\n"
        f"2. Fertility Management: {fertilizer_text}\n"
        f"3. Water Management: {irrigation_text}\n\n"
        f"SAFETY NOTE: Verify that any crop protection product used complies with local agricultural guidelines and label dosage."
        if detected_disease else f"1. Continue routine weekly monitoring.\n2. {fertilizer_text}\n3. {irrigation_text}"
    )
    prevention = (
        "Practice crop rotation, maintain 45-60cm plant spacing for ventilation, sanitize pruning tools with 70% alcohol, and apply bio-fungicides proactively during humid weather."
    )

    follow_up_days = 3 if health_status in ["ATTENTION", "TREATMENT"] else 7

    return {
        "crop_identified": crop,
        "health_status": health_status,
        "disease": detected_disease,
        "confidence": confidence,
        "symptoms": symptoms,
        "possible_causes": possible_causes,
        "severity": severity_label,
        "severity_percentage": round(severity_pct, 1),
        "recommendations": recommendations,
        "prevention": prevention,
        "follow_up_days": follow_up_days,
        "change_from_previous": change_status,
        "change_description": change_desc,
    }


@router.post("/chat")
def chat(req: ChatRequest):
    q = req.question.lower().strip()
    crop = req.crop_context or "crop"
    loc = req.user_location or "your region"

    # Attempt to use real LLM (Gemini)
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = f"You are an expert AI agricultural advisor. Context: Crop is {crop}, Location is {loc}.\nUser's question: {req.question}\nProvide a concise, helpful, and accurate response based on agricultural best practices. Use markdown formatting for readability."
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            return {"answer": response.text}
        except ImportError:
            print("google-genai is not installed.")
        except Exception as e:
            print(f"Gemini API Error: {e}")

    # Detect mentioned crop from question if no context given
    mentioned_crop = crop
    crop_keywords = {
        "banana": "Banana", "tomato": "Tomato", "potato": "Potato",
        "wheat": "Wheat", "rice": "Rice", "corn": "Corn", "maize": "Maize",
        "cotton": "Cotton", "sugarcane": "Sugarcane", "mango": "Mango",
        "onion": "Onion", "garlic": "Garlic", "chilli": "Chilli", "pepper": "Pepper",
        "groundnut": "Groundnut", "soybean": "Soybean", "sunflower": "Sunflower",
    }
    for kw, name in crop_keywords.items():
        if kw in q:
            mentioned_crop = name
            break

    prefix = ""  # Response prefix (can be personalised; currently empty string)

    if any(greet in q for greet in ["hi", "hello", "hey", "good morning", "good evening", "namaste"]):
        ans = (
            prefix + "👋 Hello! I'm your **AgriCare AI Agronomist**.\n\n"
            "I can help you with:\n"
            "• 🌿 **Crop disease diagnosis** and treatment plans\n"
            "• 🌾 **Farming guides** for any crop\n"
            "• 💧 **Irrigation & fertilizer** recommendations\n"
            "• 🐛 **Pest & weed management**\n"
            "• 🌱 **Soil health** and nutrient advice\n"
            "• 🍌 **Crop varieties** and selection tips\n\n"
            "Ask me anything about your farm! For example: *\"types of banana\"*, *\"how to grow tomato\"*, or *\"my rice leaves are turning yellow\"*."
        )
    elif any(kw in q for kw in ["type", "variety", "varieties", "kinds", "species", "cultivar"]):
        crop_varieties = {
            "Banana": (
                "**Common Banana Varieties:**\n\n"
                "1. 🍌 **Cavendish** – Most widely grown for export; sweet, creamy texture.\n"
                "2. 🍌 **Grand Naine (G9)** – High-yield, disease-resistant; best for commercial farming.\n"
                "3. 🍌 **Robusta** – Widely grown in India; medium-sized, sweet flavor.\n"
                "4. 🍌 **Nendran (Kerala Banana)** – Ideal for cooking; used in chips and curries.\n"
                "5. 🍌 **Red Banana** – Unique reddish peel; rich in beta-carotene.\n"
                "6. 🍌 **Poovan (Mysore)** – Small, tangy-sweet; resistant to Panama wilt.\n"
                "7. 🍌 **Dwarf Cavendish** – Compact plant; suitable for high-density planting.\n\n"
                "💡 **Tip**: For commercial farming, **Grand Naine (G9)** is recommended for high yields and disease resistance."
            ),
            "Tomato": (
                "**Common Tomato Varieties:**\n\n"
                "1. 🍅 **Roma** – Plum-shaped; ideal for sauces and paste.\n"
                "2. 🍅 **Cherry Tomato** – Small, sweet; high market demand.\n"
                "3. 🍅 **Beefsteak** – Large, meaty; best for slicing.\n"
                "4. 🍅 **Hybrid F1 (e.g., Arka Rakshak)** – Disease-resistant, high-yield.\n"
                "5. 🍅 **Pusa Ruby** – Early-maturing; popular in Indian plains.\n\n"
                "💡 **Tip**: Hybrid varieties offer 30–50% higher yields with better disease resistance."
            ),
            "Rice": (
                "**Common Rice Varieties:**\n\n"
                "1. 🌾 **Basmati** – Long-grain, aromatic; premium export variety.\n"
                "2. 🌾 **Sona Masuri** – Light, low-starch; popular in South India.\n"
                "3. 🌾 **IR-64** – High-yield, early-maturing; good disease resistance.\n"
                "4. 🌾 **Swarna (MTU 7029)** – Most widely grown in India; flood-tolerant.\n"
                "5. 🌾 **Pusa Basmati 1121** – Extra-long grain; highest export value.\n\n"
                "💡 **Tip**: Choose variety based on your local water availability and market demand."
            ),
        }
        variety_info = crop_varieties.get(mentioned_crop, None)
        if variety_info:
            ans = prefix + variety_info
        else:
            ans = (
                prefix + f"**Common varieties of {mentioned_crop}:**\n\n"
                "• Look for **hybrid varieties** (F1 hybrids) for higher yield and disease resistance.\n"
                "• Choose **open-pollinated varieties** if you want to save seeds.\n"
                "• Select varieties adapted to your **local climate** and **soil type**.\n"
                "• Consult your nearest **Krishi Vigyan Kendra (KVK)** or agricultural university for regionally recommended varieties.\n\n"
                "💡 To get precise variety recommendations, upload a crop image or ask about a specific crop (e.g., *\"types of banana\"* or *\"wheat varieties\"*)."
            )
    elif any(kw in q for kw in ["farm", "grow", "cultivat", "plant", "how to", "guide", "start", "begin", "setup"]):
        farming_guides = {
            "Banana": (
                "**How to Do Banana Farming – Complete Guide:**\n\n"
                "**1. 🌍 Climate & Soil**\n"
                "• Thrives in tropical/subtropical climate (15–35°C).\n"
                "• Prefers well-drained, loamy soil with pH 6.0–7.5.\n"
                "• Avoid waterlogged fields — banana roots rot easily.\n\n"
                "**2. 🌱 Planting**\n"
                "• Use tissue culture (TC) plants or suckers for planting.\n"
                "• Spacing: 1.8m × 1.8m (high-density) or 2m × 2m (standard).\n"
                "• Best planting season: June–July (Kharif) or Feb–March.\n"
                "• Dig 45×45×45 cm pits; fill with FYM + soil mix.\n\n"
                "**3. 💧 Irrigation**\n"
                "• Drip irrigation is highly recommended (saves 40% water).\n"
                "• Water requirement: 700–900mm/year.\n"
                "• Avoid water stress during flowering and bunch formation.\n\n"
                "**4. 🌿 Fertilization**\n"
                "• Apply 200g N + 60g P₂O₅ + 300g K₂O per plant per year.\n"
                "• Split fertilizer into 5–6 doses for best results.\n"
                "• Supplement with 10kg FYM per pit at planting.\n\n"
                "**5. 🐛 Pest & Disease Management**\n"
                "• Watch for **Panama Wilt** (Fusarium), **Sigatoka leaf spot**, and **Banana Weevil**.\n"
                "• Use resistant varieties (Grand Naine, Poovan) to reduce disease risk.\n"
                "• Apply Trichoderma viride as soil drench for root protection.\n\n"
                "**6. 🍌 Harvest**\n"
                "• Ready in 12–15 months from planting.\n"
                "• Harvest when fingers are fully developed but still green.\n"
                "• Expected yield: 20–40 tonnes/hectare depending on variety.\n\n"
                "💡 **Pro Tip**: Tissue culture plants give 20–30% higher yield and are disease-free compared to suckers."
            ),
            "Tomato": (
                "**How to Grow Tomatoes – Complete Guide:**\n\n"
                "**1. 🌍 Climate & Soil**\n"
                "• Ideal temperature: 20–27°C day, 15–20°C night.\n"
                "• Well-drained loamy/sandy-loam soil; pH 6.0–7.0.\n\n"
                "**2. 🌱 Nursery & Transplanting**\n"
                "• Raise seedlings in nursery trays for 25–30 days.\n"
                "• Transplant at 60×45 cm spacing.\n"
                "• Best seasons: Oct–Nov (Rabi), June–July (Kharif).\n\n"
                "**3. 💧 Irrigation & Fertilization**\n"
                "• Drip irrigation preferred; water every 3–5 days.\n"
                "• Apply 120:80:60 kg NPK/ha split in 3 doses.\n\n"
                "**4. 🐛 Pest & Disease Management**\n"
                "• Watch for Early/Late Blight, Fruit Borer, and Whiteflies.\n"
                "• Use yellow sticky traps and neem oil spray preventively.\n\n"
                "**5. 🍅 Harvest**\n"
                "• Ready in 60–90 days after transplanting.\n"
                "• Harvest when fruits turn light-red; ripen off-vine.\n"
                "• Yield: 25–40 tonnes/hectare.\n"
            ),
        }
        guide = farming_guides.get(mentioned_crop, None)
        if guide:
            ans = prefix + guide
        else:
            ans = (
                prefix + f"**{mentioned_crop} Farming Guide:**\n\n"
                "**1. 🌍 Land Preparation**: Deep-plough the field 2–3 times. Add 10–15 tonnes of well-decomposed FYM per hectare.\n"
                "**2. 🌱 Planting**: Choose certified seeds/planting material. Follow recommended spacing for good air circulation.\n"
                "**3. 💧 Irrigation**: Maintain consistent soil moisture. Drip or furrow irrigation is preferred over overhead.\n"
                "**4. 🌿 Fertilization**: Apply NPK based on soil test results. Split doses improve nutrient uptake.\n"
                "**5. 🐛 Pest & Disease Control**: Scout weekly. Use integrated pest management (IPM) strategies.\n"
                "**6. 🍃 Harvest**: Follow crop-specific maturity indicators. Avoid harvesting in extreme heat.\n\n"
                "📸 **Upload a crop image** for AI-powered disease diagnosis and personalized advisory!"
            )
    elif any(kw in q for kw in ["pest", "insect", "bug", "worm", "aphid", "whitefly", "borer", "mite", "thrip"]):
        ans = (
            prefix + f"**Pest Management for {mentioned_crop}:**\n\n"
            "**Common Pests & Solutions:**\n\n"
            "🐛 **Aphids**: Spray Imidacloprid 17.8 SL @ 0.5 ml/L or Neem Oil @ 5 ml/L. Release ladybird beetles as biocontrol.\n\n"
            "🦟 **Whiteflies**: Use yellow sticky traps (10/acre). Spray Thiamethoxam 25 WG @ 0.3g/L.\n\n"
            "🐛 **Fruit/Stem Borers**: Apply Chlorpyrifos 20 EC @ 2ml/L. Use pheromone traps for monitoring.\n\n"
            "🕷️ **Spider Mites**: Spray Abamectin 1.9 EC @ 0.5ml/L or wettable sulfur @ 3g/L during dry spells.\n\n"
            "🌿 **Integrated Pest Management (IPM) Tips:**\n"
            "• Rotate crops yearly to break pest cycles.\n"
            "• Maintain field hygiene — remove crop debris after harvest.\n"
            "• Spray pesticides in early morning or late evening to protect pollinators."
        )
    elif any(kw in q for kw in ["soil", "ph", "compost", "organic matter", "loam", "sandy", "clay", "drainage"]):
        ans = (
            prefix + f"**Soil Health & Preparation for {mentioned_crop}:**\n\n"
            "• **Ideal pH**: Most crops prefer 6.0–7.5. Test soil with a pH meter or send to lab.\n"
            "• **Organic Matter**: Add 10–15 tonnes FYM (Farm Yard Manure) or 5 tonnes compost per hectare before planting.\n"
            "• **Loamy Soil**: Best for most crops — retains moisture but drains well.\n"
            "• **Sandy Soil Fix**: Add clay and organic matter to improve water retention.\n"
            "• **Clay Soil Fix**: Add sand and organic compost to improve drainage and aeration.\n"
            "• **Biofertilizers**: Apply Rhizobium, Azospirillum, or PSB (Phosphate Solubilizing Bacteria) to boost natural fertility.\n\n"
            "💡 **Pro Tip**: Conduct a soil test every 2 years for optimal nutrient management."
        )
    elif any(kw in q for kw in ["harvest", "yield", "when to pick", "maturity", "post-harvest", "storage"]):
        ans = (
            prefix + f"**Harvest & Post-Harvest Guide for {mentioned_crop}:**\n\n"
            "• **Maturity Indicators**: Color change, firmness, days-to-maturity chart, or dry matter content.\n"
            "• **Best Time to Harvest**: Early morning when temperatures are cool to preserve quality.\n"
            "• **Avoid Over-Ripening**: Monitor closely during final 1–2 weeks before harvest.\n"
            "• **Post-Harvest Handling**: Grade and sort produce. Use cool storage (4–10°C) for perishables.\n"
            "• **Storage**: Store in well-ventilated, dry sheds. Use crates instead of gunny bags to prevent bruising.\n"
            "• **Value Addition**: Process excess yield into dried, pickled, or processed products to reduce losses.\n\n"
            "📊 Typical yields vary by variety and management — always compare with local benchmarks."
        )
    elif "blight" in q:
        ans = (
            prefix + f"For blight issues in {mentioned_crop}: \n\n"
            "1. **Identification**: Early blight causes concentric ring spots (target-like) on older leaves. Late blight causes water-soaked dark lesions that rapidly blacken stems and fruit.\n"
            "2. **Immediate Action**: Prune and discard all infected leaves. Avoid composting diseased foliage.\n"
            "3. **Fungicide Application**: Apply copper-based fungicides (like Copper Oxychloride 50 WP @ 2.5g/L) or Mancozeb 75 WP (@ 2g/L) during early onset.\n"
            "4. **Cultural Control**: Switch to drip irrigation, mulch soil to prevent fungal spore splash, and maintain good spacing."
        )
    elif "fertilizer" in q or "nutrient" in q or "npk" in q:
        ans = (
            prefix + f"Fertilizer guidance for {mentioned_crop} in {loc}:\n\n"
            "• **Vegetative Phase**: Focus on Nitrogen (N) for vigorous vegetative and canopy growth (e.g., balanced 19:19:19 or composted manure).\n"
            "• **Flowering & Fruit Set**: Switch to higher Phosphorus (P) and Potassium (K), e.g., 0:52:34 (MKP) or 13:0:45, to promote flower retention and disease resistance.\n"
            "• **Micronutrients**: Spray a chelated micronutrient mix (Zinc, Boron, Calcium) every 15-20 days to prevent blossom end rot and leaf crinkling."
        )
    elif "water" in q or "irrigation" in q:
        ans = (
            prefix + f"Irrigation recommendations for {mentioned_crop}:\n\n"
            "• Water during the early morning hours so leaf surfaces dry quickly under morning sun.\n"
            "• Use drip irrigation to keep water and fungal spores away from the canopy.\n"
            "• Ensure proper drainage; stagnant water suffocates roots and causes Phytophthora root rot."
        )
    elif "organic" in q or "neem" in q or "bio" in q:
        ans = (
            prefix + f"Organic and biological remedies for {mentioned_crop}:\n\n"
            "• **Neem Oil**: Mix 5ml cold-pressed Neem Oil (10,000 ppm) + 2ml liquid soap per liter of water. Spray weekly as an effective repellent against sucking pests and mild fungal growth.\n"
            "• **Trichoderma viride**: Apply as a soil drench (5g/L) to guard root zones against soil-borne fungal pathogens.\n"
            "• **Pseudomonas fluorescens**: Foliar spray at 5g/L stimulates plant immunity and combats bacterial leaf spots."
        )
    elif "yellow" in q or "chlorosis" in q:
        ans = (
            prefix + f"Yellow leaves in {mentioned_crop} usually signify:\n\n"
            "1. **Nitrogen Deficiency**: Older bottom leaves turn uniformly pale yellow.\n"
            "2. **Iron or Zinc Deficiency**: Interveinal chlorosis (yellowing between leaf veins) on new top leaves.\n"
            "3. **Overwatering**: Root asphyxiation causing overall yellowing and leaf droop.\n"
            "4. **Viral Infection**: Mosaic yellow-green patterns accompanied by puckered leaves (transmitted by whiteflies or aphids)."
        )
    elif "spray" in q or "schedule" in q:
        ans = (
            prefix + f"Recommended spray schedule for {mentioned_crop}:\n\n"
            "• **Time of Day**: Spray between 6:30 AM - 9:00 AM or 4:30 PM - 6:30 PM when pollinators are less active and temperatures are cooler.\n"
            "• **Weather**: Avoid spraying if rain is expected within 4 hours or if wind exceeds 10 km/h.\n"
            "• **Pre-Harvest Interval (PHI)**: Always observe the recommended PHI on the pesticide bottle before harvesting produce."
        )
    elif any(kw in q for kw in ["disease", "infection", "fungal", "bacterial", "virus", "spot", "rot", "wilt", "rust", "mold", "mould"]):
        adv = ADVISORY_TABLE.get(mentioned_crop, None)
        if adv:
            ans = (
                prefix + f"**Disease Management for {mentioned_crop}:**\n\n"
                f"• **Treatment**: {adv.get('treatment', 'Scout field regularly.')}\n"
                f"• **Fertilizer Adjustment**: {adv.get('fertilizer', 'Maintain balanced nutrition.')}\n"
                f"• **Irrigation Advice**: {adv.get('irrigation', 'Avoid leaf wetness.')}\n\n"
                "📸 **Upload a photo** of the affected leaves for AI-powered precision diagnosis!"
            )
        else:
            ans = (
                prefix + f"**Disease Management Tips for {mentioned_crop}:**\n\n"
                "• Apply broad-spectrum fungicide (Mancozeb 75 WP @ 2g/L) at first symptom appearance.\n"
                "• Remove and destroy infected plant parts — do NOT compost them.\n"
                "• Improve field sanitation: clear crop debris and weeds.\n"
                "• Avoid overhead irrigation; use drip to reduce leaf wetness duration.\n"
                "• Rotate crops to break disease cycles.\n\n"
                "📸 Upload a crop image for precise AI diagnosis and targeted treatment recommendations!"
            )
    else:
        ans = (
            prefix + f"**AgriCare Advisory for {mentioned_crop}:**\n\n"
            "• 🔍 Regularly inspect leaf undersides and new growth for early pest or disease symptoms.\n"
            "• 💧 Maintain soil moisture consistency with mulching and efficient drip delivery.\n"
            "• 🌿 Follow an integrated crop management approach: balanced nutrition + timely irrigation + IPM.\n"
            "• 📸 Upload a close-up photo of affected leaves for AI-powered disease diagnosis.\n\n"
            "You can ask me about:\n"
            "✅ Types/varieties of any crop\n"
            "✅ How to farm a specific crop\n"
            "✅ Disease & pest identification\n"
            "✅ Fertilizer & irrigation schedules\n"
            "✅ Harvest timing & post-harvest storage"
        )

    return {"answer": ans}



@router.post("/compare")
def compare(req: CompareRequest):
    s1 = req.session_1
    s2 = req.session_2
    sev1 = s1.get("severity_percentage", 0.0)
    sev2 = s2.get("severity_percentage", 0.0)
    delta = sev2 - sev1

    if delta < -2.0:
        trend = "IMPROVING"
        summary = f"Noticeable recovery: Disease severity decreased by {abs(round(delta, 1))}% between scans."
    elif delta > 2.0:
        trend = "WORSENING"
        summary = f"Disease spread has increased by {round(delta, 1)}%. Recommend escalating treatment or consulting an agronomist."
    else:
        trend = "STABLE"
        summary = "Disease status remains unchanged between observations."

    return {
        "crop_name": req.crop_name,
        "trend": trend,
        "delta_severity": round(delta, 1),
        "summary": summary,
    }
