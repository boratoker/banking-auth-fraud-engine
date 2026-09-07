package com.banking.auth.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/v1/banking")
@CrossOrigin(origins = "*")
public class BankingController {

    private static final Logger log = LoggerFactory.getLogger(BankingController.class);

    // In-Memory state management for demonstration & seamless operation
    private final Map<String, Object> cardState = new ConcurrentHashMap<>();
    private final List<Map<String, Object>> transactions = new CopyOnWriteArrayList<>();
    private final List<Map<String, Object>> sessions = new CopyOnWriteArrayList<>();

    public BankingController() {
        // Default card state
        cardState.put("isFrozen", false);
        cardState.put("internetAllowed", true);
        cardState.put("overseasAllowed", false);
        cardState.put("cardNumber", "4543 8912 0012 8819");
        cardState.put("expiry", "09/29");
        cardState.put("cvv", "492");
        cardState.put("holder", "BORA TOKER");

        // Seed initial transactions
        transactions.add(createTx(1L, "Migros Sanal Market", "07 Eyl 2026, 14:22", -482.50, "Alışveriş", "Safe", "1%", "Başarılı"));
        transactions.add(createTx(2L, "Gelen Transfer - Ahmet Yıl.", "07 Eyl 2026, 11:05", 3500.00, "Transfer", "Safe", "0%", "Başarılı"));
        transactions.add(createTx(3L, "Netflix Abonelik", "06 Eyl 2026, 22:15", -199.99, "Eğlence", "Safe", "2%", "Başarılı"));
        transactions.add(createTx(4L, "Shell Yakıt Alımı", "05 Eyl 2026, 18:40", -1250.00, "Ulaşım", "Safe", "3%", "Başarılı"));
        transactions.add(createTx(5L, "Maaş Ödemesi - Tech Corp", "01 Eyl 2026, 09:00", 95000.00, "Gelir", "Safe", "0%", "Başarılı"));

        // Seed initial sessions
        sessions.add(createSession(1L, "MacBook Pro (macOS 15.1)", "185.12.94.102", "İstanbul, Türkiye", "Chrome 128.0", true, "Aktif Oturum"));
        sessions.add(createSession(2L, "iPhone 15 Pro (iOS 18)", "212.156.40.18", "İstanbul, Türkiye", "Mobile Safari", false, "3 saat önce"));
        sessions.add(createSession(3L, "Windows Desktop", "88.241.12.50", "Ankara, Türkiye", "Edge 126.0", false, "Dün, 19:40"));
    }

