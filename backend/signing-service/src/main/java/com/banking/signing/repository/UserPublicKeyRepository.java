package com.banking.signing.repository;

import com.banking.signing.model.UserPublicKey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserPublicKeyRepository extends JpaRepository<UserPublicKey, Long> {
    List<UserPublicKey> findAllByUserId(UUID userId);
    Optional<UserPublicKey> findByUserIdAndPublicKey(UUID userId, String publicKey);
    boolean existsByUserId(UUID userId);
}
