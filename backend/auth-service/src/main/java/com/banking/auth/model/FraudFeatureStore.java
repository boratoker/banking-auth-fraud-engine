package com.banking.auth.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Fraud Feature Store Entity'si
 * ML modeline giren 18 özniteliğin karar anındaki dondurulmuş (snapshot) kaydı.
 * Audit, model re-training ve açıklanabilirlik için saklanan veri.
 */
@Entity
@Table(name = "fraud_feature_store", indexes = {
    @Index(name = "idx_feature_store_txn_id", columnList = "transaction_id")
})
public class FraudFeatureStore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", unique = true)
    private Transaction transaction;

    /**
     * 18 özniteliğin JSON snapshot'ı.
     * Ör: {"amount": 15000, "amount_to_user_avg_ratio": 6.2, "is_new_recipient_iban": true,
     *       "tx_count_last_1h": 3, "is_night_time": false, "device_fingerprint_matched": true, ...}
     * PostgreSQL jsonb tipi ile saklanır.
     */
    @Column(name = "feature_vector", columnDefinition = "TEXT", nullable = false)
    private String featureVector;

    @Column(name = "snapshot_time", nullable = false)
    private LocalDateTime snapshotTime;

    public FraudFeatureStore() {}

    @PrePersist
    protected void onCreate() {
        this.snapshotTime = LocalDateTime.now();
    }

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Transaction getTransaction() { return transaction; }
    public void setTransaction(Transaction transaction) { this.transaction = transaction; }

    public String getFeatureVector() { return featureVector; }
    public void setFeatureVector(String featureVector) { this.featureVector = featureVector; }

    public LocalDateTime getSnapshotTime() { return snapshotTime; }
}
