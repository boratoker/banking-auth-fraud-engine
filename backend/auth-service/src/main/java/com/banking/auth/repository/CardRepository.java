package com.banking.auth.repository;

import com.banking.auth.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CardRepository extends JpaRepository<Card, UUID> {
    List<Card> findByUserId(UUID userId);
    List<Card> findByUserIdAndCardType(UUID userId, String cardType);
}
