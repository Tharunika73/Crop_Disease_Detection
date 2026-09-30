package com.agricare.repository;

import com.agricare.model.Farm;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FarmRepository extends JpaRepository<Farm, Long> {
    List<Farm> findByUserId(Long userId);
    long countByUserId(Long userId);
}
