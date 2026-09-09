package com.banking.auth.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Kullanıcı Güvenlik Tercihleri Entity'si
 * 2FA, biyometrik giriş, fraud bildirimleri ve günlük transfer limiti yönetimi.
 */
@Entity
@Table(name = "user_security_settings")
public class UserSecuritySettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(name = "two_factor_enabled", nullable = false)
    private boolean twoFactorEnabled = true;

    @Column(name = "biometrics_enabled", nullable = false)
    private boolean biometricsEnabled = true;

    @Column(name = "fraud_alerts_enabled", nullable = false)
    private boolean fraudAlertsEnabled = true;

    @Column(name = "daily_transfer_limit", precision = 19, scale = 2, nullable = false)
    private BigDecimal dailyTransferLimit = new BigDecimal("50000.00");

    @Column(name = "daily_spent_today", precision = 19, scale = 2, nullable = false)
    private BigDecimal dailySpentToday = BigDecimal.ZERO;

    @Column(name = "last_limit_reset_date")
    private LocalDate lastLimitResetDate;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UserSecuritySettings() {}

    @PrePersist
    protected void onCreate() {
        this.updatedAt = LocalDateTime.now();
        this.lastLimitResetDate = LocalDate.now();
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

    public boolean isTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }

    public boolean isBiometricsEnabled() { return biometricsEnabled; }
    public void setBiometricsEnabled(boolean biometricsEnabled) { this.biometricsEnabled = biometricsEnabled; }

    public boolean isFraudAlertsEnabled() { return fraudAlertsEnabled; }
    public void setFraudAlertsEnabled(boolean fraudAlertsEnabled) { this.fraudAlertsEnabled = fraudAlertsEnabled; }

    public BigDecimal getDailyTransferLimit() { return dailyTransferLimit; }
    public void setDailyTransferLimit(BigDecimal dailyTransferLimit) { this.dailyTransferLimit = dailyTransferLimit; }

    public BigDecimal getDailySpentToday() { return dailySpentToday; }
    public void setDailySpentToday(BigDecimal dailySpentToday) { this.dailySpentToday = dailySpentToday; }

    public LocalDate getLastLimitResetDate() { return lastLimitResetDate; }
    public void setLastLimitResetDate(LocalDate lastLimitResetDate) { this.lastLimitResetDate = lastLimitResetDate; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
