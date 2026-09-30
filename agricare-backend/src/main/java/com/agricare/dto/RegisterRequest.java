package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String phone;
    private String password;
    private String location;
    private String farmName;
    private String preferredLanguage = "en";
}
