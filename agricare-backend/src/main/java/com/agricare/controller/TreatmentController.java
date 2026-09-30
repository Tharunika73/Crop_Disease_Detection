package com.agricare.controller;

import com.agricare.dto.TreatmentRequest;
import com.agricare.dto.TreatmentResponse;
import com.agricare.model.Crop;
import com.agricare.model.Treatment;
import com.agricare.model.User;
import com.agricare.repository.CropRepository;
import com.agricare.repository.TreatmentRepository;
import com.agricare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/treatments")
@RequiredArgsConstructor
public class TreatmentController {

    private final TreatmentRepository treatmentRepository;
    private final CropRepository cropRepository;
    private final UserRepository userRepository;

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping("/crop/{cropId}")
    public ResponseEntity<?> getTreatmentsByCrop(@PathVariable Long cropId, Authentication auth) {
        User user = currentUser(auth);
        Crop crop = cropRepository.findById(cropId).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }
        List<TreatmentResponse> list = treatmentRepository.findByCropIdOrderByCreatedAtDesc(cropId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> createTreatment(@RequestBody TreatmentRequest req, Authentication auth) {
        User user = currentUser(auth);
        Crop crop = cropRepository.findById(req.getCropId()).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }

        Treatment treatment = Treatment.builder()
                .crop(crop)
                .treatmentType(req.getTreatmentType())
                .treatmentDescription(req.getTreatmentDescription())
                .productName(req.getProductName())
                .applicationDate(req.getApplicationDate() != null ? req.getApplicationDate() : LocalDate.now())
                .followUpDate(req.getFollowUpDate())
                .notes(req.getNotes())
                .result("APPLIED")
                .build();

        treatmentRepository.save(treatment);
        return ResponseEntity.ok(toResponse(treatment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTreatment(@PathVariable Long id, @RequestBody Map<String, String> updates, Authentication auth) {
        User user = currentUser(auth);
        Treatment t = treatmentRepository.findById(id).orElse(null);
        if (t == null || !t.getCrop().getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Treatment not found"));
        }

        if (updates.containsKey("result")) t.setResult(updates.get("result"));
        if (updates.containsKey("notes")) t.setNotes(updates.get("notes"));
        if (updates.containsKey("followUpDate") && updates.get("followUpDate") != null) {
            t.setFollowUpDate(LocalDate.parse(updates.get("followUpDate")));
        }

        treatmentRepository.save(t);
        return ResponseEntity.ok(toResponse(t));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTreatment(@PathVariable Long id, Authentication auth) {
        User user = currentUser(auth);
        Treatment t = treatmentRepository.findById(id).orElse(null);
        if (t == null || !t.getCrop().getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Treatment not found"));
        }
        treatmentRepository.delete(t);
        return ResponseEntity.ok(Map.of("message", "Treatment deleted successfully"));
    }

    private TreatmentResponse toResponse(Treatment t) {
        TreatmentResponse r = new TreatmentResponse();
        r.setId(t.getId());
        r.setCropId(t.getCrop().getId());
        r.setCropName(t.getCrop().getCropName());
        r.setTreatmentType(t.getTreatmentType());
        r.setTreatmentDescription(t.getTreatmentDescription());
        r.setProductName(t.getProductName());
        r.setApplicationDate(t.getApplicationDate());
        r.setFollowUpDate(t.getFollowUpDate());
        r.setResult(t.getResult());
        r.setNotes(t.getNotes());
        r.setCreatedAt(t.getCreatedAt());
        return r;
    }
}
