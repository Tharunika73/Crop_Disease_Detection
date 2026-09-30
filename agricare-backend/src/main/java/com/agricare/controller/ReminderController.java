package com.agricare.controller;

import com.agricare.dto.ReminderResponse;
import com.agricare.model.Crop;
import com.agricare.model.Reminder;
import com.agricare.model.User;
import com.agricare.repository.CropRepository;
import com.agricare.repository.ReminderRepository;
import com.agricare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderRepository reminderRepository;
    private final CropRepository cropRepository;
    private final UserRepository userRepository;

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping
    public List<ReminderResponse> getPendingReminders(Authentication auth) {
        User user = currentUser(auth);
        return reminderRepository.findPendingByUserId(user.getId()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/crop/{cropId}")
    public ResponseEntity<?> getRemindersByCrop(@PathVariable Long cropId, Authentication auth) {
        User user = currentUser(auth);
        Crop crop = cropRepository.findById(cropId).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }
        List<ReminderResponse> list = reminderRepository.findByCropId(cropId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> createReminder(@RequestBody Map<String, Object> req, Authentication auth) {
        User user = currentUser(auth);
        Long cropId = Long.valueOf(req.get("cropId").toString());
        Crop crop = cropRepository.findById(cropId).orElse(null);
        if (crop == null || !crop.getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Crop not found"));
        }

        LocalDateTime date = req.containsKey("reminderDate") && req.get("reminderDate") != null
                ? LocalDateTime.parse(req.get("reminderDate").toString())
                : LocalDateTime.now().plusDays(3);

        Reminder r = Reminder.builder()
                .crop(crop)
                .reminderType((String) req.getOrDefault("reminderType", "CUSTOM"))
                .title((String) req.getOrDefault("title", "Custom Reminder"))
                .message((String) req.getOrDefault("message", ""))
                .reminderDate(date)
                .status("PENDING")
                .build();

        reminderRepository.save(r);
        return ResponseEntity.ok(toResponse(r));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        User user = currentUser(auth);
        Reminder r = reminderRepository.findById(id).orElse(null);
        if (r == null || !r.getCrop().getField().getFarm().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Reminder not found"));
        }

        String status = body.getOrDefault("status", "COMPLETED");
        r.setStatus(status);
        reminderRepository.save(r);
        return ResponseEntity.ok(toResponse(r));
    }

    private ReminderResponse toResponse(Reminder r) {
        ReminderResponse resp = new ReminderResponse();
        resp.setId(r.getId());
        resp.setCropId(r.getCrop().getId());
        resp.setCropName(r.getCrop().getCropName());
        resp.setReminderType(r.getReminderType());
        resp.setTitle(r.getTitle());
        resp.setMessage(r.getMessage());
        resp.setReminderDate(r.getReminderDate());
        resp.setStatus(r.getStatus());
        return resp;
    }
}
