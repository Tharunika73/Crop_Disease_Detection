package com.agricare.controller;

import com.agricare.dto.*;
import com.agricare.model.*;
import com.agricare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final FarmRepository farmRepository;
    private final FieldRepository fieldRepository;
    private final CropRepository cropRepository;
    private final MonitoringSessionRepository sessionRepository;
    private final AiAnalysisRepository analysisRepository;
    private final ReminderRepository reminderRepository;
    private final ChatbotConversationRepository chatbotRepository;
    private final UserRepository userRepository;

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(Authentication auth) {
        User user = currentUser(auth);
        Long userId = user.getId();

        DashboardResponse resp = new DashboardResponse();
        resp.setTotalFarms(farmRepository.countByUserId(userId));
        resp.setTotalFields(fieldRepository.countByUserId(userId));
        resp.setTotalCrops(cropRepository.countByUserId(userId));

        resp.setHealthyCrops(cropRepository.countByUserIdAndStatus(userId, "HEALTHY"));
        resp.setMonitoringCrops(cropRepository.countByUserIdAndStatus(userId, "MONITORING"));
        resp.setAttentionCrops(cropRepository.countByUserIdAndStatus(userId, "ATTENTION"));
        resp.setTreatmentCrops(cropRepository.countByUserIdAndStatus(userId, "TREATMENT"));

        // Recent analyses
        List<MonitoringSessionResponse> recentSessions = sessionRepository.findRecentByUserId(userId).stream()
                .limit(5)
                .map(this::toSessionResponse)
                .collect(Collectors.toList());
        resp.setRecentAnalyses(recentSessions);

        // Upcoming reminders
        List<ReminderResponse> reminders = reminderRepository.findPendingByUserId(userId).stream()
                .limit(5)
                .map(this::toReminderResponse)
                .collect(Collectors.toList());
        resp.setUpcomingReminders(reminders);

        // Recent chatbot questions
        List<ChatHistoryItem> questions = chatbotRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .limit(5)
                .map(c -> {
                    ChatHistoryItem item = new ChatHistoryItem();
                    item.setId(c.getId());
                    item.setQuestion(c.getQuestion());
                    item.setAnswer(c.getAnswer());
                    item.setCreatedAt(c.getCreatedAt());
                    return item;
                })
                .collect(Collectors.toList());
        resp.setRecentQuestions(questions);

        return ResponseEntity.ok(resp);
    }

    private MonitoringSessionResponse toSessionResponse(MonitoringSession s) {
        MonitoringSessionResponse r = new MonitoringSessionResponse();
        r.setId(s.getId());
        r.setCropId(s.getCrop().getId());
        r.setObservationDate(s.getObservationDate());
        r.setHealthStatus(s.getHealthStatus());
        r.setNotes(s.getNotes());

        if (s.getImages() != null) {
            r.setImageUrls(s.getImages().stream().map(PlantImage::getImageUrl).collect(Collectors.toList()));
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

    private ReminderResponse toReminderResponse(Reminder r) {
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
