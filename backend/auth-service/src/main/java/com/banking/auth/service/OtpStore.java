package com.banking.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Kısa ömürlü güvenlik verileri (OTP, bekleyen kayıt, limit talebi) için TTL'li anahtar-değer deposu.
 * Birincil depo Redis'tir: TTL dolduğunda Redis kaydı kendisi siler (örn. OTP için 120 sn).
 * Redis erişilemezse aynı TTL kuralıyla çalışan in-memory yedeğe düşülür.
 */
@Service
public class OtpStore {

    private static final Logger log = LoggerFactory.getLogger(OtpStore.class);

    /** Giriş, kayıt ve transfer OTP'lerinin geçerlilik süresi */
    public static final Duration OTP_TTL = Duration.ofSeconds(120);

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    private record Entry(String value, long expiresAtMillis) {}

    private final Map<String, Entry> fallback = new ConcurrentHashMap<>();

    public void put(String key, String value, Duration ttl) {
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(key, value, ttl);
                fallback.remove(key);
                return;
            }
        } catch (Exception e) {
            log.warn("Redis yazma hatası, in-memory saklanıyor ({}): {}", key, e.getMessage());
        }
        fallback.put(key, new Entry(value, System.currentTimeMillis() + ttl.toMillis()));
    }

    public String get(String key) {
        try {
            if (redisTemplate != null) {
                String val = redisTemplate.opsForValue().get(key);
                if (val != null) return val;
            }
        } catch (Exception e) {
            log.warn("Redis okuma hatası ({}): {}", key, e.getMessage());
        }

        Entry entry = fallback.get(key);
        if (entry == null) return null;
        if (System.currentTimeMillis() > entry.expiresAtMillis()) {
            fallback.remove(key);
            return null;
        }
        return entry.value();
    }

    public void delete(String key) {
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(key);
            }
        } catch (Exception e) {
            log.warn("Redis silme hatası ({}): {}", key, e.getMessage());
        }
        fallback.remove(key);
    }

    /**
     * Tek kullanımlık doğrulama: kod eşleşirse kayıt hemen silinir, böylece aynı kod
     * ikinci kez (replay) kullanılamaz.
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
}
