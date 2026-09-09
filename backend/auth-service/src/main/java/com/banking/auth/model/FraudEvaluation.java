package com.banking.auth.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ML Fraud Değerlendirme Sonucu Entity'si
 * Her işlem için Isolation Forest + XGBoost modelinin ürettiği
 * risk skoru, anomali skoru, SHAP açıklamaları ve karar bilgisi.
 */
@Entity
@Table(name = "fraud_evaluations", indexes = {
    @Index(name = "idx_fraud_eval_user_id", columnList = "user_id"),
    @Index(name = "idx_fraud_eval_txn_id", columnList = "transaction_id"),
    @Index(name = "idx_fraud_eval_created_at", columnList = "created_at")
})
public class FraudEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", unique = true)
    private Transaction transaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id")
    private FraudModel model;

    @Column(name = "model_version", length = 30)
    private String modelVersion;

    /** ML tarafından üretilen risk skoru (0-100) */
    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    /** SAFE, LOW, MEDIUM, HIGH, CRITICAL */
    @Column(name = "risk_level", nullable = false, length = 15)
    private String riskLevel;

    /** APPROVE, CHALLENGE_OTP, BLOCK */
    @Column(nullable = false, length = 20)
    private String decision;

    /** Isolation Forest anomali skoru (0.00 - 1.00) */
    @Column(name = "anomaly_score", precision = 5, scale = 4)
    private BigDecimal anomalyScore;

    /** XGBoost sahtekarlık olasılığı (0.000 - 1.000) */
    @Column(name = "fraud_probability", precision = 5, scale = 4)
    private BigDecimal fraudProbability;

    /**
     * Tetiklenen kurallar (JSON Array).
     * Ör: ["HIGH_AMOUNT", "NEW_IBAN", "NIGHT_TIME", "VELOCITY_SPIKE"]
     */
    @Column(name = "triggered_rules", columnDefinition = "TEXT")
    private String triggeredRules;

    /**
     * SHAP feature katkıları (JSON).
     * Ör: {"amount_to_user_avg_ratio": 0.38, "is_new_recipient_iban": 0.24, "is_night_time": 0.12}
     */
    @Column(name = "feature_contributions", columnDefinition = "TEXT")
    private String featureContributions;

    /** ONNX / Model çıkarım gecikmesi (milisaniye) */
    @Column(name = "inference_latency_ms", precision = 8, scale = 2)
    private BigDecimal inferenceLatencyMs;

    /** İnsan tarafından okunabilir açıklama */
    @Column(length = 500)
    private String reason;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "device_fingerprint", length = 512)
    private String deviceFingerprint;

    @Column(name = "is_resolved", nullable = false)
    private boolean isResolved = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public FraudEvaluation() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Transaction getTransaction() { return transaction; }
    public void setTransaction(Transaction transaction) { this.transaction = transaction; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public FraudModel getModel() { return model; }
    public void setModel(FraudModel model) { this.model = model; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public BigDecimal getAnomalyScore() { return anomalyScore; }
    public void setAnomalyScore(BigDecimal anomalyScore) { this.anomalyScore = anomalyScore; }

    public BigDecimal getFraudProbability() { return fraudProbability; }
    public void setFraudProbability(BigDecimal fraudProbability) { this.fraudProbability = fraudProbability; }

    public String getTriggeredRules() { return triggeredRules; }
    public void setTriggeredRules(String triggeredRules) { this.triggeredRules = triggeredRules; }

    public String getFeatureContributions() { return featureContributions; }
    public void setFeatureContributions(String featureContributions) { this.featureContributions = featureContributions; }

    public BigDecimal getInferenceLatencyMs() { return inferenceLatencyMs; }
    public void setInferenceLatencyMs(BigDecimal inferenceLatencyMs) { this.inferenceLatencyMs = inferenceLatencyMs; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getDeviceFingerprint() { return deviceFingerprint; }
    public void setDeviceFingerprint(String deviceFingerprint) { this.deviceFingerprint = deviceFingerprint; }

    public boolean isResolved() { return isResolved; }
    public void setResolved(boolean resolved) { isResolved = resolved; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
