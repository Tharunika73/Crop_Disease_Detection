package com.agricare.controller;

import com.agricare.dto.*;
import com.agricare.model.*;
import com.agricare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final CropRepository cropRepository;
    private final RestTemplate restTemplate;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @PostMapping
    public ResponseEntity<ChatResponse> ask(@RequestBody ChatRequest req, Authentication auth) {
        User user = currentUser(auth);

        String cropContext = null;
        if (req.getCropId() != null) {
            cropRepository.findById(req.getCropId()).ifPresent(c ->
                    req.setCropId(c.getId()));
            cropContext = cropRepository.findById(req.getCropId())
                    .map(c -> c.getCropName() + (c.getVariety() != null ? " (" + c.getVariety() + ")" : "") +
                            (c.getGrowthStage() != null ? ", Stage: " + c.getGrowthStage() : ""))
                    .orElse(null);
        }

        String answer = getAiAnswer(req.getQuestion(), cropContext, user);

        ChatbotConversation conv = ChatbotConversation.builder()
                .user(user)
                .sessionId(req.getSessionId() != null ? req.getSessionId() : UUID.randomUUID().toString())
                .question(req.getQuestion())
                .answer(answer)
                .cropContext(cropContext)
                .build();
        conversationRepository.save(conv);

        ChatResponse resp = new ChatResponse();
        resp.setAnswer(answer);
        resp.setSessionId(conv.getSessionId());
        resp.setTimestamp(LocalDateTime.now());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/history")
    public List<ChatHistoryItem> history(Authentication auth) {
        User user = currentUser(auth);
        return conversationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .limit(50)
                .map(c -> {
                    ChatHistoryItem item = new ChatHistoryItem();
                    item.setId(c.getId());
                    item.setQuestion(c.getQuestion());
                    item.setAnswer(c.getAnswer());
                    item.setCreatedAt(c.getCreatedAt());
                    return item;
                }).collect(Collectors.toList());
    }

    private String getAiAnswer(String question, String cropContext, User user) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("question", question);
            body.put("crop_context", cropContext);
            body.put("user_location", user.getLocation());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(aiServiceUrl + "/ai/chat", entity, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("answer")) {
                return (String) response.getBody().get("answer");
            }
        } catch (Exception ignored) {}

        // Fallback knowledge base
        return generateFallbackAnswer(question, cropContext);
    }

    private String generateFallbackAnswer(String question, String cropContext) {
        String q = question.toLowerCase();
        String ctx = cropContext != null ? "For your " + cropContext + ": " : "";

        if (q.contains("yellow") || q.contains("yellowing")) {
            return ctx + """
**Why Leaves Turn Yellow – Possible Reasons:**

1. **Nitrogen deficiency** – Most common cause; older leaves turn yellow first
2. **Overwatering** – Roots cannot absorb nutrients in waterlogged soil
3. **Underwatering** – Plants redirect resources, older leaves suffer first
4. **Disease** – Fungal/bacterial infections can cause yellowing
5. **Natural aging** – Lower leaves naturally yellow as the plant matures

**What You Should Check:**
✓ Soil moisture (not too wet, not too dry)
✓ Lower leaves vs. upper leaves (nitrogen = lower leaves first)
✓ Spots or lesions on yellowing leaves (disease sign)
✓ Root health if possible (brown/mushy = root rot)

**What You Can Do:**
• Apply balanced fertilizer if nitrogen deficiency is suspected
• Adjust irrigation schedule
• Upload a clear leaf photo for more specific analysis

*If yellowing is rapid and spreading, consult a local agricultural officer.*
""";
        }

        if (q.contains("irrigat") || q.contains("water")) {
            return ctx + """
**Irrigation Guidance:**

**General Principles:**
• Water deeply and less frequently rather than lightly and often
• Morning watering reduces disease risk from overnight moisture
• Check soil moisture before irrigating (finger test: 2 inches deep)

**Signs of Water Stress:**
• Wilting during the hottest part of the day
• Dry, cracked soil surface
• Curling or dropping leaves

**Signs of Overwatering:**
• Yellowing leaves
• Root rot smell
• Fungal growth at soil level

**For Most Field Crops:**
• Critical stages needing consistent moisture: germination, flowering, grain filling
• Reduce irrigation as harvest approaches

*Specific irrigation needs depend on your crop, soil type, and local climate.*
""";
        }

        if (q.contains("fertili")) {
            return ctx + """
**Fertilizer Guidance:**

**Key Nutrients:**
• **N (Nitrogen)** – Promotes leaf and stem growth (leafy crops need more)
• **P (Phosphorus)** – Root development, flowering, fruiting
• **K (Potassium)** – Overall plant health, disease resistance

**General Tips:**
1. Conduct a soil test before applying fertilizer
2. Apply in split doses rather than one large application
3. Apply when rain is expected (not immediately before heavy rain)
4. Keep fertilizer away from plant stem/base

**Organic Options:**
• Compost – improves soil structure + slow-release nutrients
• Vermicompost – excellent balanced nutrition
• Green manure / legume rotation

*Always follow product label instructions. Over-fertilization can damage crops.*
""";
        }

        if (q.contains("pest") || q.contains("insect") || q.contains("bug")) {
            return ctx + """
**Pest Management:**

**Identify First:**
• Look at the underside of leaves for eggs or insects
• Note the type of damage: holes, tunneling, sticky residue, webbing

**Integrated Pest Management (IPM) Approach:**
1. **Monitor regularly** – Early detection is key
2. **Cultural controls** – Proper spacing, sanitation, crop rotation
3. **Biological controls** – Encourage natural predators (ladybugs, parasitic wasps)
4. **Mechanical controls** – Sticky traps, physical removal
5. **Chemical control** – Last resort; use registered pesticides only

**Before Spraying Any Pesticide:**
⚠️ Verify the product is registered for your crop and pest
⚠️ Follow the label dose exactly
⚠️ Wear protective equipment
⚠️ Observe pre-harvest intervals
⚠️ Spray in the evening to protect pollinators

*Upload a clear photo of the pest or damage for more specific advice.*
""";
        }

        if (q.contains("harvest") || q.contains("when to pick")) {
            return ctx + """
**Harvest Timing Guidance:**

**General Indicators:**
• Fruit/grain reaches expected size and color
• Seeds are mature and firm
• Natural drying of outer leaves (for grains)
• Taste test (for vegetables/fruits)

**Harvest at the Right Time:**
• Too early: Poor quality, low yield
• Too late: Over-ripening, pest/disease risk, post-harvest losses

**Post-Harvest Handling:**
1. Handle gently to prevent bruising
2. Cool quickly after harvest (if applicable)
3. Store in appropriate temperature and humidity
4. Keep harvest away from field soil/pests

*Check crop-specific harvest indicators for your variety.*
""";
        }

        // Default generic response
        return ctx + """
Thank you for your question: *""" + question + """
*

To give you the most accurate advice, I'd be helpful to know:
1. Which crop are you growing?
2. What stage of growth is it at?
3. What specific symptoms or challenges are you seeing?
4. Can you upload a photo of the affected area?

**General Tip:** Regular crop monitoring, proper irrigation, balanced nutrition, and early pest detection are the foundations of healthy crop management.

*You can also upload a crop photo for AI-based health analysis.*
""";
    }
}
