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
@RequestMapping("/api/farms")
@RequiredArgsConstructor
public class FarmController {

    private final FarmRepository farmRepository;
    private final UserRepository userRepository;
    private final FieldRepository fieldRepository;
    private final CropRepository cropRepository;

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping
    public List<FarmResponse> listFarms(Authentication auth) {
        User user = currentUser(auth);
        return farmRepository.findByUserId(user.getId()).stream()
                .map(f -> toFarmResponse(f))
                .collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> createFarm(@RequestBody FarmRequest req, Authentication auth) {
        User user = currentUser(auth);
        Farm farm = Farm.builder()
                .user(user)
                .farmName(req.getFarmName())
                .location(req.getLocation())
                .district(req.getDistrict())
                .state(req.getState())
                .country(req.getCountry())
                .area(req.getArea())
                .areaUnit(req.getAreaUnit() != null ? req.getAreaUnit() : "Acre")
                .description(req.getDescription())
                .gpsLat(req.getGpsLat())
                .gpsLng(req.getGpsLng())
                .build();
        farmRepository.save(farm);
        return ResponseEntity.ok(toFarmResponse(farm));
    }

    @GetMapping("/{farmId}")
    public ResponseEntity<?> getFarm(@PathVariable Long farmId, Authentication auth) {
        User user = currentUser(auth);
        Farm farm = farmRepository.findById(farmId).orElse(null);
        if (farm == null || !farm.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Farm not found"));
        }
        return ResponseEntity.ok(toFarmResponse(farm));
    }

    @PutMapping("/{farmId}")
    public ResponseEntity<?> updateFarm(@PathVariable Long farmId, @RequestBody FarmRequest req, Authentication auth) {
        User user = currentUser(auth);
        Farm farm = farmRepository.findById(farmId).orElse(null);
        if (farm == null || !farm.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Farm not found"));
        }
        if (req.getFarmName() != null) farm.setFarmName(req.getFarmName());
        if (req.getLocation() != null) farm.setLocation(req.getLocation());
        if (req.getDistrict() != null) farm.setDistrict(req.getDistrict());
        if (req.getState() != null) farm.setState(req.getState());
        if (req.getCountry() != null) farm.setCountry(req.getCountry());
        if (req.getArea() != null) farm.setArea(req.getArea());
        if (req.getAreaUnit() != null) farm.setAreaUnit(req.getAreaUnit());
        if (req.getDescription() != null) farm.setDescription(req.getDescription());
        farmRepository.save(farm);
        return ResponseEntity.ok(toFarmResponse(farm));
    }

    @DeleteMapping("/{farmId}")
    public ResponseEntity<?> deleteFarm(@PathVariable Long farmId, Authentication auth) {
        User user = currentUser(auth);
        Farm farm = farmRepository.findById(farmId).orElse(null);
        if (farm == null || !farm.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Farm not found"));
        }
        farmRepository.delete(farm);
        return ResponseEntity.ok(Map.of("message", "Farm deleted"));
    }

    private FarmResponse toFarmResponse(Farm f) {
        FarmResponse r = new FarmResponse();
        r.setId(f.getId());
        r.setFarmName(f.getFarmName());
        r.setLocation(f.getLocation());
        r.setDistrict(f.getDistrict());
        r.setState(f.getState());
        r.setCountry(f.getCountry());
        r.setArea(f.getArea());
        r.setAreaUnit(f.getAreaUnit());
        r.setDescription(f.getDescription());
        r.setCreatedAt(f.getCreatedAt());
        r.setFieldCount((int) fieldRepository.countByFarmId(f.getId()));
        return r;
    }
}
