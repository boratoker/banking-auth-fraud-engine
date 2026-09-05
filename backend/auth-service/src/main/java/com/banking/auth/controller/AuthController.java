package com.banking.auth.controller;

import com.banking.auth.dto.CheckEmailRequest;
import com.banking.auth.dto.RegisterRequest;
import com.banking.auth.dto.VerifyOtpRequest;
import com.banking.auth.model.User;
import com.banking.auth.repository.UserRepository;
import com.banking.auth.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final StringRedisTemplate redisTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final EmailService emailService;
    private final UserRepository userRepository;

    public AuthController(StringRedisTemplate redisTemplate,
                          RabbitTemplate rabbitTemplate,
                          KafkaTemplate<String, String> kafkaTemplate,
                          EmailService emailService,
                          UserRepository userRepository) {
        this.redisTemplate = redisTemplate;
        this.rabbitTemplate = rabbitTemplate;
        this.kafkaTemplate = kafkaTemplate;
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    // Step 1: E-posta DB'de var mı kontrol et
    @PostMapping("/check-email")
    public ResponseEntity<Map<String, Object>> checkEmail(@RequestBody CheckEmailRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "E-posta adresi gereklidir."));
        }

        String email = request.getEmail().trim().toLowerCase();
        boolean exists = userRepository.existsByEmail(email);

        return ResponseEntity.ok(Map.of("exists", exists, "email", email));
    }

    // Step 2a: Mevcut kullanıcı → OTP gönder (login)
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody CheckEmailRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "E-posta adresi gereklidir."));
        }

        String email = request.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bu e-posta ile kayıtlı kullanıcı bulunamadı."));
        }

        User user = userOpt.get();
        String otp = generateAndSendOtp(email);

        return ResponseEntity.ok(Map.of(
                "message", "OTP kodunuz " + maskEmail(email) + " adresine gönderildi.",
                "firstName", user.getFirstName()
        ));
    }

    // Step 2b: Yeni kullanıcı kaydı → OTP gönder (register)
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "E-posta adresi gereklidir."));
        }
        if (request.getFirstName() == null || request.getFirstName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ad gereklidir."));
        }
        if (request.getLastName() == null || request.getLastName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Soyad gereklidir."));
        }

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bu e-posta zaten kayıtlıdır. Giriş yapınız."));
        }

        // Kullanıcıyı oluştur (emailVerified = false)
        User user = new User(email, request.getFirstName().trim(), request.getLastName().trim());
        userRepository.save(user);

        // E-posta doğrulama OTP'si gönder
        String otp = generateAndSendOtp(email);

        return ResponseEntity.ok(Map.of(
                "message", "Kayıt başarılı! Doğrulama kodu " + maskEmail(email) + " adresine gönderildi."
        ));
    }

    // Step 3: OTP Doğrulama (hem login hem register)
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "E-posta adresi gereklidir."));
        }
        if (request.getOtp() == null || request.getOtp().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "OTP kodu gereklidir."));
        }

        String email = request.getEmail().trim().toLowerCase();
        String storedOtp = redisTemplate.opsForValue().get("OTP:" + email);

        if (storedOtp != null && storedOtp.equals(request.getOtp().trim())) {
            // OTP doğru → sil
            redisTemplate.delete("OTP:" + email);

            // Register modunda emailVerified → true yap
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (!user.isEmailVerified()) {
                    user.setEmailVerified(true);
                    userRepository.save(user);
                }

                try {
                    kafkaTemplate.send("auth-events", "LOGIN_SUCCESS:" + email);
                } catch (Exception e) {
                    log.warn("Kafka LOGIN_SUCCESS event gönderilemedi: {}", e.getMessage());
                }

                String mode = request.getMode() != null ? request.getMode() : "login";
                String msg = "register".equals(mode)
                        ? "Kayıt tamamlandı! E-posta doğrulandı. Hoş geldiniz, " + user.getFirstName() + "!"
                        : "Giriş başarılı! Hoş geldiniz, " + user.getFirstName() + "!";

                return ResponseEntity.ok(Map.of(
                        "message", msg,
                        "firstName", user.getFirstName(),
                        "lastName", user.getLastName(),
                        "email", user.getEmail()
                ));
            }

            return ResponseEntity.badRequest().body(Map.of("error", "Kullanıcı bulunamadı."));
        }

        try {
            kafkaTemplate.send("auth-events", "LOGIN_FAILED:" + email);
        } catch (Exception e) {
            log.warn("Kafka LOGIN_FAILED event gönderilemedi: {}", e.getMessage());
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Geçersiz veya süresi dolmuş OTP!"));
    }

    // --- Yardımcı metodlar ---

    private String generateAndSendOtp(String email) {
        String otp = String.format("%06d", new Random().nextInt(999999));

        // Redis'e 3 dk TTL ile kaydet
        redisTemplate.opsForValue().set("OTP:" + email, otp, Duration.ofMinutes(3));

        // E-posta gönder
        emailService.sendOtpEmail(email, otp);

        // Kafka event
        try {
            kafkaTemplate.send("auth-events", "LOGIN_ATTEMPT:" + email);
        } catch (Exception e) {
            log.warn("Kafka'ya event gönderilemedi: {}", e.getMessage());
        }

        return otp;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@");
        String user = parts[0];
        String maskedUser = user.length() > 2 ? user.substring(0, 2) + "***" : user + "***";
        return maskedUser + "@" + parts[1];
    }
}