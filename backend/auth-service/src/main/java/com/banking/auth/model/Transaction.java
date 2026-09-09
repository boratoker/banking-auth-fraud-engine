package com.banking.auth.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Finansal Transfer & İşlem Entity'si
 * FAST, Havale, EFT ve kart harcamaları dahil tüm hesap hareketlerini kapsar.
 * AI Fraud Shield ML modeli risk skoru ve karar bilgilerini taşır.
 */
@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_transactions_user_id", columnList = "user_id"),
    @Index(name = "idx_transactions_dest_iban", columnList = "dest_iban"),
    @Index(name = "idx_transactions_created_at", columnList = "created_at"),
    @Index(name = "idx_transactions_status", columnList = "status")
})
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "reference_id", unique = true, nullable = false, length = 30)
    private String referenceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_account_id")
    private Account sourceAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dest_account_id")
    private Account destAccount;

    @Column(name = "source_iban", length = 34)
    private String sourceIban;

    @Column(name = "dest_iban", length = 34)
    private String destIban;

    @Column(name = "recipient_name", length = 100)
    private String recipientName;

    @Column(name = "sender_name", length = 100)
    private String senderName;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 5)
    private String currency = "TRY";

    /** FAST, HAVALE, EFT, CARD_EXPENSE */
    @Column(name = "transfer_type", nullable = false, length = 20)
    private String transferType;

    /** Transfer, Alışveriş, Eğlence, Ulaşım, Fatura, Gelir */
    @Column(length = 30)
    private String category;

    @Column(length = 255)
    private String description;

    /** PENDING, PENDING_EVALUATION, OTP_CHALLENGED, COMPLETED, REJECTED, CANCELLED */
    @Column(nullable = false, length = 25)
    private String status = "PENDING";

    /** ML model tarafından hesaplanan risk skoru (0-100) */
    @Column(name = "risk_score", precision = 5, scale = 2)
    private BigDecimal riskScore;

    /** SAFE, LOW, MEDIUM, HIGH, CRITICAL */
    @Column(name = "risk_level", length = 15)
    private String riskLevel;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public Transaction() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.referenceId == null) {
            this.referenceId = "TXN-" + System.currentTimeMillis();
        }
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Account getSourceAccount() { return sourceAccount; }
    public void setSourceAccount(Account sourceAccount) { this.sourceAccount = sourceAccount; }

    public Account getDestAccount() { return destAccount; }
    public void setDestAccount(Account destAccount) { this.destAccount = destAccount; }

    public String getSourceIban() { return sourceIban; }
    public void setSourceIban(String sourceIban) { this.sourceIban = sourceIban; }

    public String getDestIban() { return destIban; }
    public void setDestIban(String destIban) { this.destIban = destIban; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getTransferType() { return transferType; }
    public void setTransferType(String transferType) { this.transferType = transferType; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getRiskScore() { return riskScore; }
    public void setRiskScore(BigDecimal riskScore) { this.riskScore = riskScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
