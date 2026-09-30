package com.agricare.repository;

import com.agricare.model.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDateTime;
import java.util.List;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    List<Reminder> findByCropId(Long cropId);

    @Query("SELECT r FROM Reminder r WHERE r.crop.field.farm.user.id = :userId AND r.status = 'PENDING' ORDER BY r.reminderDate ASC")
    List<Reminder> findPendingByUserId(Long userId);

    @Query("SELECT r FROM Reminder r WHERE r.status = 'PENDING' AND r.reminderDate <= :now")
    List<Reminder> findDueReminders(LocalDateTime now);
}
