package com.agricare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_analyses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "monitoring_session_id", nullable = false)
    private MonitoringSession monitoringSession;

    @Column(name = "crop_identified")
    private String cropIdentified;

    @Column(name = "health_status")
    private String healthStatus;  // HEALTHY, MONITORING, ATTENTION, TREATMENT, UNKNOWN

    private String disease;

    private Double confidence;

    @Column(columnDefinition = "TEXT")
    private String symptoms;

    @Column(name = "possible_causes", columnDefinition = "TEXT")
    private String possibleCauses;

    private String severity; // LOW, MODERATE, HIGH, CRITICAL

    @Column(name = "severity_percentage")
    private Double severityPercentage;

    @Column(name = "recommendations", columnDefinition = "TEXT")
    private String recommendations;

    @Column(columnDefinition = "TEXT")
    private String prevention;

    @Column(name = "follow_up_days")
    @Builder.Default
    private Integer followUpDays = 5;

    @Column(name = "change_from_previous")
    private String changeFromPrevious; // IMPROVING, WORSENING, STABLE, FIRST_SCAN, UNCERTAIN

    @Column(name = "change_description", columnDefinition = "TEXT")
    private String changeDescription;

    @Column(name = "raw_ai_response", columnDefinition = "TEXT")
    private String rawAiResponse;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
