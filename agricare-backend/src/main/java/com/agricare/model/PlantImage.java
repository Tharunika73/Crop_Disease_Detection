package com.agricare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plant_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlantImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "monitoring_session_id", nullable = false)
    private MonitoringSession monitoringSession;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "image_type")
    @Builder.Default
    private String imageType = "LEAF"; // LEAF, WHOLE_PLANT, STEM, FRUIT

    @Column(name = "uploaded_at")
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
