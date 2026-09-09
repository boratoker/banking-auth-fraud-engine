package com.banking.auth.ml;

import com.banking.auth.model.Transaction;
import com.banking.auth.model.User;
import com.banking.auth.repository.BeneficiaryContactRepository;
import com.banking.auth.repository.TransactionRepository;
import com.banking.auth.repository.UserSessionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Gerçek Zamanlı Feature Engineering Servisi
 * ML Fraud modeline giriş olarak kullanılan 18 özniteliği (feature) hesaplar.
 *
 * Öznitelik Kategorileri:
 * 1. İşlem Özellikleri (amount, ratio, currency, type)
 * 2. Davranışsal Hız & Zaman (velocity, night, session age)
 * 3. Alıcı Güvenilirliği (new IBAN, contact list, history)
 * 4. Cihaz & Biyometri (fingerprint, IP distance, failed logins)
 */
@Service
public class FeatureEngineeringService {

    private static final Logger log = LoggerFactory.getLogger(FeatureEngineeringService.class);
    private final TransactionRepository transactionRepository;
    private final BeneficiaryContactRepository beneficiaryRepository;
    private final UserSessionRepository sessionRepository;
    private final ObjectMapper objectMapper;

    public FeatureEngineeringService(TransactionRepository transactionRepository,
                                     BeneficiaryContactRepository beneficiaryRepository,
                                     UserSessionRepository sessionRepository) {
        this.transactionRepository = transactionRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.sessionRepository = sessionRepository;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 18 öznitelikten oluşan feature vektörünü hesaplar.
     * @return Feature adları ve değerlerini içeren map (ML modeline verilecek sırada)
     */
    public Map<String, Object> computeFeatures(User user, BigDecimal amount, String destIban,
                                                 String transferType, String currency,
                                                 String sourceAccountCurrency,
                                                 String deviceFingerprint, String ipAddress) {

        Map<String, Object> features = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();

        // ========== 1. İşlem Özellikleri ==========
        // F1: amount
        features.put("amount", amount.doubleValue());

        // F2: amount_to_user_avg_ratio — Tutarın son 30 günlük ortalamasına oranı
        BigDecimal avgAmount = transactionRepository.avgTransferAmountSince(
            user.getId(), now.minusDays(30));
        double avgVal = avgAmount != null && avgAmount.compareTo(BigDecimal.ZERO) > 0
            ? avgAmount.doubleValue() : 1.0;
        features.put("amount_to_user_avg_ratio",
            amount.doubleValue() / avgVal);

        // F3: currency_mismatch — Kaynak hesap ile hedef para birimi uyumsuzluğu
        boolean currencyMismatch = sourceAccountCurrency != null
            && !sourceAccountCurrency.equalsIgnoreCase(currency);
        features.put("currency_mismatch", currencyMismatch ? 1 : 0);

        // F4: is_fast_type — FAST işlemi mi?
        features.put("is_fast_type", "FAST".equalsIgnoreCase(transferType) ? 1 : 0);

        // ========== 2. Davranışsal Hız (Velocity) & Zaman ==========
        // F5: tx_count_last_1h — Son 1 saatteki transfer adedi
        long txCountLast1h = transactionRepository.countTransactionsSince(
            user.getId(), now.minusHours(1));
        features.put("tx_count_last_1h", txCountLast1h);

        // F6: tx_amount_sum_last_24h — Son 24 saatte çıkan toplam tutar
        BigDecimal sumOutgoing24h = transactionRepository.sumOutgoingAmountSince(
            user.getId(), now.minusHours(24));
        features.put("tx_amount_sum_last_24h",
            sumOutgoing24h != null ? Math.abs(sumOutgoing24h.doubleValue()) : 0.0);

        // F7: daily_limit_usage_pct — Günlük limitin yüzde kaçı kullanılmış
        double dailyLimit = 50000.0; // Default, SecuritySettings'ten çekilebilir
        double dailyUsed = sumOutgoing24h != null ? Math.abs(sumOutgoing24h.doubleValue()) : 0.0;
        features.put("daily_limit_usage_pct",
            Math.min(1.0, (dailyUsed + amount.doubleValue()) / dailyLimit));

        // F8: time_since_last_tx_sec — Son işlemden bu yana geçen saniye
        LocalDateTime lastTxTime = transactionRepository.findLastTransactionTime(user.getId());
        long timeSinceLastTx = lastTxTime != null
            ? ChronoUnit.SECONDS.between(lastTxTime, now) : 999999;
        features.put("time_since_last_tx_sec", timeSinceLastTx);

        // F9: is_night_time — Gece transferi mi? (00:00 - 06:00)
        LocalTime currentTime = now.toLocalTime();
        boolean isNight = currentTime.isAfter(LocalTime.MIDNIGHT)
            && currentTime.isBefore(LocalTime.of(6, 0));
        features.put("is_night_time", isNight ? 1 : 0);

        // ========== 3. Alıcı & Ağ Güvenilirliği ==========
        // F10: is_new_recipient_iban — Bu IBAN'a ilk defa mı transfer yapılıyor?
        long recipientCount = transactionRepository.countByUserIdAndDestIban(
            user.getId(), destIban);
        features.put("is_new_recipient_iban", recipientCount == 0 ? 1 : 0);

        // F11: recipient_transfers_count — Bu alıcıya geçmiş toplam transfer sayısı
        features.put("recipient_transfers_count", recipientCount);

        // F12: recipient_in_contacts — Alıcı kayıtlı kişilerde var mı?
        boolean inContacts = beneficiaryRepository.existsByUserIdAndIban(
            user.getId(), destIban);
        features.put("recipient_in_contacts", inContacts ? 1 : 0);

        // ========== 4. Cihaz & Biyometri ==========
        // F13: device_fingerprint_matched — Tanımlı güvenilir cihaz mı?
        boolean deviceMatched = deviceFingerprint != null
            && sessionRepository.findByUserIdAndIsActiveTrue(user.getId()).stream()
                .anyMatch(s -> deviceFingerprint.equals(s.getDeviceFingerprint()));
        features.put("device_fingerprint_matched", deviceMatched ? 1 : 0);

        // F14: ip_location_distance_km — Kayıtlı olağan lokasyondan mesafe (basitleştirilmiş)
        // Gerçek uygulamada GeoIP servisi kullanılır; burada 0 = aynı lokasyon
        features.put("ip_location_distance_km", 0.0);

        // F15: recent_failed_logins — Son 24 saatteki hatalı giriş denemesi
        int failedLogins = user.getLastFailedLoginAt() != null
            && user.getLastFailedLoginAt().isAfter(now.minusHours(24)) ? 1 : 0;
        features.put("recent_failed_logins", failedLogins);

        // F16: session_age_minutes — Oturumun ne kadar süre önce açıldığı
        long sessionAge = sessionRepository.findByUserIdAndIsActiveTrue(user.getId()).stream()
            .findFirst()
            .map(s -> ChronoUnit.MINUTES.between(s.getCreatedAt(), now))
            .orElse(0L);
        features.put("session_age_minutes", sessionAge);

        // F17: amount_is_round — Tutar yuvarlak bir sayı mı? (Fraud kalıplarında yaygın)
        boolean isRound = amount.remainder(new BigDecimal("1000")).compareTo(BigDecimal.ZERO) == 0;
        features.put("amount_is_round", isRound ? 1 : 0);

        // F18: high_amount_flag — ₺10.000 üzerinde mi?
        features.put("high_amount_flag", amount.compareTo(new BigDecimal("10000")) >= 0 ? 1 : 0);

        log.info("🧠 Feature Engineering tamamlandı | User: {} | Amount: {} | Features: {}",
            user.getEmail(), amount, features.size());

        return features;
    }

    /**
     * Feature map'ini JSON string'e dönüştürür (Feature Store kaydı için).
     */
    public String toJson(Map<String, Object> features) {
        try {
            return objectMapper.writeValueAsString(features);
        } catch (Exception e) {
            log.error("Feature JSON serileştirme hatası: {}", e.getMessage());
            return "{}";
        }
    }

    /**
     * Feature map'ini ML modeline giriş olarak kullanılacak double dizisine dönüştürür.
     */
    public double[] toDoubleArray(Map<String, Object> features) {
        return features.values().stream()
            .mapToDouble(v -> {
                if (v instanceof Number) return ((Number) v).doubleValue();
                return 0.0;
            })
            .toArray();
    }
}
