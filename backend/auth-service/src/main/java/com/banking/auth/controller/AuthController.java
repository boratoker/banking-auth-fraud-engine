package com.banking.auth.controller;

import com.banking.auth.dto.CheckEmailRequest;
import com.banking.auth.dto.RegisterRequest;
import com.banking.auth.dto.VerifyOtpRequest;
import com.banking.auth.dto.VerifyPasswordRequest;
import com.banking.auth.model.User;
import com.banking.auth.repository.UserRepository;
import com.banking.auth.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private static final DateTimeFormatter DT_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    private final EmailService emailService;
    private final UserRepository userRepository;

    // Fallback in-memory map for OTP storage if Redis is offline
    private final Map<String, String> otpFallbackMap = new ConcurrentHashMap<>();

    public AuthController(EmailService emailService, UserRepository userRepository) {
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

    // Step 2a: Mevcut kullanıcı → şifre doğrulama gerektiğini bildir
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody CheckEmailRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "E-posta adresi gereklidir."));
        }

        String email = request.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "error", "Bu e-posta ile kayıtlı kullanıcı bulunamadı.",
                "userNotFound", true
            ));
        }

        User user = userOpt.get();

        // Şifre yoksa hata ver (DB sıfırlanmış olması gerekiyor)
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Bu hesapta şifre tanımlı değil. Lütfen yeniden kayıt olunuz."
            ));
        }

        return ResponseEntity.ok(Map.of(
            "requiresPassword", true,
            "firstName", user.getFirstName()
        ));
    }

    // Step 2a-2: Şifre doğrulama → doğruysa OTP gönder
    @PostMapping("/verify-password")
    public ResponseEntity<Map<String, Object>> verifyPassword(@RequestBody VerifyPasswordRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "E-posta adresi gereklidir."));
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Şifre gereklidir."));
        }

        String email = request.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "error", "Kullanıcı bulunamadı.",
                "userNotFound", true
            ));
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            // Başarısız giriş — tarihi kaydet
            LocalDateTime failedAt = LocalDateTime.now();
            user.setLastFailedLoginAt(failedAt);
            userRepository.save(user);
            sendKafkaEvent("PASSWORD_FAILED:" + email + ":" + failedAt);
            return ResponseEntity.status(401).body(Map.of(
                "error", "Şifre yanlış. Lütfen tekrar deneyiniz.",
                "failedAt", failedAt.format(DT_FORMAT)
            ));
        }

        // Şifre doğru → OTP gönder
        generateAndSendOtp(email, "login");

        // Önceki başarısız deneme bilgisini al ve sıfırla
        String lastFailedAt = user.getLastFailedLoginAt() != null
            ? user.getLastFailedLoginAt().format(DT_FORMAT)
            : null;

        if (user.getLastFailedLoginAt() != null) {
            user.setLastFailedLoginAt(null);
            userRepository.save(user);
        }

        return ResponseEntity.ok(Map.of(
            "message", "Şifre doğrulandı. OTP kodunuz " + maskEmail(email) + " adresine gönderildi.",
            "firstName", user.getFirstName(),
            "lastFailedLoginAt", lastFailedAt != null ? lastFailedAt : ""
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
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Şifre gereklidir."));
        }
        if (request.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Şifre en az 8 karakter olmalıdır."));
        }

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bu e-posta zaten kayıtlıdır. Giriş yapınız."));
        }

        // Şifreyi hash'le ve kullanıcıyı kaydet
        String hashedPassword = passwordEncoder.encode(request.getPassword());
        User user = new User(email, request.getFirstName().trim(), request.getLastName().trim());
        user.setPasswordHash(hashedPassword);
        userRepository.save(user);

        // E-posta doğrulama OTP'si gönder
        generateAndSendOtp(email, "register");

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
        String storedOtp = getStoredOtp(email);
        String inputOtp = request.getOtp().trim();

        if (storedOtp != null && storedOtp.equals(inputOtp)) {
            clearStoredOtp(email);

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (!user.isEmailVerified()) {
                    user.setEmailVerified(true);
                    userRepository.save(user);
                }

                sendKafkaEvent("LOGIN_SUCCESS:" + email);

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

        sendKafkaEvent("LOGIN_FAILED:" + email);
        return ResponseEntity.badRequest().body(Map.of("error", "Geçersiz veya süresi dolmuş OTP!"));
    }

    // --- Yardımcı metodlar ---

    private String generateAndSendOtp(String email, String mode) {
        String otp = String.format("%06d", new Random().nextInt(999999));
        long expiryTime = System.currentTimeMillis() + (2 * 60 * 1000); // 2 dakika

        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set("OTP:" + email, otp, Duration.ofMinutes(2));
            } else {
                otpFallbackMap.put(email, otp + ":" + expiryTime);
            }
        } catch (Exception e) {
            log.warn("Redis kaydı başarısız, in-memory saklanıyor: {}", e.getMessage());
            otpFallbackMap.put(email, otp + ":" + expiryTime);
        }

        try {
            emailService.sendOtpEmail(email, otp, mode);
        } catch (Exception e) {
            log.warn("E-posta gönderimi uyarısı: {}", e.getMessage());
        }

        sendKafkaEvent("LOGIN_ATTEMPT:" + email);
        return otp;
    }

    private String getStoredOtp(String email) {
        try {
            if (redisTemplate != null) {
                String val = redisTemplate.opsForValue().get("OTP:" + email);
                if (val != null) return val;
            }
        } catch (Exception e) {
            log.warn("Redis okuma hatası: {}", e.getMessage());
        }

        String raw = otpFallbackMap.get(email);
        if (raw != null && raw.contains(":")) {
            String[] parts = raw.split(":");
            long expiry = Long.parseLong(parts[1]);
            if (System.currentTimeMillis() <= expiry) {
                return parts[0];
            } else {
                otpFallbackMap.remove(email);
            }
        }
        return null;
    }

    private void clearStoredOtp(String email) {
        try {
            if (redisTemplate != null) {
                redisTemplate.delete("OTP:" + email);
            }
        } catch (Exception e) {
            // Ignore
        }
        otpFallbackMap.remove(email);
    }

    private void sendKafkaEvent(String message) {
        try {
            if (kafkaTemplate != null) {
                kafkaTemplate.send("auth-events", message);
            }
        } catch (Exception e) {
            log.warn("Kafka event gönderilemedi: {}", e.getMessage());
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@");
        String user = parts[0];
        String maskedUser = user.length() > 2 ? user.substring(0, 2) + "***" : user + "***";
        return maskedUser + "@" + parts[1];
    }
}