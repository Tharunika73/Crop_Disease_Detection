package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class FieldRequest {
    private Long farmId;
    private String fieldName;
    private Double area;
    private String areaUnit = "Acre";
    private String soilType;
    private String irrigationMethod;
    private String waterSource;
    private String sunlightCondition;
    private String description;
}
