import requests
import io
import time
import uuid
from PIL import Image

BASE = "http://127.0.0.1:8000"

def test_full_pipeline():
    print("=== 1. Health Check ===")
    r = requests.get(f"{BASE}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("PASS: Health check OK ->", r.json())

    unique_suffix = str(uuid.uuid4())[:6]
    email = f"farmer_{unique_suffix}@agricare.com"
    password = "SecurePassword123!"

    print("\n=== 2. User Registration ===")
    reg_payload = {
        "email": email,
        "password": password,
        "full_name": f"Farmer {unique_suffix.upper()}",
        "region": "Erode, Tamil Nadu"
    }
    r = requests.post(f"{BASE}/auth/register", json=reg_payload)
    assert r.status_code == 200, f"Registration failed: {r.text}"
    reg_data = r.json()
    print("PASS: User registered ->", reg_data.get("email"), "Role:", reg_data.get("role"))

    print("\n=== 3. User Login ===")
    login_payload = {"email": email, "password": password}
    r = requests.post(f"{BASE}/auth/login", json=login_payload)
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("PASS: Logged in successfully, token received.")

    print("\n=== 4. Fetch User Profile (/auth/me) ===")
    r = requests.get(f"{BASE}/auth/me", headers=headers)
    assert r.status_code == 200, f"Profile fetch failed: {r.text}"
    print("PASS: Current user verified ->", r.json().get("full_name"), "(", r.json().get("region"), ")")

    print("\n=== 5. Create Farm ===")
    farm_payload = {
        "farm_name": "AgriCare Model Smart Farm",
        "location": "Perundurai, Erode",
        "total_area": 15.5,
        "area_unit": "Acre",
        "soil_type": "Red Loam",
        "climate_zone": "Semi-Arid Tropical"
    }
    r = requests.post(f"{BASE}/farms", json=farm_payload, headers=headers)
    assert r.status_code in (200, 201), f"Farm creation failed: {r.text}"
    farm = r.json()
    farm_id = farm["id"]
    print("PASS: Farm created -> ID:", farm_id, "Name:", farm["farm_name"])

    print("\n=== 6. Create Field ===")
    field_payload = {
        "farm_id": farm_id,
        "field_name": "Block-A Tomato & Chili Zone",
        "area": 5.0,
        "area_unit": "Acre",
        "soil_type": "Red Sandy Loam",
        "irrigation_method": "Drip Irrigation",
        "water_source": "Borewell",
        "sunlight_condition": "Full Sun",
        "description": "High-density drip-irrigated plot"
    }
    r = requests.post(f"{BASE}/fields", json=field_payload, headers=headers)
    assert r.status_code in (200, 201), f"Field creation failed: {r.text}"
    field = r.json()
    field_id = field["id"]
    print("PASS: Field created -> ID:", field_id, "Name:", field["field_name"])

    print("\n=== 7. Create Crop ===")
    crop_payload = {
        "field_id": field_id,
        "crop_name": "Tomato",
        "variety": "Roma Hybrid",
        "sowing_date": "2026-08-10",
        "expected_harvest_date": "2026-11-25",
        "growth_stage": "Vegetative / Early Flowering",
        "seed_source": "TNAU Certified Seeds",
        "soil_type": "Red Sandy Loam",
        "irrigation_method": "Drip Irrigation",
        "fertilizer_used": "NPK 19:19:19 + Bio-fertilizer Azospirillum",
        "previous_disease_history": "Leaf spot spotted in previous crop cycle"
    }
    r = requests.post(f"{BASE}/crops", json=crop_payload, headers=headers)
    assert r.status_code in (200, 201), f"Crop creation failed: {r.text}"
    crop = r.json()
    crop_id = crop["id"]
    print("PASS: Crop created -> ID:", crop_id, "Crop:", crop["crop_name"], "(", crop["variety"], ")")

    print("\n=== 8. Upload Leaf Image for Monitoring & AI Disease Analysis ===")
    img = Image.new("RGB", (300, 300), color=(40, 160, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    files = [("images", ("leaf_test_sample.jpg", buf, "image/jpeg"))]
    data = {"notes": "Observing slight yellow halos on outer foliage."}
    r = requests.post(f"{BASE}/monitoring/crop/{crop_id}/upload", headers=headers, files=files, data=data)
    assert r.status_code in (200, 201), f"Image upload & analysis failed: {r.text}"
    session_res = r.json()
    print("PASS: Monitoring session created -> Session ID:", session_res.get("id"))
    analysis = session_res.get("analysis")
    if analysis:
        print("      AI Disease Detected :", analysis.get("disease"))
        print("      Health Status       :", analysis.get("health_status"))
        print("      Confidence          :", f"{analysis.get('confidence', 0) * 100:.1f}%")
        print("      Severity            :", analysis.get("severity"))
        print("      Trend Comparison    :", analysis.get("change_from_previous"))
        print("      Grad-CAM Heatmap    :", analysis.get("gradcamUrl"))
        print("      Risk Band           :", analysis.get("riskBand"))
        print("      Trajectory          :", analysis.get("trajectory") or "Baseline Scan")
        print("      Symptoms (XAI)      :", (analysis.get("symptoms") or "")[:60] + "...")
        print("      Advisory (XAI)      :", (analysis.get("recommendations") or "")[:60] + "...")

    print("\n=== 8b. Follow-Up Monitoring Scan (Trajectory & Trend Verification) ===")
    img2 = Image.new("RGB", (300, 300), color=(35, 175, 45))
    buf2 = io.BytesIO()
    img2.save(buf2, format="JPEG")
    buf2.seek(0)
    files2 = [("images", ("leaf_followup.jpg", buf2, "image/jpeg"))]
    data2 = {"notes": "Follow-up monitoring 5 days post-treatment."}
    r2 = requests.post(f"{BASE}/monitoring/crop/{crop_id}/upload", headers=headers, files=files2, data=data2)
    assert r2.status_code in (200, 201), f"Follow-up scan failed: {r2.text}"
    session2 = r2.json()
    analysis2 = session2.get("analysis")
    print("PASS: Follow-up monitoring session logged -> ID:", session2.get("id"))
    if analysis2:
        print("      AI Disease Detected :", analysis2.get("disease"))
        print("      Trend Comparison    :", analysis2.get("change_from_previous"))
        print("      Trajectory          :", analysis2.get("trajectory"))
        print("      Grad-CAM Heatmap    :", analysis2.get("gradcamUrl"))
        print("      Risk Band           :", analysis2.get("riskBand"))

    print("\n=== 9. Log Treatment Plan ===")
    treatment_payload = {
        "crop_id": crop_id,
        "treatment_type": "ORGANIC_FUNGICIDE",
        "product_name": "Neem Oil Extract (1500 ppm) + Trichoderma viride",
        "dosage": "5 ml per litre of water",
        "application_method": "Foliar Spray",
        "applied_date": "2026-09-28",
        "notes": "Applied in early evening to avoid sunlight degradation."
    }
    r = requests.post(f"{BASE}/treatments", json=treatment_payload, headers=headers)
    assert r.status_code in (200, 201), f"Treatment logging failed: {r.text}"
    treatment = r.json()
    print("PASS: Treatment logged -> ID:", treatment.get("id"), "Product:", treatment.get("product_name"))

    print("\n=== 10. Fetch Reminders ===")
    r = requests.get(f"{BASE}/reminders", headers=headers)
    assert r.status_code == 200, f"Fetch reminders failed: {r.text}"
    reminders = r.json()
    print(f"PASS: Active Reminders retrieved ({len(reminders)} pending)")
    for rem in reminders[:2]:
        t_str = str(rem.get("title", "")).encode("ascii", "replace").decode("ascii")
        m_str = str(rem.get("message", "")).encode("ascii", "replace").decode("ascii")
        print("      -", t_str, ":", m_str)

    print("\n=== 11. Fetch Dashboard Analytics ===")
    r = requests.get(f"{BASE}/dashboard", headers=headers)
    assert r.status_code == 200, f"Dashboard fetch failed: {r.text}"
    dash = r.json()
    print("PASS: Dashboard stats retrieved successfully ->")
    print("      Total Farms       :", dash.get("total_farms"))
    print("      Total Crops       :", dash.get("total_crops"))
    print("      Total Scans       :", dash.get("total_scans"))
    print("      Healthy Crops     :", dash.get("healthy_crops"))
    print("      Attention Needed  :", dash.get("attention_needed"))

    print("\n=== 12. AgriCare AI Assistant / Chatbot Query ===")
    chat_payload = {
        "question": "What preventive measures should I take for fungal blight on tomatoes during humid weather?",
        "crop_context": f"Crop: Tomato {crop.get('variety')}, Status: {crop.get('status')}"
    }
    r = requests.post(f"{BASE}/ai/chat", json=chat_payload, headers=headers)
    assert r.status_code == 200, f"Chatbot query failed: {r.text}"
    chat_resp = r.json()
    reply_snip = str(chat_resp.get("reply", "")[:180]).encode("ascii", "replace").decode("ascii")
    print("PASS: AI Assistant replied ->")
    print("      Response snippet:", reply_snip + "...")

    print("\n" + "="*50)
    print(" ALL VALIDATION TESTS PASSED SUCCESSFULLY! ")
    print("="*50)

if __name__ == "__main__":
    test_full_pipeline()
