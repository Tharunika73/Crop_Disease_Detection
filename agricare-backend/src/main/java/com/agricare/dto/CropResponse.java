package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CropResponse {
    private Long id;
    private Long fieldId;
    private String fieldName;
    private Long farmId;
    private String farmName;
    private String cropName;
    private String variety;
    private LocalDate sowingDate;
    private LocalDate expectedHarvestDate;
    private String growthStage;
    private String status;
    private String notes;
    private LocalDateTime createdAt;
    private int cropAgeDays;
    private int totalSessions;
    private AiAnalysisSummary latestAnalysis;
}
