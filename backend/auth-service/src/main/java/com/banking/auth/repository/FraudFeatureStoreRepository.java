package com.banking.auth.repository;

import com.banking.auth.model.FraudFeatureStore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FraudFeatureStoreRepository extends JpaRepository<FraudFeatureStore, UUID> {
    Optional<FraudFeatureStore> findByTransactionId(UUID transactionId);
}
