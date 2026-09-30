package com.agricare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "crops")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Crop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private Field field;

    @Column(name = "crop_name", nullable = false)
    private String cropName;

    private String variety;

    @Column(name = "sowing_date")
    private LocalDate sowingDate;

    @Column(name = "expected_harvest_date")
    private LocalDate expectedHarvestDate;

    @Column(name = "growth_stage")
    private String growthStage;

    @Column(name = "seed_source")
    private String seedSource;

    @Column(name = "soil_type")
    private String soilType;

    @Column(name = "irrigation_method")
    private String irrigationMethod;

    @Column(name = "fertilizer_used")
    private String fertilizerUsed;

    @Column(name = "previous_disease_history", columnDefinition = "TEXT")
    private String previousDiseaseHistory;

    @Builder.Default
    private String status = "HEALTHY"; // HEALTHY, MONITORING, ATTENTION, TREATMENT

    private String notes;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "crop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<MonitoringSession> monitoringSessions;

    @OneToMany(mappedBy = "crop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Treatment> treatments;

    @OneToMany(mappedBy = "crop", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Reminder> reminders;
}
