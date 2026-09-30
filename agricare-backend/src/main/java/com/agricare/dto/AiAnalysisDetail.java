package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AiAnalysisDetail {
    private Long id;
    private String cropIdentified;
    private String healthStatus;
    private String disease;
    private Double confidence;
    private String symptoms;
    private String possibleCauses;
    private String severity;
    private Double severityPercentage;
    private String recommendations;
    private String prevention;
    private Integer followUpDays;
    private String changeFromPrevious;
    private String changeDescription;
    private LocalDateTime createdAt;
}
