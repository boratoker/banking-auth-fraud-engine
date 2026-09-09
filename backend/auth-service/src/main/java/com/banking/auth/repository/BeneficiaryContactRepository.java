package com.banking.auth.repository;

import com.banking.auth.model.BeneficiaryContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BeneficiaryContactRepository extends JpaRepository<BeneficiaryContact, UUID> {
    List<BeneficiaryContact> findByUserId(UUID userId);
    boolean existsByUserIdAndIban(UUID userId, String iban);
}
