package com.agricare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "monitoring_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonitoringSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crop_id", nullable = false)
    private Crop crop;

    @Column(name = "observation_date")
    @Builder.Default
    private LocalDateTime observationDate = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "health_status")
    @Builder.Default
    private String healthStatus = "PENDING"; // HEALTHY, MONITORING, ATTENTION, TREATMENT, PENDING

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "monitoringSession", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PlantImage> images;

    @OneToOne(mappedBy = "monitoringSession", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private AiAnalysis aiAnalysis;
}
