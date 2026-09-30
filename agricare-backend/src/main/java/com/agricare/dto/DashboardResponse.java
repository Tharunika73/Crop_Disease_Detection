package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class DashboardResponse {
    private long totalFarms;
    private long totalFields;
    private long totalCrops;
    private long healthyCrops;
    private long monitoringCrops;
    private long attentionCrops;
    private long treatmentCrops;
    private List<MonitoringSessionResponse> recentAnalyses;
    private List<ReminderResponse> upcomingReminders;
    private List<ChatHistoryItem> recentQuestions;
}
