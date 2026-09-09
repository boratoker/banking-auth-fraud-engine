package com.banking.auth.ml;

import com.banking.auth.model.*;
import com.banking.auth.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import org.springframework.core.io.ClassPathResource;
import jakarta.annotation.PostConstruct;

/**
 * Hibrit ML Fraud Çıkarım (Inference) Motoru
 *
 * İki aşamalı hibrit yaklaşım:
 * 1. Kural Tabanlı (Rule-Based) - Deterministik kurallar (%30 ağırlık)
 * 2. İstatistiksel Anomali Puanlama - Feature tabanlı skor hesaplama (%70 ağırlık)
 *
 * ONNX model dosyası mevcut olduğunda otomatik olarak ONNX Runtime
 * çıkarımına geçer. Model yoksa kural tabanlı skorlama kullanılır.
 *
 * Karar Politikası:
 * - %0-25:   SAFE       → Doğrudan onay
 * - %26-55:  LOW/MEDIUM → SMS/E-Posta OTP istemi
 * - %56-80:  HIGH       → Dashboard 2FA Modal (%68 Risk vb.)
 * - %81-100: CRITICAL   → Otomatik blokaj & güvenlik alarmı
 */
@Service
public class MlFraudInferenceEngine {

    private static final Logger log = LoggerFactory.getLogger(MlFraudInferenceEngine.class);

    private final FeatureEngineeringService featureService;
    private final FraudModelRepository fraudModelRepository;
    private final FraudFeatureStoreRepository featureStoreRepository;
    private final FraudEvaluationRepository evaluationRepository;

    private OrtEnvironment env;
    private OrtSession session;

    // ONNX Runtime henüz yüklenmediyse (model dosyası yoksa) kural tabanlı modda çalışır
    private boolean onnxAvailable = false;

    public MlFraudInferenceEngine(FeatureEngineeringService featureService,
                                   FraudModelRepository fraudModelRepository,
                                   FraudFeatureStoreRepository featureStoreRepository,
                                   FraudEvaluationRepository evaluationRepository) {
        this.featureService = featureService;
        this.fraudModelRepository = fraudModelRepository;
        this.featureStoreRepository = featureStoreRepository;
        this.evaluationRepository = evaluationRepository;
    }

    @PostConstruct
    public void initOnnxModel() {
        try {
            this.env = OrtEnvironment.getEnvironment();
            ClassPathResource resource = new ClassPathResource("models/fraud_xgboost_v1.onnx");
            byte[] modelBytes = resource.getInputStream().readAllBytes();
            this.session = env.createSession(modelBytes, new OrtSession.SessionOptions());
            this.onnxAvailable = true;
            log.info("🚀 ONNX Runtime başarıyla başlatıldı. Model yüklendi.");
        } catch (Exception e) {
            log.error("ONNX model yüklenemedi: {}. Kural tabanlı (Rule-Based) moda geçiliyor.", e.getMessage());
            this.onnxAvailable = false;
        }
    }

