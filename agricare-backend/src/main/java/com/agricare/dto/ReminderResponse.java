package com.agricare.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ReminderResponse {
    private Long id;
    private Long cropId;
    private String cropName;
    private String reminderType;
    private String title;
    private String message;
    private LocalDateTime reminderDate;
    private String status;
}
