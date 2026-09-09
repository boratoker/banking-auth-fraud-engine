package com.banking.auth.repository;

import com.banking.auth.model.FraudEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FraudEvaluationRepository extends JpaRepository<FraudEvaluation, UUID> {
    Optional<FraudEvaluation> findByTransactionId(UUID transactionId);
}
