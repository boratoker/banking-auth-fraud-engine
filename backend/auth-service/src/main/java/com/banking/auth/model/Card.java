package com.banking.auth.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Sanal & Platinum Kart Entity'si
 * Kart dondurma, internet/yurt dışı izinleri ve harcama limiti yönetimi.
 */
@Entity
@Table(name = "cards", indexes = {
    @Index(name = "idx_cards_user_id", columnList = "user_id"),
    @Index(name = "idx_cards_account_id", columnList = "account_id")
})
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(name = "card_number_masked", nullable = false, length = 25)
    private String cardNumberMasked;

    @Column(name = "card_number_encrypted", nullable = false, length = 512)
    private String cardNumberEncrypted;

    @Column(name = "card_holder", nullable = false, length = 100)
    private String cardHolder;

    @Column(name = "expiry_date", nullable = false, length = 5)
    private String expiryDate;

    @Column(name = "cvv_encrypted", nullable = false, length = 512)
    private String cvvEncrypted;

    /** VIRTUAL_PLATINUM, DEBIT, CREDIT */
    @Column(name = "card_type", nullable = false, length = 25)
    private String cardType;

    @Column(name = "is_frozen", nullable = false)
    private boolean isFrozen = false;

    @Column(name = "internet_allowed", nullable = false)
    private boolean internetAllowed = true;

    @Column(name = "overseas_allowed", nullable = false)
    private boolean overseasAllowed = false;

    @Column(name = "total_limit", precision = 19, scale = 2)
    private BigDecimal totalLimit;

    @Column(name = "current_spent", precision = 19, scale = 2)
    private BigDecimal currentSpent = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Card() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }

    public String getCardNumberMasked() { return cardNumberMasked; }
    public void setCardNumberMasked(String cardNumberMasked) { this.cardNumberMasked = cardNumberMasked; }

    public String getCardNumberEncrypted() { return cardNumberEncrypted; }
    public void setCardNumberEncrypted(String cardNumberEncrypted) { this.cardNumberEncrypted = cardNumberEncrypted; }

    public String getCardHolder() { return cardHolder; }
    public void setCardHolder(String cardHolder) { this.cardHolder = cardHolder; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

    public String getCvvEncrypted() { return cvvEncrypted; }
    public void setCvvEncrypted(String cvvEncrypted) { this.cvvEncrypted = cvvEncrypted; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public boolean isFrozen() { return isFrozen; }
    public void setFrozen(boolean frozen) { isFrozen = frozen; }

    public boolean isInternetAllowed() { return internetAllowed; }
    public void setInternetAllowed(boolean internetAllowed) { this.internetAllowed = internetAllowed; }

    public boolean isOverseasAllowed() { return overseasAllowed; }
    public void setOverseasAllowed(boolean overseasAllowed) { this.overseasAllowed = overseasAllowed; }

    public BigDecimal getTotalLimit() { return totalLimit; }
    public void setTotalLimit(BigDecimal totalLimit) { this.totalLimit = totalLimit; }

    public BigDecimal getCurrentSpent() { return currentSpent; }
    public void setCurrentSpent(BigDecimal currentSpent) { this.currentSpent = currentSpent; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
