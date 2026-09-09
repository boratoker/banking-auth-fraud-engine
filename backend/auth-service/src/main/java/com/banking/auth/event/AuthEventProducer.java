package com.banking.auth.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

/**
 * Auth Event Producer — Kafka auth-events topic'ine kimlik doğrulama olayları yayınlar.
 * Login denemeleri, şifre hataları, OTP doğrulamaları ve oturum olayları.
 */
@Service
public class AuthEventProducer {

    private static final Logger log = LoggerFactory.getLogger(AuthEventProducer.class);
    private static final String AUTH_TOPIC = "auth-events";

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    public void publishLoginAttempt(String email, String ip, String device) {
        publish("LOGIN_ATTEMPT:" + email + ":ip=" + ip + ":device=" + device);
    }

    public void publishPasswordFailed(String email, String ip) {
        publish("PASSWORD_FAILED:" + email + ":ip=" + ip);
    }

    public void publishPasswordVerified(String email) {
        publish("PASSWORD_VERIFIED:" + email);
    }

    public void publishOtpVerified(String email, String mode) {
        publish("OTP_VERIFIED:" + email + ":mode=" + mode);
    }

    public void publishLoginSuccess(String email) {
        publish("LOGIN_SUCCESS:" + email);
    }

    public void publishSessionCreated(String email, String device, String ip) {
        publish("SESSION_CREATED:" + email + ":device=" + device + ":ip=" + ip);
    }

    public void publishSessionTerminated(String sessionId, String email) {
        publish("SESSION_TERMINATED:session=" + sessionId + ":user=" + email);
    }

    private void publish(String message) {
        try {
            if (kafkaTemplate != null) {
                kafkaTemplate.send(AUTH_TOPIC, message);
                log.info("📡 Kafka [{}]: {}", AUTH_TOPIC, message);
            }
        } catch (Exception e) {
            log.warn("Kafka auth event gönderilemedi: {}", e.getMessage());
        }
    }
}
