package com.banking.auth.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Güvenlik Denetim Log Entity'si
 * Login, transfer, fraud tespiti ve oturum sonlandırma gibi tüm güvenlik
 * olaylarının değiştirilemez (immutable) denetim kaydı.
 */
@Entity
@Table(name = "security_audit_logs", indexes = {
    @Index(name = "idx_audit_user_id", columnList = "user_id"),
    @Index(name = "idx_audit_event_type", columnList = "event_type"),
    @Index(name = "idx_audit_created_at", columnList = "created_at")
})
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * Olay tipi.
     * Ör: LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_FAILED, OTP_VERIFIED,
     *     TRANSFER_COMPLETED, ML_FRAUD_FLAGGED, TRANSFER_BLOCKED,
     *     SESSION_TERMINATED, CARD_FROZEN, SETTINGS_CHANGED
     */
    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    /** INFO, WARN, ERROR, CRITICAL */
    @Column(nullable = false, length = 10)
    private String severity;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /** Ek JSON metadata */
    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public SecurityAuditLog() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
