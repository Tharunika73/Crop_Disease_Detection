import os
import json
import logging
import requests
from typing import Optional, List, Dict, Any

from app.config import settings

logger = logging.getLogger(__name__)

OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"

SYSTEM_PERSONAL_ASSISTANT_PROMPT = """You are AgriCare AI, an empathetic, highly skilled Personal Agricultural Assistant and Senior Agronomist.
You act as a personal advisory companion for farmers, growers, and agronomists.

Your goals:
1. PERSONAL & CONVERSATIONAL:
   - Be welcoming, empathetic, and encouraging. Address the user naturally like a dedicated farm advisor.
   - Remember previous messages in this conversation. Reference earlier context, crops, or treatments mentioned.
   - If information is missing (e.g. soil moisture, stage, severity), ask clarifying follow-up questions politely.

2. EXPLAINABLE AI (XAI) & MECHANISTIC INSIGHT:
   - Do not just dump numbers or raw steps. Always explain the "WHY":
     * Biological / Environmental Mechanism: Why did this symptom or pathogen develop? (e.g., spore germination in 85%+ relative humidity, stomatal entry, nitrogen mobility).
     * Rationale behind recommendations: Why does a specific remedy work? (e.g., how copper oxychloride inhibits enzyme activity, how neem azadirachtin deters insect feeding).
     * Urgency & Risk: Why immediate vs. scheduled action matters to prevent exponential yield loss.
   - Provide structured, practical advice:
     * Organic & Biological controls first (Bio-fungicides, Neem, Trichoderma).
     * Chemical management options (clear dosage per liter/acre, spray timing like early morning/late evening, PPE safety precautions).
     * Cultural & Preventive actions (spacing, pruning, drip vs overhead irrigation, crop rotation).

3. FORMATTING:
   - Use clean Markdown with headers (## or ###), bullet points, and bold text for easy reading on mobile/desktop.
   - Keep answers clear, well-spaced, and actionable.
   - End with 2-3 clickable suggested follow-up questions formatted on their own lines starting with `[SUGGESTION] ` so the user can easily tap them.
"""

