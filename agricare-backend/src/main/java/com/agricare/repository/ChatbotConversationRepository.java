package com.agricare.repository;

import com.agricare.model.ChatbotConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatbotConversationRepository extends JpaRepository<ChatbotConversation, Long> {
    List<ChatbotConversation> findByUserIdOrderByCreatedAtDesc(Long userId);
}
