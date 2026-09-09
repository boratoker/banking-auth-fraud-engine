package com.banking.auth.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Kayıtlı Alıcılar (Hızlı Rehber) Entity'si
 * Transfer ekranında hızlı kişi seçimi için kullanıcının kaydettiği alıcılar.
 */
@Entity
@Table(name = "beneficiary_contacts", indexes = {
    @Index(name = "idx_beneficiary_user_id", columnList = "user_id")
})
public class BeneficiaryContact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 34)
    private String iban;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(length = 50)
    private String alias;

    @Column(name = "is_favorite", nullable = false)
    private boolean isFavorite = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public BeneficiaryContact() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getIban() { return iban; }
    public void setIban(String iban) { this.iban = iban; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getAlias() { return alias; }
    public void setAlias(String alias) { this.alias = alias; }

    public boolean isFavorite() { return isFavorite; }
    public void setFavorite(boolean favorite) { isFavorite = favorite; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
