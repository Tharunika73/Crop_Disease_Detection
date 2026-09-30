package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ChatHistoryItem {
    private Long id;
    private String question;
    private String answer;
    private LocalDateTime createdAt;
}
