package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TreatmentResponse {
    private Long id;
    private Long cropId;
    private String cropName;
    private String treatmentType;
    private String treatmentDescription;
    private String productName;
    private LocalDate applicationDate;
    private LocalDate followUpDate;
    private String result;
    private String notes;
    private LocalDateTime createdAt;
}
