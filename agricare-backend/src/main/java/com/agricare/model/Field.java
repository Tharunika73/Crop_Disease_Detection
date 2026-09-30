package com.agricare.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "fields")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Field {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farm_id", nullable = false)
    private Farm farm;

    @Column(name = "field_name", nullable = false)
    private String fieldName;

    private Double area;

    @Column(name = "area_unit")
    @Builder.Default
    private String areaUnit = "Acre";

    @Column(name = "soil_type")
    private String soilType;

    @Column(name = "irrigation_method")
    private String irrigationMethod;

    @Column(name = "water_source")
    private String waterSource;

    @Column(name = "sunlight_condition")
    private String sunlightCondition;

    private String description;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "field", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Crop> crops;
}
