package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class FarmResponse {
    private Long id;
    private String farmName;
    private String location;
    private String district;
    private String state;
    private String country;
    private Double area;
    private String areaUnit;
    private String description;
    private LocalDateTime createdAt;
    private int fieldCount;
    private int cropCount;
}
