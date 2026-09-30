package com.agricare.repository;

import com.agricare.model.Treatment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TreatmentRepository extends JpaRepository<Treatment, Long> {
    List<Treatment> findByCropIdOrderByCreatedAtDesc(Long cropId);
}
