package com.agricare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "treatments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Treatment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crop_id", nullable = false)
    private Crop crop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id")
    private AiAnalysis aiAnalysis;

    @Column(name = "treatment_type")
    private String treatmentType; // CHEMICAL, BIOLOGICAL, CULTURAL, MECHANICAL

    @Column(name = "treatment_description", columnDefinition = "TEXT")
    private String treatmentDescription;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "application_date")
    private LocalDate applicationDate;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    private String result; // EFFECTIVE, PARTIAL, INEFFECTIVE, PENDING

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
