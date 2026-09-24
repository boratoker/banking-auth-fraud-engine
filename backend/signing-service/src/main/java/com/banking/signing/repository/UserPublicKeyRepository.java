package com.banking.signing.repository;

import com.banking.signing.model.UserPublicKey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserPublicKeyRepository extends JpaRepository<UserPublicKey, Long> {
    Optional<UserPublicKey> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);
}
