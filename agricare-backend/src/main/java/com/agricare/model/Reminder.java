package com.agricare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reminders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crop_id", nullable = false)
    private Crop crop;

    @Column(name = "reminder_type")
    private String reminderType; // PHOTO_UPLOAD, TREATMENT_FOLLOWUP, IRRIGATION, HARVEST, GENERAL

    @Column(name = "reminder_date")
    private LocalDateTime reminderDate;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Builder.Default
    private String status = "PENDING"; // PENDING, SENT, DISMISSED

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
