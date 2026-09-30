package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ChatRequest {
    private String question;
    private Long cropId;
    private String sessionId;
}
