package com.banking.auth.controller;

import com.banking.auth.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final StringRedisTemplate redisTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final EmailService emailService;

    public AuthController(StringRedisTemplate redisTemplate,
                          RabbitTemplate rabbitTemplate,
                          KafkaTemplate<String, String> kafkaTemplate,
                          EmailService emailService) {
        this.redisTemplate = redisTemplate;
        this.rabbitTemplate = rabbitTemplate;
        this.kafkaTemplate = kafkaTemplate;
        this.emailService = emailService;
    }

    // Step 1: Login Request -> OTP üret, Redis'e kaydet, e-posta gönder
    @PostMapping("/login")
    public ResponseEntity<String> login(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String username) {

        String identifier = (email != null && !email.isBlank()) ? email.trim() : username;
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body("E-posta adresi veya kullanıcı adı girilmelidir.");
        }

        // 1. 6 Haneli OTP Üret
        String otp = String.format("%06d", new Random().nextInt(999999));

        // 2. Redis'e 3 Dakika TTL ile kaydet
        redisTemplate.opsForValue().set("OTP:" + identifier, otp, Duration.ofMinutes(3));

        // 3. Doğrudan e-posta gönder (birincil yöntem - güvenilir)
        emailService.sendOtpEmail(identifier, otp);

        // 4. RabbitMQ'ya da gönder (isteğe bağlı, hata olursa devam et)
        try {
            rabbitTemplate.convertAndSend("notificationQueue", identifier + ":" + otp);
        } catch (Exception e) {
            log.warn("RabbitMQ'ya mesaj gönderilemedi (e-posta zaten gönderildi): {}", e.getMessage());
        }

        // 5. Kafka'ya Login Event'i fırlat (Fraud Engine dinleyecek)
        try {
            kafkaTemplate.send("auth-events", "LOGIN_ATTEMPT:" + identifier);
        } catch (Exception e) {
            log.warn("Kafka'ya event gönderilemedi: {}", e.getMessage());
        }

        return ResponseEntity.ok("OTP kodunuz " + identifier + " adresine gönderildi.");
    }

    // Step 2: OTP Verification
    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String username,
            @RequestParam String otp) {

        String identifier = (email != null && !email.isBlank()) ? email.trim() : username;
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body("E-posta adresi veya kullanıcı adı belirtilmelidir.");
        }

        String storedOtp = redisTemplate.opsForValue().get("OTP:" + identifier);

        if (storedOtp != null && storedOtp.equals(otp)) {
            redisTemplate.delete("OTP:" + identifier);
            try {
                kafkaTemplate.send("auth-events", "LOGIN_SUCCESS:" + identifier);
            } catch (Exception e) {
                log.warn("Kafka LOGIN_SUCCESS event gönderilemedi: {}", e.getMessage());
            }
            return ResponseEntity.ok("Giriş başarılı! JWT Token üretildi.");
        }

        try {
            kafkaTemplate.send("auth-events", "LOGIN_FAILED:" + identifier);
        } catch (Exception e) {
            log.warn("Kafka LOGIN_FAILED event gönderilemedi: {}", e.getMessage());
        }
        return ResponseEntity.badRequest().body("Geçersiz veya süresi dolmuş OTP!");
    }
}