package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AuthResponse {
    private String token;
    private String name;
    private String email;
    private String role;
    private Long userId;
}
