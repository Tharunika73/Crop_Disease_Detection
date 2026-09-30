package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class FarmRequest {
    private String farmName;
    private String location;
    private String district;
    private String state;
    private String country;
    private Double area;
    private String areaUnit = "Acre";
    private String description;
    private Double gpsLat;
    private Double gpsLng;
}
