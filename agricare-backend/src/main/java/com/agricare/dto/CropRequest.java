package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CropRequest {
    private Long fieldId;
    private String cropName;
    private String variety;
    private LocalDate sowingDate;
    private LocalDate expectedHarvestDate;
    private String growthStage;
    private String seedSource;
    private String soilType;
    private String irrigationMethod;
    private String fertilizerUsed;
    private String previousDiseaseHistory;
    private String notes;
}