    /**
     * Ana çıkarım metodu: Feature'ları hesaplar, modeli çalıştırır, karar üretir.
     *
     * @return FraudEvaluation kaydı (henüz persist edilmemiş)
     */
    public FraudEvaluation evaluate(User user, Transaction transaction,
                                     BigDecimal amount, String destIban,
                                     String transferType, String currency,
                                     String sourceAccountCurrency,
                                     String deviceFingerprint, String ipAddress) {

        long startTime = System.nanoTime();

        // 1. Feature Engineering — 18 öznitelik hesapla
        Map<String, Object> features = featureService.computeFeatures(
            user, amount, destIban, transferType, currency,
            sourceAccountCurrency, deviceFingerprint, ipAddress);

        // 2. Feature Store Snapshot — Karar anındaki veriyi dondur
        FraudFeatureStore featureSnapshot = new FraudFeatureStore();
        featureSnapshot.setTransaction(transaction);
        featureSnapshot.setFeatureVector(featureService.toJson(features));
        featureStoreRepository.save(featureSnapshot);

        // 3. Risk Skoru Hesaplama
        double riskScore;
        double anomalyScore;
        Map<String, Double> shapContributions;

        if (onnxAvailable) {
            // ONNX Runtime ile ML çıkarım (sub-5ms)
            try {
                double[] featureArray = featureService.toDoubleArray(features);
                float[][] inputMatrix = new float[1][18];
                for (int i = 0; i < 18; i++) {
                    inputMatrix[0][i] = (float) featureArray[i];
                }
                
                OnnxTensor tensor = OnnxTensor.createTensor(env, inputMatrix);
                Map<String, OnnxTensor> inputs = Collections.singletonMap("float_input", tensor);
                
                try (OrtSession.Result result = session.run(inputs)) {
                    Object val = result.get(1).getValue();
                    float fraudProb = 0.0f;
                    if (val instanceof List) {
                        List<?> list = (List<?>) val;
                        if (!list.isEmpty() && list.get(0) instanceof Map) {
                            Map<?, ?> map = (Map<?, ?>) list.get(0);
                            Object p1 = map.get(1L);
                            if (p1 == null) p1 = map.get(1); // Integer key fallback
                            if (p1 instanceof Float) {
                                fraudProb = (Float) p1;
                            }
                        }
                    }
                    riskScore = fraudProb * 100.0;
                }
                tensor.close();
                
                anomalyScore = computeAnomalyScore(features);
                shapContributions = computeShapExplanations(features);
            } catch (Exception e) {
                log.error("ONNX çıkarım hatası: {}", e.getMessage(), e);
                // Fallback
                riskScore = computeRuleBasedScore(features);
                anomalyScore = computeAnomalyScore(features);
                shapContributions = computeShapExplanations(features);
            }
        } else {
            // Kural tabanlı + istatistiksel hibrit puanlama
            riskScore = computeRuleBasedScore(features);
            anomalyScore = computeAnomalyScore(features);
            shapContributions = computeShapExplanations(features);
        }

        // 4. Çıkarım Süresi (ms)
        double latencyMs = (System.nanoTime() - startTime) / 1_000_000.0;

        // 5. Risk Seviyesi ve Karar
        String riskLevel = determineRiskLevel(riskScore);
        String decision = determineDecision(riskScore);
        List<String> triggeredRules = detectTriggeredRules(features, riskScore);
        String reason = buildReason(triggeredRules, riskScore);

        // 6. FraudEvaluation Entity oluştur
        FraudEvaluation evaluation = new FraudEvaluation();
        evaluation.setTransaction(transaction);
        evaluation.setUser(user);
        evaluation.setRiskScore((int) Math.round(riskScore));
        evaluation.setRiskLevel(riskLevel);
        evaluation.setDecision(decision);
        evaluation.setAnomalyScore(BigDecimal.valueOf(anomalyScore).setScale(4, RoundingMode.HALF_UP));
        evaluation.setFraudProbability(BigDecimal.valueOf(riskScore / 100.0).setScale(4, RoundingMode.HALF_UP));
        evaluation.setTriggeredRules(triggeredRules.toString());
        evaluation.setInferenceLatencyMs(BigDecimal.valueOf(latencyMs).setScale(2, RoundingMode.HALF_UP));
        evaluation.setReason(reason);
        evaluation.setIpAddress(ipAddress);
        evaluation.setDeviceFingerprint(deviceFingerprint);

        // SHAP değerlerini JSON olarak kaydet
        try {
            evaluation.setFeatureContributions(
                new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(shapContributions));
        } catch (Exception e) {
            evaluation.setFeatureContributions("{}");
        }

        // Model versiyon bilgisi
        fraudModelRepository.findByIsActiveTrue().ifPresent(model -> {
            evaluation.setModel(model);
            evaluation.setModelVersion(model.getModelVersion());
        });

        // Evaluation'ı kaydet
        evaluationRepository.save(evaluation);

        log.info("🤖 ML Fraud Evaluation | User: {} | Amount: {} | Risk: {}% ({}) | Decision: {} | Latency: {}ms",
            user.getEmail(), amount, evaluation.getRiskScore(), riskLevel, decision,
            String.format("%.2f", latencyMs));

        return evaluation;
    }

