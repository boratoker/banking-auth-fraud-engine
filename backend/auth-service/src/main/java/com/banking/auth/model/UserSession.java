package com.banking.auth.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Aktif Oturum & Cihaz Parmak İzi Entity'si
 * Kullanıcının bağlı olduğu cihazlar, IP adresleri ve konum bilgilerini takip eder.
 */
@Entity
@Table(name = "user_sessions", indexes = {
    @Index(name = "idx_sessions_user_id", columnList = "user_id"),
    @Index(name = "idx_sessions_token_hash", columnList = "session_token_hash"),
    @Index(name = "idx_sessions_device_fp", columnList = "device_fingerprint")
})
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "session_token_hash", length = 512)
    private String sessionTokenHash;

    /** Ör: MacBook Pro (macOS 15.1), iPhone 15 Pro (iOS 18) */
    @Column(name = "device_info", length = 200)
    private String deviceInfo;

    /** MOBILE, DESKTOP, TABLET */
    @Column(name = "device_type", length = 15)
    private String deviceType;

    @Column(name = "device_fingerprint", length = 512)
    private String deviceFingerprint;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /** Ör: İstanbul, Türkiye */
    @Column(length = 100)
    private String location;

    /** Ör: Chrome 128.0, Mobile Safari */
    @Column(length = 100)
    private String browser;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public UserSession() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.lastActiveAt = LocalDateTime.now();
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getSessionTokenHash() { return sessionTokenHash; }
    public void setSessionTokenHash(String sessionTokenHash) { this.sessionTokenHash = sessionTokenHash; }

    public String getDeviceInfo() { return deviceInfo; }
    public void setDeviceInfo(String deviceInfo) { this.deviceInfo = deviceInfo; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public String getDeviceFingerprint() { return deviceFingerprint; }
    public void setDeviceFingerprint(String deviceFingerprint) { this.deviceFingerprint = deviceFingerprint; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getBrowser() { return browser; }
    public void setBrowser(String browser) { this.browser = browser; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public LocalDateTime getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(LocalDateTime lastActiveAt) { this.lastActiveAt = lastActiveAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
