package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AiAnalysisSummary {
    private Long id;
    private String healthStatus;
    private String disease;
    private Double confidence;
    private String severity;
    private String changeFromPrevious;
    private LocalDateTime analyzedAt;
}