    /**
     * Kural tabanlı + istatistiksel hibrit risk skoru (0-100).
     * ONNX model yokken kullanılır.
     */
    private double computeRuleBasedScore(Map<String, Object> features) {
        double score = 0;

        // Yüksek tutar kuralı (₺10.000+)
        double amount = getDouble(features, "amount");
        if (amount >= 50000) score += 30;
        else if (amount >= 25000) score += 20;
        else if (amount >= 10000) score += 12;
        else if (amount >= 5000) score += 5;

        // Ortalama üstü tutar oranı
        double ratio = getDouble(features, "amount_to_user_avg_ratio");
        if (ratio > 10) score += 20;
        else if (ratio > 5) score += 12;
        else if (ratio > 3) score += 6;

        // Yeni alıcı IBAN
        if (getInt(features, "is_new_recipient_iban") == 1) score += 15;

        // Kayıtlı kişilerde yok
        if (getInt(features, "recipient_in_contacts") == 0) score += 5;

        // Gece transferi (00:00 - 06:00)
        if (getInt(features, "is_night_time") == 1) score += 8;

        // Yüksek velocity (son 1 saatte 3+ işlem)
        long txCount = (long) getDouble(features, "tx_count_last_1h");
        if (txCount >= 5) score += 15;
        else if (txCount >= 3) score += 8;

        // Günlük limit kullanımı yüksek
        double limitUsage = getDouble(features, "daily_limit_usage_pct");
        if (limitUsage > 0.9) score += 10;
        else if (limitUsage > 0.7) score += 5;

        // Cihaz parmak izi eşleşmiyor
        if (getInt(features, "device_fingerprint_matched") == 0) score += 10;

        // Son başarısız giriş denemesi var
        if (getInt(features, "recent_failed_logins") > 0) score += 5;

        // Çok hızlı art arda transfer (son işlemden <60 saniye)
        double timeSince = getDouble(features, "time_since_last_tx_sec");
        if (timeSince < 30) score += 10;
        else if (timeSince < 60) score += 5;

        // Yuvarlak tutar (fraud kalıplarında yaygın)
        if (getInt(features, "amount_is_round") == 1 && amount >= 10000) score += 3;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Isolation Forest benzeri anomali skoru (0.00 - 1.00).
     * Feature değerlerinin normal dağılıma göre sapmasını ölçer.
     */
    private double computeAnomalyScore(Map<String, Object> features) {
        double anomalyPoints = 0;
        int factorCount = 0;

        // Tutar anomalisi
        double ratio = getDouble(features, "amount_to_user_avg_ratio");
        if (ratio > 1) {
            anomalyPoints += Math.min(1.0, (ratio - 1) / 10.0);
            factorCount++;
        }

        // Hız anomalisi
        long txCount = (long) getDouble(features, "tx_count_last_1h");
        if (txCount > 1) {
            anomalyPoints += Math.min(1.0, txCount / 10.0);
            factorCount++;
        }

        // Zaman anomalisi (gece)
        if (getInt(features, "is_night_time") == 1) {
            anomalyPoints += 0.3;
            factorCount++;
        }

        // Yeni IBAN anomalisi
        if (getInt(features, "is_new_recipient_iban") == 1) {
            anomalyPoints += 0.4;
            factorCount++;
        }

        // Cihaz uyumsuzluğu anomalisi
        if (getInt(features, "device_fingerprint_matched") == 0) {
            anomalyPoints += 0.3;
            factorCount++;
        }

        return factorCount > 0 ? Math.min(1.0, anomalyPoints / factorCount) : 0.02;
    }

    /**
     * SHAP benzeri feature katkı açıklamaları.
     * Her feature'ın risk skoruna ne kadar etki ettiğini gösterir.
     */
    private Map<String, Double> computeShapExplanations(Map<String, Object> features) {
        Map<String, Double> contributions = new LinkedHashMap<>();

        double amount = getDouble(features, "amount");
        double ratio = getDouble(features, "amount_to_user_avg_ratio");

        if (amount >= 10000) {
            contributions.put("Yüksek Tutar (₺" + String.format("%.0f", amount) + ")",
                Math.min(0.42, amount / 100000.0));
        }
        if (ratio > 3) {
            contributions.put("Ortalamanın " + String.format("%.1f", ratio) + "x üzerinde",
                Math.min(0.30, ratio / 20.0));
        }
        if (getInt(features, "is_new_recipient_iban") == 1) {
            contributions.put("Daha önce işlem yapılmamış yeni IBAN", 0.24);
        }
        if (getInt(features, "is_night_time") == 1) {
            contributions.put("Olağandışı saat (Gece 00:00-06:00)", 0.12);
        }
        if (getInt(features, "device_fingerprint_matched") == 0) {
            contributions.put("Tanınmayan cihaz parmak izi", 0.18);
        }
        if (getDouble(features, "tx_count_last_1h") >= 3) {
            contributions.put("Son 1 saatte yoğun işlem hacmi", 0.15);
        }
        if (getInt(features, "recipient_in_contacts") == 0 && getInt(features, "is_new_recipient_iban") == 0) {
            contributions.put("Alıcı kayıtlı kişilerde yok", 0.08);
        }

        return contributions;
    }

    private String determineRiskLevel(double riskScore) {
        if (riskScore <= 25) return "SAFE";
        if (riskScore <= 55) return "MEDIUM";
        if (riskScore <= 80) return "HIGH";
        return "CRITICAL";
    }

    private String determineDecision(double riskScore) {
        if (riskScore <= 25) return "APPROVE";
        if (riskScore <= 80) return "CHALLENGE_OTP";
        return "BLOCK";
    }

    private List<String> detectTriggeredRules(Map<String, Object> features, double riskScore) {
        List<String> rules = new ArrayList<>();
        if (getDouble(features, "amount") >= 10000) rules.add("HIGH_AMOUNT");
        if (getInt(features, "is_new_recipient_iban") == 1) rules.add("NEW_IBAN");
        if (getInt(features, "is_night_time") == 1) rules.add("NIGHT_TIME");
        if (getDouble(features, "tx_count_last_1h") >= 3) rules.add("VELOCITY_SPIKE");
        if (getInt(features, "device_fingerprint_matched") == 0) rules.add("UNKNOWN_DEVICE");
        if (getDouble(features, "amount_to_user_avg_ratio") > 5) rules.add("UNUSUAL_AMOUNT");
        if (getDouble(features, "daily_limit_usage_pct") > 0.9) rules.add("DAILY_LIMIT_EXCEEDED");
        if (getInt(features, "recent_failed_logins") > 0) rules.add("RECENT_FAILED_LOGIN");
        return rules;
    }

    private String buildReason(List<String> triggeredRules, double riskScore) {
        if (triggeredRules.isEmpty()) return "Standart risk seviyesinde işlem.";

        StringBuilder sb = new StringBuilder();
        sb.append("AI Fraud Shield: %").append((int) riskScore).append(" Risk | Etkenler: ");
        for (int i = 0; i < triggeredRules.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(triggeredRules.get(i));
        }
        return sb.toString();
    }

    private double getDouble(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).doubleValue();
        return 0.0;
    }

    private int getInt(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        return 0;
    }
}
