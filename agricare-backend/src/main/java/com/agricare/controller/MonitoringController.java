package com.agricare.controller;

import com.agricare.dto.*;
import com.agricare.model.*;
import com.agricare.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
public class MonitoringController {

    private final MonitoringSessionRepository sessionRepository;
    private final CropRepository cropRepository;
    private final AiAnalysisRepository analysisRepository;
    private final UserRepository userRepository;
    private final ReminderRepository reminderRepository;
    private final PlantImageRepository plantImageRepository;
    private final RestTemplate restTemplate;

    @Value("${upload.dir}")
    private String uploadDir;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping("/crop/{cropId}")
    public ResponseEntity<?> getSessionsByCrop(@PathVariable Long cropId, Authentication auth) {
        User user = currentUser(auth);
        Crop crop = cropRepository.findById(cropId).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }
        List<MonitoringSessionResponse> sessions = sessionRepository
                .findByCropIdOrderByObservationDateDesc(cropId).stream()
                .map(this::toSessionResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(sessions);
    }

    @PostMapping("/crop/{cropId}/upload")
    public ResponseEntity<?> uploadAndAnalyze(
            @PathVariable Long cropId,
            @RequestParam("images") List<MultipartFile> images,
            @RequestParam(value = "notes", required = false) String notes,
            Authentication auth) throws IOException {

        User user = currentUser(auth);
        Crop crop = cropRepository.findById(cropId).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }

        // Create monitoring session
        MonitoringSession session = MonitoringSession.builder()
                .crop(crop)
                .observationDate(LocalDateTime.now())
                .notes(notes)
                .healthStatus("PENDING")
                .build();
        sessionRepository.save(session);

        // Save uploaded images
        String uploadsPath = uploadDir + "/monitoring/" + cropId;
        Files.createDirectories(Paths.get(uploadsPath));

        List<String> imageUrls = new ArrayList<>();
        List<PlantImage> plantImages = new ArrayList<>();
        String primaryImagePath = null;

        for (MultipartFile file : images) {
            String filename = session.getId() + "_" + UUID.randomUUID() + "_"
                    + StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
            Path dest = Paths.get(uploadsPath, filename);
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
            String url = "/uploads/monitoring/" + cropId + "/" + filename;
            imageUrls.add(url);
            if (primaryImagePath == null) {
                primaryImagePath = dest.toAbsolutePath().toString();
            }

            PlantImage pi = PlantImage.builder()
                    .monitoringSession(session)
                    .imageUrl(url)
                    .imageType("LEAF")
                    .build();
            plantImages.add(plantImageRepository.save(pi));
        }
        session.setImages(plantImages);

        // Get previous analysis for comparison
        MonitoringSession previousSession = sessionRepository
                .findByCropIdOrderByObservationDateDesc(cropId).stream()
                .filter(s -> !s.getId().equals(session.getId()))
                .findFirst().orElse(null);
        AiAnalysis previousAnalysis = null;
        if (previousSession != null) {
            previousAnalysis = analysisRepository.findByMonitoringSessionId(previousSession.getId()).orElse(null);
        }

        // Call Python AI service
        AiAnalysis analysis = callAiService(session, crop, primaryImagePath, imageUrls, previousAnalysis);

        // Update session status
        session.setHealthStatus(analysis.getHealthStatus());
        sessionRepository.save(session);

        // Update crop status
        crop.setStatus(analysis.getHealthStatus());
        cropRepository.save(crop);

        // Schedule next reminder
        scheduleNextReminder(crop, analysis);

