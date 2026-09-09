package com.banking.auth.repository;

import com.banking.auth.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /** Son N işlemi getir */
    List<Transaction> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);

    /** Belirli bir IBAN'a yapılan transfer sayısı (recipient novelty feature) */
    long countByUserIdAndDestIban(UUID userId, String destIban);

    /** Son 1 saatteki transfer adedi (velocity feature) */
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.user.id = :userId AND t.createdAt >= :since")
    long countTransactionsSince(@Param("userId") UUID userId, @Param("since") LocalDateTime since);

    /** Son 24 saatteki toplam çıkan tutar (daily spending feature) */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user.id = :userId AND t.amount < 0 AND t.createdAt >= :since")
    BigDecimal sumOutgoingAmountSince(@Param("userId") UUID userId, @Param("since") LocalDateTime since);

    /** Son 30 günlük ortalama transfer tutarı (amount ratio feature) */
    @Query("SELECT COALESCE(AVG(ABS(t.amount)), 0) FROM Transaction t WHERE t.user.id = :userId AND t.createdAt >= :since")
    BigDecimal avgTransferAmountSince(@Param("userId") UUID userId, @Param("since") LocalDateTime since);

    /** En son işlem zamanı (time since last tx feature) */
    @Query("SELECT MAX(t.createdAt) FROM Transaction t WHERE t.user.id = :userId")
    LocalDateTime findLastTransactionTime(@Param("userId") UUID userId);
}