def call_openai_chat(
    question: str,
    history: List[Dict[str, str]],
    crop_context: Optional[str] = None,
    user_location: Optional[str] = None,
    crop_details: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Calls OpenAI API if API key is configured and valid."""
    api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")
    if not api_key or not api_key.startswith("sk-"):
        return None

    # Build contextual system prompt
    context_str = f"Current Crop: {crop_context or 'General'}. Location: {user_location or 'Not specified'}."
    if crop_details:
        context_str += f" Details: {json.dumps(crop_details)}"

    system_content = f"{SYSTEM_PERSONAL_ASSISTANT_PROMPT}\n\n[USER CONTEXT]\n{context_str}"

    messages = [{"role": "system", "content": system_content}]

    # Include recent conversation turns (up to 8 turns for memory)
    if history:
        for turn in history[-8:]:
            role = turn.get("role")
            content = turn.get("content") or turn.get("text", "")
            if role in ["user", "assistant", "bot"] and content:
                messages.append({
                    "role": "assistant" if role == "bot" else role,
                    "content": content
                })

    # Add current question
    messages.append({"role": "user", "content": question})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.65,
        "max_tokens": 850
    }

    try:
        res = requests.post(OPENAI_ENDPOINT, json=payload, headers=headers, timeout=20)
        if res.status_code == 200:
            data = res.json()
            raw_text = data["choices"][0]["message"]["content"]
            # Extract suggestions if present
            lines = raw_text.split("\n")
            clean_lines = []
            suggestions = []
            for l in lines:
                if l.strip().startswith("[SUGGESTION]"):
                    sug = l.replace("[SUGGESTION]", "").strip().strip('"')
                    if sug:
                        suggestions.append(sug)
                else:
                    clean_lines.append(l)

            return {
                "answer": "\n".join(clean_lines).strip(),
                "suggestions": suggestions,
                "model": "OpenAI GPT-4o-mini",
                "explainable": True
            }
        else:
            logger.warning(f"OpenAI error status {res.status_code}: {res.text}")
            return None
    except Exception as e:
        logger.error(f"OpenAI call exception: {e}")
        return None


# ─── COMPREHENSIVE EXPLAINABLE PERSONAL AGRO-ASSISTANT ENGINE (FALLBACK / LOCAL) ───

EXPLAINABLE_KNOWLEDGE_BASE = {
    "early_blight": {
        "name": "Early Blight (Alternaria solani)",
        "why": (
            "**Why It Occurs (Pathogen Biology):**\n"
            "• Early Blight is caused by the necrotrophic fungus *Alternaria solani*.\n"
            "• Spores overwinter in infected plant debris or solanaceous weeds. When relative humidity exceeds 80% and temperatures sit between 24°C–29°C, the spores germinate within 2 hours.\n"
            "• The fungus penetrates leaf cuticle directly or through stomata, producing alternaric acid toxins that kill plant tissue, causing characteristic concentric target-board rings."
        ),
        "symptoms": (
            "• Oldest leaves develop brown to black circular lesions with yellow chlorotic halos.\n"
            "• Leaf tissue becomes brittle and drops, exposing developing fruit to sunscald."
        ),
        "organic": (
            "• **Neem Oil (10,000 ppm)**: 5ml/L water + mild surfactant; coats spore walls and disrupts germination.\n"
            "• **Trichoderma viride/harzianum**: 5g/L as foliar spray or soil drench; competes with and parasitizes pathogenic hyphae.\n"
            "• **Bacillus subtilis**: 3g/L bio-fungicide that secretes iturin peptides inhibiting fungal cell membranes."
        ),
        "chemical": (
            "• **Mancozeb 75% WP**: 2.0g to 2.5g per liter of water (protective multisite inhibitor; apply at first symptom).\n"
            "• **Chlorothalonil 75% WP**: 2.0g per liter (protects new foliage).\n"
            "• **Azoxystrobin 23% SC**: 1.0ml per liter (translaminar systemic control for active outbreaks).\n"
            "• *Safety*: Spray early morning (before 9 AM), wear nitrile gloves and mask, allow 7-day pre-harvest interval (PHI)."
        ),
        "cultural": (
            "• Prune bottom 20-30cm foliage to stop soil-splash spore transfer.\n"
            "• Switch immediately to drip irrigation; wet leaves encourage rapid spore propagation.\n"
            "• Mulch soil with clean straw or plastic mulch to seal soil-borne fungal inoculum."
        ),
        "follow_ups": [
            "What organic bio-fungicides can I spray immediately?",
            "How does drip irrigation stop early blight spread?",
            "What is the recommended pre-harvest interval (PHI) for Mancozeb?"
        ]
    },
    "late_blight": {
        "name": "Late Blight (Phytophthora infestans)",
        "why": (
            "**Why It Occurs (Oomycete Biology):**\n"
            "• Caused by the water mold *Phytophthora infestans* (an oomycete, not a true fungus).\n"
            "• Driven by cool temperatures (12°C–18°C night, 18°C–22°C day) combined with prolonged leaf wetness (>90% humidity).\n"
            "• Produces biflagellated swimming zoospores that swim through water films on leaves, encyst, and infect within 8 hours. Can destroy an entire field in 7–10 days if unmanaged."
        ),
        "symptoms": (
            "• Water-soaked, irregularly shaped greenish-black lesions that spread aggressively.\n"
            "• White cottony fungal down on leaf undersides during moist mornings.\n"
            "• Stems develop greasy brown-black lesions; fruit rots with firm brown marbled texture."
        ),
        "organic": (
            "• **Copper Hydroxide / Copper Oxychloride**: 2.5g/L water preventively; free copper ions denature fungal enzymes.\n"
            "• **Prophylactic bio-spray**: *Pseudomonas fluorescens* (5g/L) to establish protective bacterial antagonism."
        ),
        "chemical": (
            "• **Metalaxyl + Mancozeb (Ridomil MZ)**: 2.5g/L water (systemic curative + protective barrier).\n"
            "• **Cymoxanil + Mancozeb (Curzate)**: 2.0g/L water (strong kickback activity within 48h of infection).\n"
            "• **Dimethomorph 50% WP**: 1.0g/L water during rapid spread."
        ),
        "cultural": (
            "• Immediately harvest or rogue out severely blackened plants into sealed bags (do not compost).\n"
            "• Ensure generous row spacing (60-75cm) for constant wind aeration.\n"
            "• Stop all overhead sprinkler watering."
        ),
        "follow_ups": [
            "How quickly does late blight destroy a crop?",
            "What is the difference between early blight and late blight?",
            "Can copper spray be used preventively before rainfall?"
        ]
    },
    "powdery_mildew": {
        "name": "Powdery Mildew",
        "why": (
            "**Why It Occurs (Pathogen Biology):**\n"
            "• Caused by obligate biotrophic fungi (e.g. *Erysiphe*, *Podosphaera*).\n"
            "• Unique because it thrives in dry atmospheric conditions with moderate temperatures (20°C–28°C) and shaded, crowded canopies.\n"
            "• Spores (conidia) do not require liquid water to germinate; in fact, free water can inhibit spore germination, making dense dry canopies ideal."
        ),
        "symptoms": (
            "• White, powdery talcum-like patches on upper leaf surfaces, petioles, and young stems.\n"
            "• Foliage yellows, curls inward, and dries up prematurely, reducing photosynthetic yield by 30-50%."
        ),
        "organic": (
            "• **Potassium Bicarbonate**: 4g/L water + few drops horticultural oil; alters surface pH to alkaline (pH > 8.0), rupturing fungal cell walls.\n"
            "• **Milk-Water Foliar Spray (1:9 ratio)**: Sunlight activates milk proteins to produce free radicals that neutralize powdery mildew.\n"
            "• **Neem Oil**: 5ml/L spray every 7 days."
        ),
        "chemical": (
            "• **Wettable Sulfur 80% WDG**: 2.5g to 3.0g per liter (do not apply if temperature exceeds 32°C to prevent sulfur burn).\n"
            "• **Hexaconazole 5% EC**: 1.0ml/L or **Myclobutanil 10% WP**: 1.0g/L for established infections."
        ),
        "cultural": (
            "• Prune excessive interior vines and sucker branches to increase sunlight penetration into lower canopy.\n"
            "• Avoid excessive Nitrogen fertilization, which produces succulent young tissue highly vulnerable to mildew."
        ),
        "follow_ups": [
            "How does baking soda or milk spray treat powdery mildew?",
            "Why does sulfur burn leaves in hot weather?",
            "How does sunlight prevent powdery mildew spread?"
        ]
    },
    "leaf_spot": {
        "name": "Cercospora / Septoria Leaf Spot",
        "why": (
            "**Why It Occurs (Mechanism):**\n"
            "• Fungal spores disperse via rain-splash and wind during warm, muggy spells.\n"
            "• Pathogen secretes cercosporin toxin, a photo-activated toxin that generates reactive oxygen species, disintegrating cell membranes when exposed to sunlight."
        ),
        "symptoms": (
            "• Small, circular lesions with grayish-white centers and distinct dark purple or brown borders.\n"
            "• Heavy infection causes extensive defoliation starting from the lowest leaves upward."
        ),
        "organic": (
            "• **Copper Oxychloride 50 WP**: 2.5g/L as a protective barrier.\n"
            "• **Trichoderma harzianum**: 5g/L foliar spray to suppress spore colonization."
        ),
        "chemical": (
            "• **Carbendazim 50% WP**: 1.0g/L or **Tebuconazole 25.9% EC**: 1.0ml/L water.\n"
            "• Apply at 10-14 day intervals until new foliage emerges symptom-free."
        ),
        "cultural": (
            "• Maintain 2-year crop rotation with non-host crops (e.g. cereals/legumes).\n"
            "• Deep plough post-harvest to bury infected stubble under 15cm of soil."
        ),
        "follow_ups": [
            "How do I prevent leaf spot from recurring next season?",
            "What crop rotation schedule works best?",
            "Can I save seeds from plants infected with leaf spot?"
        ]
    },
    "yellowing_leaves": {
        "name": "Foliage Chlorosis (Yellowing Leaves)",
        "why": (
            "**Why It Occurs (Biochemical Breakdown):**\n"
            "Yellowing indicates the breakdown or failure of chlorophyll synthesis. Key causes depend on location on the plant:\n"
            "1. **Nitrogen (N) Deficiency (Mobile nutrient)**: The plant moves Nitrogen from older bottom leaves to support young growing tips. Result: Bottom leaves turn pale yellow first while top remains green.\n"
            "2. **Iron (Fe) / Zinc (Zn) Deficiency (Immobile nutrients)**: The plant cannot relocate these. Result: Interveinal chlorosis on the newest, topmost leaves.\n"
            "3. **Overwatering / Root Hypoxia**: Waterlogged soil suffocates root hairs, preventing oxygen uptake. Roots rot, cutting off nutrient transport.\n"
            "4. **Root-Knot Nematodes or Root Rot**: Damaged roots fail to uptake water, mimicking nutrient starvation."
        ),
        "symptoms": (
            "• Uniform yellowing on bottom leaves = Nitrogen shortage or root suffocation.\n"
            "• Yellow tissue between green veins on top leaves = Iron or Zinc deficiency.\n"
            "• Yellowing with brown leaf margins and curling = Potassium deficiency."
        ),
        "organic": (
            "• **Vermicompost Tea / Well-decomposed FYM**: 500g/plant for sustained organic nitrogen and micronutrients.\n"
            "• **Fish Amino Acid (FAA) or Jeevamrutha**: 5ml/L foliar spray for rapid nitrogen absorption."
        ),
        "chemical": (
            "• For Bottom Leaf Yellowing: Apply **19:19:19 (Water Soluble NPK)** @ 5g/L foliar or Urea (1%) spray.\n"
            "• For Top Interveinal Chlorosis: Apply **Chelated Iron (Fe-EDTA 12%)** @ 1.0g/L + **Zinc Sulfate (ZnSO₄ 21%)** @ 2g/L."
        ),
        "cultural": (
            "• Inspect soil drainage: Dig 10cm down; if muddy and foul-smelling, pause watering for 3–5 days.\n"
            "• Check soil pH: Extreme pH (< 5.5 or > 7.8) locks up micronutrients even if present in the soil."
        ),
        "follow_ups": [
            "Are the yellow leaves on the bottom or top of your plant?",
            "How often are you watering, and does water puddle in the beds?",
            "What is the best foliar spray for fast leaf recovery?"
        ]
    },
    "pests_insects": {
        "name": "Pest Infestation (Aphids, Whiteflies, Borers)",
        "why": (
            "**Why It Occurs (Ecological Dynamics):**\n"
            "• Sucking insects (Aphids, Thrips, Whiteflies) pierce plant phloem and drink sap rich in amino acids.\n"
            "• They excrete sticky honeydew, which fosters black sooty mold fungus on leaves, cutting off photosynthesis.\n"
            "• Crucially, sucking pests act as vectors for debilitating plant viruses (e.g., Tomato Leaf Curl Virus, Mosaic Virus)."
        ),
        "symptoms": (
            "• Curled or wrinkled leaves, stunted shoot tips, sticky residue on foliage.\n"
            "• Tiny winged insects swarm when plant canopy is gently shaken."
        ),
        "organic": (
            "• **Yellow & Blue Sticky Traps**: Place 10-12 traps per acre at canopy height to capture whiteflies and thrips.\n"
            "• **Neem Oil (10,000 ppm)**: 5ml + 2ml liquid soap per liter; acts as an anti-feedant and juvenile hormone disruptor.\n"
            "• **Beauveria bassiana**: 5g/L bio-pesticide that infects and consumes soft-bodied insects."
        ),
        "chemical": (
            "• **Imidacloprid 17.8% SL**: 0.5ml per liter water (systemic protection against sucking pests).\n"
            "• **Thiamethoxam 25% WG**: 0.3g per liter water.\n"
            "• For Caterpillars/Fruit Borers: **Chlorantraniliprole 18.5% SC** @ 0.3ml/L or **Emamectin Benzoate 5% SG** @ 0.4g/L."
        ),
        "cultural": (
            "• Spray during late evening (after 5:30 PM) to protect honeybees and pollinators.\n"
            "• Intercrop with marigold or basil to serve as natural trap and repellent borders."
        ),
        "follow_ups": [
            "How do I make a homemade organic pest spray?",
            "When is the best time of day to spray to protect pollinators?",
            "How do yellow sticky traps work?"
        ]
    }
}

def generate_local_explainable_response(
    question: str,
    crop: str,
    location: str,
    history: List[Dict[str, str]],
    crop_details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Generates an empathetic, explainable personal assistant response with agricultural reasoning."""
    q_lower = question.lower()

    # Determine topic
    matched_key = None
    if any(k in q_lower for k in ["early blight", "alternaria", "concentric ring"]):
        matched_key = "early_blight"
    elif any(k in q_lower for k in ["late blight", "phytophthora", "water soaked", "black rot"]):
        matched_key = "late_blight"
    elif any(k in q_lower for k in ["blight"]):
        matched_key = "early_blight"
    elif any(k in q_lower for k in ["powdery mildew", "white powder", "white spots", "mildew"]):
        matched_key = "powdery_mildew"
    elif any(k in q_lower for k in ["leaf spot", "cercospora", "septoria", "spots on leaf"]):
        matched_key = "leaf_spot"
    elif any(k in q_lower for k in ["yellow", "chlorosis", "pale leaf", "leaves turning yellow", "curling"]):
        matched_key = "yellowing_leaves"
    elif any(k in q_lower for k in ["pest", "aphid", "whitefly", "borer", "caterpillar", "bug", "insect", "mite", "thrip"]):
        matched_key = "pests_insects"

    greeting_salutation = "🌾 **Hello! I'm your AgriCare Personal Agronomy Assistant.**"

    # Multi-turn conversational acknowledgement
    turn_count = len(history) if history else 0
    continuity_note = ""
    if turn_count > 0:
        continuity_note = f"Following up on our conversation regarding your **{crop}** crop, here is my dedicated agronomist assessment:\n\n"
    else:
        continuity_note = f"I'm here to support your **{crop}** cultivation in {location}. Let's address your query step-by-step:\n\n"

    if matched_key and matched_key in EXPLAINABLE_KNOWLEDGE_BASE:
        kb = EXPLAINABLE_KNOWLEDGE_BASE[matched_key]
        answer = (
            f"{greeting_salutation}\n\n"
            f"{continuity_note}"
            f"### 🌿 Diagnosis & Clinical Overview: {kb['name']}\n"
            f"{kb['symptoms']}\n\n"
            f"### 🔬 Scientific Explanation (Why This Happens):\n"
            f"{kb['why']}\n\n"
            f"### 🧪 Step-by-Step Treatment & Recovery Plan:\n"
            f"**1. Organic & Biological Solutions:**\n{kb['organic']}\n\n"
            f"**2. Chemical Protective Options (If Spread is Aggressive):**\n{kb['chemical']}\n\n"
            f"### 🛡️ Cultural Management & Future Prevention:\n"
            f"{kb['cultural']}\n\n"
            f"💡 **My Personal Advice**: Before spraying any broad chemical, test on 2–3 plants to verify tolerance, and always apply in early morning or evening hours."
        )
        suggestions = kb.get("follow_ups", [
            f"What is the best irrigation routine for {crop}?",
            f"How do I prevent disease spread to neighboring plants?",
            "What organic fertilizers boost plant immunity?"
        ])
    elif any(k in q_lower for k in ["fertilizer", "npk", "nutrient", "manure", "compost", "urea", "potash"]):
        answer = (
            f"{greeting_salutation}\n\n"
            f"{continuity_note}"
            f"### 🌿 Balanced Nutrition Strategy for {crop}\n\n"
            f"**1. 🔬 Scientific Rationale (Nutrient Needs by Growth Stage):**\n"
            f"• **Vegetative Stage (Leaves & Stem)**: High Nitrogen (N) demand to synthesize chlorophyll, amino acids, and sturdy foliage.\n"
            f"• **Flowering & Fruit/Grain Setting**: High Phosphorus (P) for energetic root expansion and flower bud differentiation, paired with Potassium (K) to regulate stomatal water pressure and sugar translocation.\n"
            f"• **Maturity / Sizing Stage**: Potassium (K) and Calcium (Ca) are critical to prevent blossom end rot, crack resistance, and shelf life.\n\n"
            f"**2. 🧪 Recommended Regimen:**\n"
            f"• **Basal Dose**: Apply well-decomposed Farm Yard Manure (FYM) @ 10-12 tonnes/acre + Single Super Phosphate (SSP) before planting.\n"
            f"• **Foliar Nutrition**: Spray 19:19:19 (Water Soluble) @ 5g/L during vegetative growth.\n"
            f"• **Flowering Boost**: Switch to 0:52:34 (MKP) @ 4g/L to prevent flower drop.\n"
            f"• **Fruit / Harvest Quality**: Apply 13:0:45 (Potassium Nitrate) @ 5g/L + Boron (20%) @ 1g/L for uniform color and size.\n\n"
            f"💡 **Personal Assistant Tip**: Avoid applying high Nitrogen during cloudy or rainy weather; excess succulent growth makes plants targets for fungal blast and blight."
        )
        suggestions = [
            f"How do I know if my {crop} has nitrogen deficiency?",
            "How often should I spray 19:19:19 water-soluble fertilizer?",
            "Can I mix fertilizer and fungicide in the same spray tank?"
        ]
    elif any(k in q_lower for k in ["water", "irrigation", "drip", "moisture", "dry"]):
        answer = (
            f"{greeting_salutation}\n\n"
            f"{continuity_note}"
            f"### 💧 Water & Irrigation Management for {crop}\n\n"
            f"**1. 🔬 Why Irrigation Timing Matters (Agronomic Principle):**\n"
            f"• Plant root hairs require both moisture and dissolved oxygen (porosity) in the root zone. Chronic saturation suffocates roots (anaerobic hypoxia), causing *Pythium* and *Phytophthora* root rots.\n"
            f"• Overhead sprinkler irrigation wets canopy foliage for hours, creating a water film that activates fungal zoospores and bacterial blight.\n\n"
            f"**2. 🚜 Actionable Irrigation Guidelines:**\n"
            f"• **Method**: Drip irrigation is strongly advised. It delivers water directly to root zones, cutting disease pressure by 50% and saving 40% water.\n"
            f"• **Schedule**: Irrigate early in the morning (6 AM – 8 AM). Any accidental surface splashes dry quickly under rising sun.\n"
            f"• **Soil Moisture Check**: Squeeze a handful of soil from 10cm depth. If it forms a firm ball that easily breaks with a thumb touch, moisture is optimal. If it drips water, pause irrigation immediately."
        )
        suggestions = [
            "How do I test soil moisture without special tools?",
            "What happens if I water my crops in the midday heat?",
            "How does drip irrigation stop fungal diseases?"
        ]
    elif any(k in q_lower for k in ["hi", "hello", "hey", "namaste", "good morning", "good evening", "who are you"]):
        answer = (
            f"{greeting_salutation}\n\n"
            f"I'm your **personal agronomist and crop companion**. You can think of me as your 24/7 dedicated farm assistant!\n\n"
            f"I don't just give you raw data — I explain the biological science behind what happens in your field and give you tailored, step-by-step solutions for:\n"
            f"• 🩺 **Disease Diagnostics & Explanations** (Why diseases happen & how to stop them)\n"
            f"• 🌿 **Organic & Chemical Spray Schedules** (Exact dosages, timings & safety precautions)\n"
            f"• 🌾 **Crop-Specific Growth Guides** (From planting through flowering to harvest)\n"
            f"• 🧪 **Nutrient & Soil Advisory** (NPK, micronutrients, soil pH management)\n"
            f"• 🐛 **Eco-Friendly Pest Management** (Targeted insect & weed control)\n\n"
            f"👉 *How is your **{crop}** looking today? Are you noticing any leaf discoloration, spots, or pest activity?*"
        )
        suggestions = [
            f"My {crop} leaves are turning yellow, what should I do?",
            f"What is the best fertilizer schedule for {crop}?",
            "How do I control fungal blight organically?"
        ]
    else:
        # General intelligent agro response
        answer = (
            f"{greeting_salutation}\n\n"
            f"{continuity_note}"
            f"Regarding **\"{question}\"** for your **{crop}**:\n\n"
            f"### 🌿 Agronomic Evaluation & Recommendations:\n"
            f"1. **Observe the Canopy**: Examine whether symptoms appear on the lower older foliage or the newest top shoots. Lower leaves typically signal mobile nutrient deficiencies (N, P, K) or soil-splash fungal spores, whereas upper leaves indicate micronutrient deficits or viral vector feeding.\n"
            f"2. **Microclimate & Humidity Control**: Maintain adequate plant-to-plant spacing (45–60 cm) and eliminate weed undergrowth. Good aeration drastically reduces humidity traps where pathogens thrive.\n"
            f"3. **Protective Measures**: During transitional weather (high humidity or sudden temperature swings), apply a preventive bio-agent like *Trichoderma viride* (5g/L) or cold-pressed Neem Oil (5ml/L) to establish an initial shield.\n"
            f"4. **Nutrient Synergy**: Ensure soil pH is maintained between 6.0 and 7.2. Out-of-range pH restricts root uptake regardless of fertilizer quantity applied.\n\n"
            f"💬 *Could you share a bit more detail? Are you seeing spots, leaf curling, wilting, or pest webs? I'll be glad to provide an exact step-by-step prescription!*"
        )
        suggestions = [
            f"How do I identify leaf diseases early on {crop}?",
            "What organic foliar spray builds plant resistance?",
            "How does weather impact disease outbreaks?"
        ]

    return {
        "answer": answer,
        "suggestions": suggestions,
        "model": "AgriCare Intelligent Explainable Assistant",
        "explainable": True
    }


def get_advisor_response(
    question: str,
    crop_context: Optional[str] = None,
    user_location: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None,
    crop_details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Main entry point for AI Advisor:
    1. Tries OpenAI GPT-4o-mini with comprehensive agronomist persona.
    2. Gracefully falls back to local Explainable Agro Engine if quota exhausted or offline.
    """
    crop = crop_context or "Tomato"
    loc = user_location or "your local farm"
    hist = history or []

    # Attempt OpenAI first
    openai_res = call_openai_chat(
        question=question,
        history=hist,
        crop_context=crop,
        user_location=loc,
        crop_details=crop_details,
    )

    if openai_res and openai_res.get("answer"):
        return openai_res

    # Fallback to local explainable personal assistant engine
    return generate_local_explainable_response(
        question=question,
        crop=crop,
        location=loc,
        history=hist,
        crop_details=crop_details,
    )
