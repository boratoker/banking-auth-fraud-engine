package com.banking.auth.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Banking Event Producer — Kafka banking-events topic'ine bankacılık olayları yayınlar.
 * Transfer başlangıcı, kart dondurma, hesap değişiklikleri ve fraud değerlendirme sonuçları.
 */
@Service
public class BankingEventProducer {

    private static final Logger log = LoggerFactory.getLogger(BankingEventProducer.class);
    private static final String BANKING_TOPIC = "banking-events";
    private static final String FRAUD_TOPIC = "fraud-alerts";

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    public void publishTransferInitiated(String txnId, String userId, String destIban,
                                          BigDecimal amount, String currency) {
        publish(BANKING_TOPIC,
            "TRANSFER_INITIATED:txn=" + txnId +
            ":user=" + userId +
            ":dest=" + destIban +
            ":amount=" + amount +
            ":currency=" + currency);
    }

    public void publishTransferCompleted(String txnId, BigDecimal amount) {
        publish(BANKING_TOPIC,
            "TRANSFER_COMPLETED:txn=" + txnId + ":amount=" + amount);
    }

    public void publishTransferBlocked(String txnId, int riskScore, String reason) {
        publish(FRAUD_TOPIC,
            "TRANSFER_BLOCKED:txn=" + txnId + ":risk=" + riskScore + ":reason=" + reason);
    }

    public void publishFraudEvaluated(String txnId, int riskScore, String riskLevel, String decision) {
        publish(FRAUD_TOPIC,
            "ML_FRAUD_EVALUATED:txn=" + txnId +
            ":risk=" + riskScore +
            ":level=" + riskLevel +
            ":decision=" + decision);
    }

    public void publishCardFrozenToggled(String cardId, boolean isFrozen) {
        publish(BANKING_TOPIC,
            "CARD_FROZEN_TOGGLED:card=" + cardId + ":frozen=" + isFrozen);
    }

    public void publishCardSettingChanged(String cardId, String key, boolean value) {
        publish(BANKING_TOPIC,
            "CARD_SETTING_CHANGED:card=" + cardId + ":" + key + "=" + value);
    }

    private void publish(String topic, String message) {
        try {
            if (kafkaTemplate != null) {
                kafkaTemplate.send(topic, message);
                log.info("📡 Kafka [{}]: {}", topic, message);
            }
        } catch (Exception e) {
            log.warn("Kafka banking event gönderilemedi: {}", e.getMessage());
        }
    }
}
