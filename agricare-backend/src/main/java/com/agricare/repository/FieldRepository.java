package com.agricare.repository;

import com.agricare.model.Field;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FieldRepository extends JpaRepository<Field, Long> {
    List<Field> findByFarmId(Long farmId);
    long countByFarmId(Long farmId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(f) FROM Field f WHERE f.farm.user.id = :userId")
    long countByUserId(Long userId);
}
