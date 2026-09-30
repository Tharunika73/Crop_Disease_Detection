package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MonitoringSessionResponse {
    private Long id;
    private Long cropId;
    private LocalDateTime observationDate;
    private String healthStatus;
    private String notes;
    private List<String> imageUrls;
    private AiAnalysisSummary analysis;
}
