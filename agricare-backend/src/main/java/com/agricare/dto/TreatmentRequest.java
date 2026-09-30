package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TreatmentRequest {
    private Long cropId;
    private Long analysisId;
    private String treatmentType;
    private String treatmentDescription;
    private String productName;
    private LocalDate applicationDate;
    private LocalDate followUpDate;
    private String notes;
}
