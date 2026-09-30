package com.agricare.controller;

import com.agricare.dto.*;
import com.agricare.model.*;
import com.agricare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/crops")
@RequiredArgsConstructor
public class CropController {

    private final CropRepository cropRepository;
    private final FieldRepository fieldRepository;
    private final UserRepository userRepository;
    private final MonitoringSessionRepository sessionRepository;
    private final AiAnalysisRepository analysisRepository;

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping
    public List<CropResponse> listAllCrops(Authentication auth) {
        User user = currentUser(auth);
        return cropRepository.findAllByUserId(user.getId()).stream()
                .map(this::toCropResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/field/{fieldId}")
    public ResponseEntity<?> getCropsByField(@PathVariable Long fieldId, Authentication auth) {
        User user = currentUser(auth);
        Field field = fieldRepository.findById(fieldId).orElse(null);
        if (field == null || !field.getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Field not found"));
        }
        List<CropResponse> crops = cropRepository.findByFieldId(fieldId).stream()
                .map(this::toCropResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(crops);
    }

    @PostMapping
    public ResponseEntity<?> createCrop(@RequestBody CropRequest req, Authentication auth) {
        User user = currentUser(auth);
        Field field = fieldRepository.findById(req.getFieldId()).orElse(null);
        if (field == null || !field.getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Field not found"));
        }
        Crop crop = Crop.builder()
                .field(field)
                .cropName(req.getCropName())
                .variety(req.getVariety())
                .sowingDate(req.getSowingDate())
                .expectedHarvestDate(req.getExpectedHarvestDate())
                .growthStage(req.getGrowthStage())
                .seedSource(req.getSeedSource())
                .soilType(req.getSoilType())
                .irrigationMethod(req.getIrrigationMethod())
                .fertilizerUsed(req.getFertilizerUsed())
                .previousDiseaseHistory(req.getPreviousDiseaseHistory())
                .notes(req.getNotes())
                .build();
        cropRepository.save(crop);
        return ResponseEntity.ok(toCropResponse(crop));
    }

    @GetMapping("/{cropId}")
    public ResponseEntity<?> getCrop(@PathVariable Long cropId, Authentication auth) {
        User user = currentUser(auth);
        Crop crop = cropRepository.findById(cropId).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }
        return ResponseEntity.ok(toCropResponse(crop));
    }

    @PutMapping("/{cropId}")
    public ResponseEntity<?> updateCrop(@PathVariable Long cropId, @RequestBody CropRequest req, Authentication auth) {
        User user = currentUser(auth);
        Crop crop = cropRepository.findById(cropId).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }
        if (req.getCropName() != null) crop.setCropName(req.getCropName());
        if (req.getVariety() != null) crop.setVariety(req.getVariety());
        if (req.getGrowthStage() != null) crop.setGrowthStage(req.getGrowthStage());
        if (req.getNotes() != null) crop.setNotes(req.getNotes());
        cropRepository.save(crop);
        return ResponseEntity.ok(toCropResponse(crop));
    }

    @DeleteMapping("/{cropId}")
    public ResponseEntity<?> deleteCrop(@PathVariable Long cropId, Authentication auth) {
        User user = currentUser(auth);
        Crop crop = cropRepository.findById(cropId).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }
        cropRepository.delete(crop);
        return ResponseEntity.ok(Map.of("message", "Crop deleted"));
    }

    private CropResponse toCropResponse(Crop c) {
        CropResponse r = new CropResponse();
        r.setId(c.getId());
        r.setFieldId(c.getField().getId());
        r.setFieldName(c.getField().getFieldName());
        r.setFarmId(c.getField().getFarm().getId());
        r.setFarmName(c.getField().getFarm().getFarmName());
        r.setCropName(c.getCropName());
        r.setVariety(c.getVariety());
        r.setSowingDate(c.getSowingDate());
        r.setExpectedHarvestDate(c.getExpectedHarvestDate());
        r.setGrowthStage(c.getGrowthStage());
        r.setStatus(c.getStatus());
        r.setNotes(c.getNotes());
        r.setCreatedAt(c.getCreatedAt());
        if (c.getSowingDate() != null) {
            r.setCropAgeDays((int) ChronoUnit.DAYS.between(c.getSowingDate(), LocalDate.now()));
        }
        r.setTotalSessions((int) sessionRepository.countByCropId(c.getId()));

        // Latest analysis summary
        sessionRepository.findTopByCropIdOrderByObservationDateDesc(c.getId()).ifPresent(session -> {
            analysisRepository.findByMonitoringSessionId(session.getId()).ifPresent(analysis -> {
                AiAnalysisSummary s = new AiAnalysisSummary();
                s.setId(analysis.getId());
                s.setHealthStatus(analysis.getHealthStatus());
                s.setDisease(analysis.getDisease());
                s.setConfidence(analysis.getConfidence());
                s.setSeverity(analysis.getSeverity());
                s.setChangeFromPrevious(analysis.getChangeFromPrevious());
                s.setAnalyzedAt(analysis.getCreatedAt());
                r.setLatestAnalysis(s);
            });
        });
        return r;
    }
}
