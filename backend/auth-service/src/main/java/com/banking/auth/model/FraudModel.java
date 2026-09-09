package com.banking.auth.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ML Model Kayıt & Versiyon Yönetimi Entity'si
 * Eğitilen Isolation Forest + XGBoost modellerinin versiyon bilgisi,
 * doğruluk metrikleri ve ONNX artifact yolu.
 */
@Entity
@Table(name = "fraud_models")
public class FraudModel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "model_version", nullable = false, length = 30)
    private String modelVersion;

    /** XGBoost, IsolationForest, XGBoost+IsolationForest, LightGBM */
    @Column(nullable = false, length = 50)
    private String algorithm;

    @Column(precision = 5, scale = 4)
    private BigDecimal accuracy;

    @Column(name = "auc_roc", precision = 5, scale = 4)
    private BigDecimal aucRoc;

    @Column(name = "f1_score", precision = 5, scale = 4)
    private BigDecimal f1Score;

    /** models/fraud_v2.onnx */
    @Column(name = "artifact_path", length = 500)
    private String artifactPath;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = false;

    @Column(name = "deployed_at")
    private LocalDateTime deployedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public FraudModel() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

    public BigDecimal getAccuracy() { return accuracy; }
    public void setAccuracy(BigDecimal accuracy) { this.accuracy = accuracy; }

    public BigDecimal getAucRoc() { return aucRoc; }
    public void setAucRoc(BigDecimal aucRoc) { this.aucRoc = aucRoc; }

    public BigDecimal getF1Score() { return f1Score; }
    public void setF1Score(BigDecimal f1Score) { this.f1Score = f1Score; }

    public String getArtifactPath() { return artifactPath; }
    public void setArtifactPath(String artifactPath) { this.artifactPath = artifactPath; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public LocalDateTime getDeployedAt() { return deployedAt; }
    public void setDeployedAt(LocalDateTime deployedAt) { this.deployedAt = deployedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
