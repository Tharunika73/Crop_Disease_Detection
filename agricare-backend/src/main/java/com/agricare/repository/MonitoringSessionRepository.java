package com.agricare.repository;

import com.agricare.model.MonitoringSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MonitoringSessionRepository extends JpaRepository<MonitoringSession, Long> {
    List<MonitoringSession> findByCropIdOrderByObservationDateDesc(Long cropId);
    Optional<MonitoringSession> findTopByCropIdOrderByObservationDateDesc(Long cropId);
    long countByCropId(Long cropId);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM MonitoringSession s WHERE s.crop.field.farm.user.id = :userId ORDER BY s.observationDate DESC")
    List<MonitoringSession> findRecentByUserId(Long userId);
}
