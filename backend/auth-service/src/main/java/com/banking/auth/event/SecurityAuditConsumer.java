package com.banking.auth.event;

import com.banking.auth.model.SecurityAuditLog;
import com.banking.auth.model.User;
import com.banking.auth.repository.SecurityAuditLogRepository;
import com.banking.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Security Audit Consumer — Güvenlik olaylarını veritabanına kaydeder.
 * Kafka/RabbitMQ consumer'larından veya doğrudan servislerden çağrılır.
 */
@Service
public class SecurityAuditConsumer {

    private static final Logger log = LoggerFactory.getLogger(SecurityAuditConsumer.class);

    private final SecurityAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public SecurityAuditConsumer(SecurityAuditLogRepository auditLogRepository,
                                  UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    /**
     * Güvenlik olayını audit tablosuna kaydeder.
     */
    public void logEvent(String email, String eventType, String severity,
                          String ipAddress, String userAgent, String details) {
        try {
            SecurityAuditLog auditLog = new SecurityAuditLog();

            if (email != null) {
                Optional<User> userOpt = userRepository.findByEmail(email);
                userOpt.ifPresent(auditLog::setUser);
            }

            auditLog.setEventType(eventType);
            auditLog.setSeverity(severity);
            auditLog.setIpAddress(ipAddress);
            auditLog.setUserAgent(userAgent);
            auditLog.setDetails(details);

            auditLogRepository.save(auditLog);

            log.info("📋 Security Audit Log | Event: {} | Severity: {} | User: {} | IP: {}",
                eventType, severity, email, ipAddress);
        } catch (Exception e) {
            log.error("Audit log kaydedilemedi: {}", e.getMessage());
        }
    }

    /** Başarılı giriş kaydı */
    public void logLoginSuccess(String email, String ip, String device) {
        logEvent(email, "LOGIN_SUCCESS", "INFO", ip, device,
            "{\"message\": \"Başarılı oturum açma\"}");
    }

    /** Başarısız şifre denemesi */
    public void logPasswordFailed(String email, String ip) {
        logEvent(email, "PASSWORD_FAILED", "WARN", ip, null,
            "{\"message\": \"Yanlış şifre denemesi\"}");
    }

    /** ML Fraud tespit kaydı */
    public void logFraudDetected(String email, String txnId, int riskScore,
                                  String riskLevel, String ip) {
        logEvent(email, "ML_FRAUD_FLAGGED", riskScore >= 80 ? "CRITICAL" : "WARN", ip, null,
            "{\"txnId\": \"" + txnId + "\", \"riskScore\": " + riskScore +
            ", \"riskLevel\": \"" + riskLevel + "\"}");
    }

    /** Transfer blokaj kaydı */
    public void logTransferBlocked(String email, String txnId, int riskScore, String reason) {
        logEvent(email, "TRANSFER_BLOCKED", "CRITICAL", null, null,
            "{\"txnId\": \"" + txnId + "\", \"riskScore\": " + riskScore +
            ", \"reason\": \"" + reason + "\"}");
    }

    /** Oturum sonlandırma kaydı */
    public void logSessionTerminated(String email, String sessionId, String ip) {
        logEvent(email, "SESSION_TERMINATED", "INFO", ip, null,
            "{\"sessionId\": \"" + sessionId + "\"}");
    }
}
