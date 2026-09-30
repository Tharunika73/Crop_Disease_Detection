package com.agricare.repository;

import com.agricare.model.Crop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface CropRepository extends JpaRepository<Crop, Long> {
    List<Crop> findByFieldId(Long fieldId);

    @Query("SELECT c FROM Crop c WHERE c.field.farm.user.id = :userId")
    List<Crop> findAllByUserId(Long userId);

    @Query("SELECT COUNT(c) FROM Crop c WHERE c.field.farm.user.id = :userId")
    long countByUserId(Long userId);

    @Query("SELECT COUNT(c) FROM Crop c WHERE c.field.farm.user.id = :userId AND c.status = :status")
    long countByUserIdAndStatus(Long userId, String status);
}
