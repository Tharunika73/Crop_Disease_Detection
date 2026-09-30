package com.agricare.controller;

import com.agricare.dto.*;
import com.agricare.model.*;
import com.agricare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/fields")
@RequiredArgsConstructor
public class FieldController {

    private final FieldRepository fieldRepository;
    private final FarmRepository farmRepository;
    private final UserRepository userRepository;
    private final CropRepository cropRepository;

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping("/farm/{farmId}")
    public ResponseEntity<?> getFieldsByFarm(@PathVariable Long farmId, Authentication auth) {
        User user = currentUser(auth);
        Farm farm = farmRepository.findById(farmId).orElse(null);
        if (farm == null || !farm.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Farm not found"));
        }
        List<FieldResponse> fields = fieldRepository.findByFarmId(farmId).stream()
                .map(this::toFieldResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(fields);
    }

    @PostMapping
    public ResponseEntity<?> createField(@RequestBody FieldRequest req, Authentication auth) {
        User user = currentUser(auth);
        Farm farm = farmRepository.findById(req.getFarmId()).orElse(null);
        if (farm == null || !farm.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Farm not found"));
        }
        Field field = Field.builder()
                .farm(farm)
                .fieldName(req.getFieldName())
                .area(req.getArea())
                .areaUnit(req.getAreaUnit() != null ? req.getAreaUnit() : "Acre")
                .soilType(req.getSoilType())
                .irrigationMethod(req.getIrrigationMethod())
                .waterSource(req.getWaterSource())
                .sunlightCondition(req.getSunlightCondition())
                .description(req.getDescription())
                .build();
        fieldRepository.save(field);
        return ResponseEntity.ok(toFieldResponse(field));
    }

    @GetMapping("/{fieldId}")
    public ResponseEntity<?> getField(@PathVariable Long fieldId, Authentication auth) {
        User user = currentUser(auth);
        Field field = fieldRepository.findById(fieldId).orElse(null);
        if (field == null || !field.getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Field not found"));
        }
        return ResponseEntity.ok(toFieldResponse(field));
    }

    @PutMapping("/{fieldId}")
    public ResponseEntity<?> updateField(@PathVariable Long fieldId, @RequestBody FieldRequest req, Authentication auth) {
        User user = currentUser(auth);
        Field field = fieldRepository.findById(fieldId).orElse(null);
        if (field == null || !field.getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Field not found"));
        }
        if (req.getFieldName() != null) field.setFieldName(req.getFieldName());
        if (req.getArea() != null) field.setArea(req.getArea());
        if (req.getSoilType() != null) field.setSoilType(req.getSoilType());
        if (req.getIrrigationMethod() != null) field.setIrrigationMethod(req.getIrrigationMethod());
        fieldRepository.save(field);
        return ResponseEntity.ok(toFieldResponse(field));
    }

    @DeleteMapping("/{fieldId}")
    public ResponseEntity<?> deleteField(@PathVariable Long fieldId, Authentication auth) {
        User user = currentUser(auth);
        Field field = fieldRepository.findById(fieldId).orElse(null);
        if (field == null || !field.getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Field not found"));
        }
        fieldRepository.delete(field);
        return ResponseEntity.ok(Map.of("message", "Field deleted"));
    }

    private FieldResponse toFieldResponse(Field f) {
        FieldResponse r = new FieldResponse();
        r.setId(f.getId());
        r.setFarmId(f.getFarm().getId());
        r.setFarmName(f.getFarm().getFarmName());
        r.setFieldName(f.getFieldName());
        r.setArea(f.getArea());
        r.setAreaUnit(f.getAreaUnit());
        r.setSoilType(f.getSoilType());
        r.setIrrigationMethod(f.getIrrigationMethod());
        r.setCreatedAt(f.getCreatedAt());
        r.setCropCount((int) cropRepository.countByUserIdAndStatus(null, null)); // field-level count from DB
        return r;
    }
}
