package com.banking.auth.repository;

import com.banking.auth.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    List<UserSession> findByUserIdAndIsActiveTrue(UUID userId);
    List<UserSession> findByUserId(UUID userId);
    java.util.Optional<UserSession> findFirstByUserIdAndDeviceFingerprintOrderByLastActiveAtDesc(UUID userId, String deviceFingerprint);

    @Query("select s from UserSession s join fetch s.user where s.sessionTokenHash = :hash")
    java.util.Optional<UserSession> findBySessionTokenHash(@Param("hash") String hash);
}
