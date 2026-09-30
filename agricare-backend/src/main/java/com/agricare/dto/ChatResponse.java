package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ChatResponse {
    private String answer;
    private String sessionId;
    private LocalDateTime timestamp;
}
