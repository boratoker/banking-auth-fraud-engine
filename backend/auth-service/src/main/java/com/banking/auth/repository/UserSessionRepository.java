package com.banking.auth.repository;

import com.banking.auth.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    List<UserSession> findByUserIdAndIsActiveTrue(UUID userId);
    List<UserSession> findByUserId(UUID userId);
}
