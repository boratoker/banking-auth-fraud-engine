package com.banking.auth.repository;

import com.banking.auth.model.SecurityAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, UUID> {
    List<SecurityAuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<SecurityAuditLog> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
}
