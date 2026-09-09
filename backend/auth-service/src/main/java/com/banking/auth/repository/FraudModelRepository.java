package com.banking.auth.repository;

import com.banking.auth.model.FraudModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FraudModelRepository extends JpaRepository<FraudModel, UUID> {
    Optional<FraudModel> findByIsActiveTrue();
}
