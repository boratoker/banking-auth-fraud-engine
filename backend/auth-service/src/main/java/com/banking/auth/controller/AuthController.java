package com.banking.auth.controller;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.util.Random;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final StringRedisTemplate redisTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public AuthController(StringRedisTemplate redisTemplate, 
                          RabbitTemplate rabbitTemplate, 
                          KafkaTemplate<String, String> kafkaTemplate) {
        this.redisTemplate = redisTemplate;
        this.rabbitTemplate = rabbitTemplate;
        this.kafkaTemplate = kafkaTemplate;
    }

    // Step 1: Login Request -> Generates OTP, saves to Redis (3 min TTL), pushes to RabbitMQ & Kafka
    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestParam String username) {
        // 1. 6 Haneli OTP Üret
        String otp = String.format("%06d", new Random().nextInt(999999));

        // 2. Redis'e 3 Dakika TTL (Süreli) ile kaydet
        redisTemplate.opsForValue().set("OTP:" + username, otp, Duration.getMinutes(3));

        // 3. RabbitMQ Kuyruğuna Asenkron SMS/Bildirim Gönderim Talebi At
        rabbitTemplate.convertAndSend("notificationQueue", "OTP Code for " + username + ": " + otp);

        // 4. Kafka'ya Login Event'i fırlat (Fraud Engine dinleyecek)
        kafkaTemplate.send("auth-events", "LOGIN_ATTEMPT:" + username);

        return ResponseEntity.ok("OTP kuralı tetiklendi ve bildirim kuyruğuna aktarıldı.");
    }

    // Step 2: OTP Verification
    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(@RequestParam String username, @RequestParam String otp) {
        String storedOtp = redisTemplate.opsForValue().get("OTP:" + username);

        if (storedOtp != null && storedOtp.equals(otp)) {
            // Başarılı doğrulama sonrası OTP'yi sil
            redisTemplate.delete("OTP:" + username);
            kafkaTemplate.send("auth-events", "LOGIN_SUCCESS:" + username);
            return ResponseEntity.ok("Giriş başarılı! JWT Token üretildi.");
        }

        kafkaTemplate.send("auth-events", "LOGIN_FAILED:" + username);
        return ResponseEntity.badRequest().body("Geçersiz veya süresi dolmuş OTP!");
    }
}