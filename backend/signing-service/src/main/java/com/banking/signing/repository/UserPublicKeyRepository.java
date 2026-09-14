package com.banking.signing.repository;

import com.banking.signing.model.UserPublicKey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserPublicKeyRepository extends JpaRepository<UserPublicKey, Long> {
    Optional<UserPublicKey> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
}
