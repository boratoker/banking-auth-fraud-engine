package com.banking.auth.repository;

import com.banking.auth.model.UserSecuritySettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SecuritySettingsRepository extends JpaRepository<UserSecuritySettings, UUID> {
    Optional<UserSecuritySettings> findByUserId(UUID userId);
}
