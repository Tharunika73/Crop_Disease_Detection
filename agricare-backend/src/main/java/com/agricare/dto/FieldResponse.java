package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class FieldResponse {
    private Long id;
    private Long farmId;
    private String farmName;
    private String fieldName;
    private Double area;
    private String areaUnit;
    private String soilType;
    private String irrigationMethod;
    private LocalDateTime createdAt;
    private int cropCount;
}
