package com.agricare.repository;

import com.agricare.model.PlantImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlantImageRepository extends JpaRepository<PlantImage, Long> {
    List<PlantImage> findByMonitoringSessionId(Long sessionId);
}
