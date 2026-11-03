// ===== OtpStore.java =====
/** Validity period of login, registration and transfer OTPs */
public static final Duration OTP_TTL = Duration.ofSeconds(120);

public void put(String key, String value, Duration ttl) {
    // Redis deletes the key automatically when the TTL expires
    redisTemplate.opsForValue().set(key, value, ttl);
}

/**
 * Single-use verification: if the code matches, the entry is deleted immediately,
 * so the same code cannot be used a second time (replay protection).
 */
public boolean verifyAndConsume(String key, String candidate) {
    if (candidate == null) return false;
    String stored = get(key);
    if (stored == null || !java.security.MessageDigest.isEqual(stored.getBytes(), candidate.trim().getBytes())) {
        return false;
    }
    delete(key);
    return true;
}

// ===== NotificationPublisher.java =====
public void publish(NotificationMessage message) {
    // Publish to RabbitMQ only after the database transaction commits:
    // a rolled-back transfer never produces an email
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                send(message);
            }
        });
    } else {
        send(message);
    }
}

private void send(NotificationMessage message) {
    rabbitTemplate.convertAndSend(RabbitMQConfig.NOTIFICATION_QUEUE, objectMapper.writeValueAsString(message));
}
