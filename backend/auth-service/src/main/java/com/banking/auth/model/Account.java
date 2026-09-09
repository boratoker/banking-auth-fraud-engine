package com.banking.auth.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Banka Hesabı Entity'si
 * Vadesiz TL, Vadeli Birikim (%48.5 Faiz), USD ve EUR Döviz hesaplarını temsil eder.
 */
@Entity
@Table(name = "accounts", indexes = {
    @Index(name = "idx_accounts_user_id", columnList = "user_id"),
    @Index(name = "idx_accounts_iban", columnList = "iban")
})
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "account_number", unique = true, nullable = false, length = 30)
    private String accountNumber;

    @Column(unique = true, nullable = false, length = 34)
    private String iban;

    @Column(nullable = false, length = 100)
    private String name;

    /** DEMAND (Vadesiz), TIME_DEPOSIT (Vadeli), FOREX (Döviz) */
    @Column(name = "account_type", nullable = false, length = 20)
    private String accountType;

    /** TRY, USD, EUR, XAU */
    @Column(nullable = false, length = 5)
    private String currency;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal balance = BigDecimal.ZERO;

    /** Vadeli hesaplar için faiz oranı (ör: 48.5) */
    @Column(name = "interest_rate", precision = 5, scale = 2)
    private BigDecimal interestRate;

    /** Vadeli hesaplar için vade sonu */
    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    /** ACTIVE, FROZEN, CLOSED */
    @Column(nullable = false, length = 15)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Account() {}

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

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getIban() { return iban; }
    public void setIban(String iban) { this.iban = iban; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }

    public LocalDate getMaturityDate() { return maturityDate; }
    public void setMaturityDate(LocalDate maturityDate) { this.maturityDate = maturityDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