    // GET /api/v1/banking/overview
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalBalance", 148250.75);
        data.put("savingsBalance", 85000.00);
        data.put("creditCardSpent", 28450.20);
        data.put("creditCardLimit", 100000.00);
        data.put("riskScore", 98);
        data.put("riskStatus", "Safe");
        data.put("recentTransactions", transactions.subList(0, Math.min(4, transactions.size())));
        return ResponseEntity.ok(data);
    }

    // GET /api/v1/banking/accounts
    @GetMapping("/accounts")
    public ResponseEntity<List<Map<String, Object>>> getAccounts() {
        List<Map<String, Object>> accounts = List.of(
            Map.of("id", 1, "name", "Ana Vadesiz TL Hesabı", "iban", "TR32 0006 1000 0000 1234 5678 90", "balance", 148250.75, "currency", "TRY", "type", "Vadesiz"),
            Map.of("id", 2, "name", "Büyüyen Vadeli Birikim", "iban", "TR32 0006 1000 0000 9876 5432 11", "balance", 85000.00, "currency", "TRY", "type", "Vadeli (%48.5)"),
            Map.of("id", 3, "name", "USD Döviz Hesabı", "iban", "TR32 0006 1000 0000 4455 6677 88", "balance", 4250.00, "currency", "USD", "type", "Döviz"),
            Map.of("id", 4, "name", "EUR Döviz Hesabı", "iban", "TR32 0006 1000 0000 1122 3344 55", "balance", 1800.50, "currency", "EUR", "type", "Döviz")
        );
        return ResponseEntity.ok(accounts);
    }

    // GET /api/v1/banking/cards
    @GetMapping("/cards")
    public ResponseEntity<Map<String, Object>> getCardDetails() {
        return ResponseEntity.ok(cardState);
    }

    // POST /api/v1/banking/cards/toggle-freeze
    @PostMapping("/cards/toggle-freeze")
    public ResponseEntity<Map<String, Object>> toggleCardFreeze(@RequestBody Map<String, Boolean> body) {
        Boolean frozen = body.getOrDefault("isFrozen", false);
        cardState.put("isFrozen", frozen);
        log.info("Sanal kart dondurma durumu güncellendi: {}", frozen);
        return ResponseEntity.ok(Map.of("success", true, "isFrozen", frozen));
    }

    // POST /api/v1/banking/cards/toggle-setting
    @PostMapping("/cards/toggle-setting")
    public ResponseEntity<Map<String, Object>> toggleCardSetting(@RequestBody Map<String, Object> body) {
        String key = (String) body.get("key");
        Boolean value = (Boolean) body.get("value");
        if (key != null && value != null) {
            cardState.put(key, value);
        }
        return ResponseEntity.ok(Map.of("success", true, "cardState", cardState));
    }

    // POST /api/v1/banking/transfers (With AI Fraud Engine Risk Evaluation)
    @PostMapping("/transfers")
    public ResponseEntity<Map<String, Object>> processTransfer(@RequestBody Map<String, Object> transferReq) {
        double amount = Double.parseDouble(transferReq.getOrDefault("amount", 0).toString());
        String recipientIban = (String) transferReq.getOrDefault("recipientIban", "");
        String recipientName = (String) transferReq.getOrDefault("recipientName", "");
        String description = (String) transferReq.getOrDefault("description", "FAST Transfer");

        log.info("Transfer isteği alındı: Amount={}, Recipient={}", amount, recipientName);

        // AI Fraud Engine Evaluation Rule:
        // Amounts >= 10000 trigger High Risk Alert requiring OTP
        if (amount >= 10000) {
            Map<String, Object> fraudResponse = new HashMap<>();
            fraudResponse.put("riskLevel", "HIGH");
            fraudResponse.put("riskScore", 68);
            fraudResponse.put("requiresOtp", true);
            fraudResponse.put("reason", "Yüksek tutarlı transfer (₺10,000+) ve AI Fraud Engine ek doğrulama kuralı.");
            fraudResponse.put("amount", amount);
            fraudResponse.put("recipient", recipientName);
            fraudResponse.put("iban", recipientIban);
            return ResponseEntity.ok(fraudResponse);
        }

        // Standard low-risk transfer approved immediately
        long newId = System.currentTimeMillis();
        Map<String, Object> newTx = createTx(newId, "Giden FAST - " + recipientName, "Bugün, " + java.time.LocalTime.now().toString().substring(0, 5), -amount, "Transfer", "Safe", "1%", "Başarılı");
        transactions.add(0, newTx);

        return ResponseEntity.ok(Map.of(
            "riskLevel", "LOW",
            "riskScore", 1,
            "requiresOtp", false,
            "success", true,
            "message", "₺" + String.format("%.2f", amount) + " tutarındaki FAST transferiniz AI Fraud Shield tarafından onaylandı."
        ));
    }

    // POST /api/v1/banking/transfers/verify-otp
    @PostMapping("/transfers/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyTransferOtp(@RequestBody Map<String, Object> req) {
        String otp = (String) req.getOrDefault("otp", "");
        double amount = Double.parseDouble(req.getOrDefault("amount", 0).toString());
        String recipientName = (String) req.getOrDefault("recipient", "Alıcı");

        if ("123456".equals(otp.trim()) || (otp != null && otp.trim().length() == 6)) {
            long newId = System.currentTimeMillis();
            Map<String, Object> newTx = createTx(newId, "Giden FAST (Doğrulandı) - " + recipientName, "Bugün, " + java.time.LocalTime.now().toString().substring(0, 5), -amount, "Transfer", "Safe", "5%", "Başarılı");
            transactions.add(0, newTx);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Güvenlik OTP kodu doğrulandı! ₺" + String.format("%.2f", amount) + " tutarındaki transferiniz güvenle alıcıya iletildi."
            ));
        }

        return ResponseEntity.badRequest().body(Map.of("error", "Geçersiz OTP kodu. Lütfen 123456 kodunu deneyin."));
    }

    // GET /api/v1/banking/security/sessions
    @GetMapping("/security/sessions")
    public ResponseEntity<List<Map<String, Object>>> getSessions() {
        return ResponseEntity.ok(sessions);
    }

    // POST /api/v1/banking/security/terminate-session
    @PostMapping("/security/terminate-session")
    public ResponseEntity<Map<String, Object>> terminateSession(@RequestBody Map<String, Object> req) {
        Object idObj = req.get("id");
        if (idObj != null) {
            long id = Long.parseLong(idObj.toString());
            sessions.removeIf(s -> idObj.toString().equals(s.get("id").toString()));
        }
        return ResponseEntity.ok(Map.of("success", true, "sessions", sessions));
    }

    // GET /api/v1/banking/transactions
    @GetMapping("/transactions")
    public ResponseEntity<List<Map<String, Object>>> getTransactions() {
        return ResponseEntity.ok(transactions);
    }

    // Helpers
    private Map<String, Object> createTx(Long id, String title, String date, double amount, String category, String risk, String riskScore, String status) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", id);
        map.put("title", title);
        map.put("date", date);
        map.put("amount", amount);
        map.put("category", category);
        map.put("risk", risk);
        map.put("riskScore", riskScore);
        map.put("status", status);
        return map;
    }

    private Map<String, Object> createSession(Long id, String device, String ip, String location, String browser, boolean isCurrent, String time) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", id);
        map.put("device", device);
        map.put("ip", ip);
        map.put("location", location);
        map.put("browser", browser);
        map.put("isCurrent", isCurrent);
        map.put("time", time);
        return map;
    }
}