        MonitoringSessionResponse resp = toSessionResponse(session);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable Long sessionId, Authentication auth) {
        User user = currentUser(auth);
        MonitoringSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !session.getCrop().getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Session not found"));
        }
        return ResponseEntity.ok(toSessionResponse(session));
    }

    @GetMapping("/analysis/{id}")
    public ResponseEntity<?> getAnalysis(@PathVariable Long id, Authentication auth) {
        User user = currentUser(auth);
        AiAnalysis analysis = analysisRepository.findById(id).orElse(null);
        if (analysis == null || !analysis.getMonitoringSession().getCrop().getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Analysis not found"));
        }
        return ResponseEntity.ok(toAnalysisDetail(analysis));
    }

    private AiAnalysis callAiService(MonitoringSession session, Crop crop,
                                      String imagePath, List<String> imageUrls,
                                      AiAnalysis previousAnalysis) {
        AiAnalysis analysis;
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("crop_name", crop.getCropName());
            requestBody.put("variety", crop.getVariety());
            requestBody.put("growth_stage", crop.getGrowthStage());
            requestBody.put("image_path", imagePath);
            requestBody.put("image_urls", imageUrls);
            if (previousAnalysis != null) {
                requestBody.put("previous_disease", previousAnalysis.getDisease());
                requestBody.put("previous_severity", previousAnalysis.getSeverityPercentage());
                requestBody.put("previous_health_status", previousAnalysis.getHealthStatus());
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/ai/analyze", entity, Map.class);

            Map<String, Object> aiResult = response.getBody();
            analysis = buildAnalysisFromAiResponse(session, previousAnalysis, aiResult);

        } catch (Exception e) {
            // Fallback to mock analysis if AI service is unavailable
            analysis = buildMockAnalysis(session, crop, previousAnalysis);
        }

        analysisRepository.save(analysis);
        return analysis;
    }

    private AiAnalysis buildAnalysisFromAiResponse(MonitoringSession session,
                                                    AiAnalysis prev,
                                                    Map<String, Object> aiResult) {
        AiAnalysis a = new AiAnalysis();
        a.setMonitoringSession(session);
        a.setCropIdentified((String) aiResult.getOrDefault("crop_identified", "Unknown"));
        a.setHealthStatus((String) aiResult.getOrDefault("health_status", "MONITORING"));
        a.setDisease((String) aiResult.getOrDefault("disease", null));
        a.setConfidence(((Number) aiResult.getOrDefault("confidence", 0.7)).doubleValue());
        a.setSymptoms((String) aiResult.getOrDefault("symptoms", ""));
        a.setPossibleCauses((String) aiResult.getOrDefault("possible_causes", ""));
        a.setSeverity((String) aiResult.getOrDefault("severity", "LOW"));
        a.setSeverityPercentage(((Number) aiResult.getOrDefault("severity_percentage", 0)).doubleValue());
        a.setRecommendations((String) aiResult.getOrDefault("recommendations", "Continue regular monitoring."));
        a.setPrevention((String) aiResult.getOrDefault("prevention", ""));
        a.setFollowUpDays(((Number) aiResult.getOrDefault("follow_up_days", 5)).intValue());
        a.setChangeFromPrevious((String) aiResult.getOrDefault("change_from_previous", prev == null ? "FIRST_SCAN" : "STABLE"));
        a.setChangeDescription((String) aiResult.getOrDefault("change_description", ""));
        return a;
    }

    private AiAnalysis buildMockAnalysis(MonitoringSession session, Crop crop, AiAnalysis prev) {
        // Realistic mock analysis for development/demo
        Random rand = new Random();
        String[] diseases = {"Early Blight", "Leaf Spot", "Powdery Mildew", null, null};
        String[] statuses = {"HEALTHY", "MONITORING", "ATTENTION", "HEALTHY", "HEALTHY"};
        int idx = rand.nextInt(5);
        String disease = diseases[idx];
        String status = disease != null ? statuses[Math.min(idx, 2)] : "HEALTHY";
        double confidence = 0.65 + rand.nextDouble() * 0.30;
        double severity = disease != null ? 5 + rand.nextDouble() * 30 : 0;

        String change = prev == null ? "FIRST_SCAN" : (rand.nextBoolean() ? "IMPROVING" : "STABLE");

        AiAnalysis a = new AiAnalysis();
        a.setMonitoringSession(session);
        a.setCropIdentified(crop.getCropName());
        a.setHealthStatus(status);
        a.setDisease(disease);
        a.setConfidence(Math.round(confidence * 100.0) / 100.0);
        a.setSeverity(severity < 15 ? "LOW" : severity < 35 ? "MODERATE" : "HIGH");
        a.setSeverityPercentage(Math.round(severity * 10.0) / 10.0);
        a.setSymptoms(disease != null
                ? "Several leaves show brown circular spots with darker edges. Some surrounding tissue appears yellow. Symptoms are consistent with " + disease + "."
                : "No visible symptoms detected. Leaves appear green and healthy.");
        a.setPossibleCauses(disease != null
                ? "1. Fungal infection\n2. High leaf moisture\n3. Poor air circulation\n4. Overhead irrigation\n5. Infected plant debris"
                : "No issues identified.");
        a.setRecommendations(disease != null
                ? "1. Remove and dispose of severely affected leaves.\n2. Avoid overhead irrigation; use drip irrigation if possible.\n3. Improve airflow around plants.\n4. Monitor neighboring plants for similar symptoms.\n5. Consider biological fungicides as a first-line treatment.\n\nIMPORTANT: Before applying any pesticide or fungicide, verify the product is registered for this crop in your region, follow the product label, use appropriate protective equipment, and observe pre-harvest intervals."
                : "Continue regular monitoring. Upload photos every 5–7 days to track crop health.");
        a.setPrevention("Maintain proper plant spacing, avoid overwatering, use disease-resistant varieties, and practice crop rotation.");
        a.setFollowUpDays(disease != null ? 3 : 7);
        a.setChangeFromPrevious(change);
        a.setChangeDescription(change.equals("IMPROVING") ? "Compared with the previous observation, fewer affected leaves were noted."
                : change.equals("FIRST_SCAN") ? "This is the first monitoring record for this crop."
                : "No significant change observed compared with the previous check.");
        return a;
    }

    private void scheduleNextReminder(Crop crop, AiAnalysis analysis) {
        Reminder reminder = Reminder.builder()
                .crop(crop)
                .reminderType("PHOTO_UPLOAD")
                .reminderDate(LocalDateTime.now().plusDays(analysis.getFollowUpDays()))
                .title("📷 Photo Monitoring Reminder")
                .message(String.format("Your %s crop is due for its next health check. Upload a new photo to compare its condition with the previous observation.", crop.getCropName()))
                .status("PENDING")
                .build();
        reminderRepository.save(reminder);
    }

    private MonitoringSessionResponse toSessionResponse(MonitoringSession s) {
        MonitoringSessionResponse r = new MonitoringSessionResponse();
        r.setId(s.getId());
        r.setCropId(s.getCrop().getId());
        r.setObservationDate(s.getObservationDate());
        r.setHealthStatus(s.getHealthStatus());
        r.setNotes(s.getNotes());

        if (s.getImages() != null && !s.getImages().isEmpty()) {
            r.setImageUrls(s.getImages().stream().map(PlantImage::getImageUrl).collect(Collectors.toList()));
        } else {
            List<PlantImage> imgList = plantImageRepository.findByMonitoringSessionId(s.getId());
            r.setImageUrls(imgList.stream().map(PlantImage::getImageUrl).collect(Collectors.toList()));
        }

        analysisRepository.findByMonitoringSessionId(s.getId()).ifPresent(analysis -> {
            AiAnalysisSummary sum = new AiAnalysisSummary();
            sum.setId(analysis.getId());
            sum.setHealthStatus(analysis.getHealthStatus());
            sum.setDisease(analysis.getDisease());
            sum.setConfidence(analysis.getConfidence());
            sum.setSeverity(analysis.getSeverity());
            sum.setChangeFromPrevious(analysis.getChangeFromPrevious());
            sum.setAnalyzedAt(analysis.getCreatedAt());
            r.setAnalysis(sum);
        });
        return r;
    }

    private AiAnalysisDetail toAnalysisDetail(AiAnalysis a) {
        AiAnalysisDetail d = new AiAnalysisDetail();
        d.setId(a.getId());
        d.setCropIdentified(a.getCropIdentified());
        d.setHealthStatus(a.getHealthStatus());
        d.setDisease(a.getDisease());
        d.setConfidence(a.getConfidence());
        d.setSymptoms(a.getSymptoms());
        d.setPossibleCauses(a.getPossibleCauses());
        d.setSeverity(a.getSeverity());
        d.setSeverityPercentage(a.getSeverityPercentage());
        d.setRecommendations(a.getRecommendations());
        d.setPrevention(a.getPrevention());
        d.setFollowUpDays(a.getFollowUpDays());
        d.setChangeFromPrevious(a.getChangeFromPrevious());
        d.setChangeDescription(a.getChangeDescription());
        d.setCreatedAt(a.getCreatedAt());
        return d;
    }
}
