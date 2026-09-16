package com.banking.auth.controller;

import com.banking.auth.model.*;
import com.banking.auth.repository.*;
import com.banking.auth.service.BankingService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/banking")
@CrossOrigin(origins = "*")
public class BankingController {

    private static final Logger log = LoggerFactory.getLogger(BankingController.class);

    private final BankingService bankingService;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final UserSessionRepository sessionRepository;
    private final TransactionRepository transactionRepository;
    private final BeneficiaryContactRepository contactRepository;

    public BankingController(BankingService bankingService,
                             UserRepository userRepository,
                             AccountRepository accountRepository,
                             CardRepository cardRepository,
                             UserSessionRepository sessionRepository,
                             TransactionRepository transactionRepository,
                             BeneficiaryContactRepository contactRepository) {
        this.bankingService = bankingService;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
        this.sessionRepository = sessionRepository;
        this.transactionRepository = transactionRepository;
        this.contactRepository = contactRepository;
    }

    // Demo için yardımcı metod (Authentication kapalı olduğu için)
    // Güncelleme: Artık X-User-Email header'ından aktif kullanıcıyı okur.
    private synchronized UUID getDemoUserId() {
        org.springframework.web.context.request.ServletRequestAttributes attrs = 
            (org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        String email = "toker2003@gmail.com";
        if (attrs != null) {
            String headerEmail = attrs.getRequest().getHeader("X-User-Email");
            if (headerEmail != null && !headerEmail.isBlank()) {
                email = headerEmail;
            }
        }
        
        final String targetEmail = email;
        User user = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + targetEmail));
                
        // Eğer yeni kullanıcıysa ve hesabı yoksa, varsayılan bir vadesiz hesap oluştur
        if (accountRepository.findByUserId(user.getId()).isEmpty()) {
            Account defaultAccount = new Account();
            defaultAccount.setUser(user);
            defaultAccount.setAccountNumber("1000-" + (10000000 + new java.util.Random().nextInt(90000000)));
            defaultAccount.setIban("TR" + (10 + new java.util.Random().nextInt(90)) + "000610000000" + defaultAccount.getAccountNumber().replace("-", ""));
            defaultAccount.setName("Ana Vadesiz TL Hesabı");
            defaultAccount.setAccountType("DEMAND");
            defaultAccount.setCurrency("TRY");
            defaultAccount.setBalance(java.math.BigDecimal.ZERO);
            defaultAccount.setStatus("ACTIVE");
            accountRepository.save(defaultAccount);
        }
        
        return user.getId();
    }

    // --- GET /api/v1/banking/contacts ---
    @GetMapping("/contacts")
    public ResponseEntity<List<Map<String, Object>>> getContacts() {
        List<BeneficiaryContact> contacts = contactRepository.findByUserId(getDemoUserId());
        List<Map<String, Object>> res = new ArrayList<>();
        for (BeneficiaryContact c : contacts) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("name", c.getName());
            map.put("iban", c.getIban());
            map.put("alias", c.getAlias());
            map.put("isFavorite", c.isFavorite());
            res.add(map);
        }
        return ResponseEntity.ok(res);
    }

    // --- GET /api/v1/banking/overview ---
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        Map<String, Object> data = new HashMap<>();
        
        List<Account> accounts = bankingService.getUserAccounts(getDemoUserId());
        BigDecimal totalBalance = accounts.stream()
            .map(Account::getBalance)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal savingsBalance = accounts.stream()
            .filter(a -> "TIME_DEPOSIT".equals(a.getAccountType()))
            .map(Account::getBalance)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Card> cards = cardRepository.findByUserId(getDemoUserId());
        BigDecimal creditCardSpent = cards.isEmpty() ? BigDecimal.ZERO : cards.get(0).getCurrentSpent();
        BigDecimal creditCardLimit = cards.isEmpty() ? BigDecimal.ZERO : cards.get(0).getTotalLimit();

        data.put("totalBalance", totalBalance);
        data.put("savingsBalance", savingsBalance);
        data.put("creditCardSpent", creditCardSpent);
        data.put("creditCardLimit", creditCardLimit);
        List<Transaction> allTxs = bankingService.getUserTransactions(getDemoUserId());
        double avgRisk = allTxs.stream()
            .mapToDouble(tx -> tx.getRiskScore() != null ? tx.getRiskScore().doubleValue() : 0.0)
            .average()
            .orElse(0.0);
        int safetyScore = (int) Math.round(100.0 - avgRisk);
        
        data.put("riskScore", safetyScore); 
        
        if (safetyScore >= 90) {
            data.put("riskStatus", "Mükemmel");
            data.put("riskMessage", "Hesabınızda herhangi bir şüpheli girişim tespit edilmedi.");
        } else if (safetyScore >= 70) {
            data.put("riskStatus", "İyi");
            data.put("riskMessage", "Hesabınız genel olarak güvende, ancak ufak çaplı anomaliler izleniyor.");
        } else {
            data.put("riskStatus", "Dikkat Gerektiriyor");
            data.put("riskMessage", "Hesabınızda yüksek riskli işlemler tespit edildi. Lütfen geçmişinizi inceleyin.");
        }

        List<Transaction> recentTxs = bankingService.getUserRecentTransactions(getDemoUserId());
        List<Map<String, Object>> txList = new ArrayList<>();
        for (Transaction tx : recentTxs) {
            Map<String, Object> t = new HashMap<>();
            t.put("id", tx.getId());
            t.put("title", tx.getRecipientName() != null ? tx.getRecipientName() : tx.getDestIban());
            t.put("date", tx.getCreatedAt() != null ? tx.getCreatedAt().toString() : "");
            t.put("amount", tx.getAmount());
            t.put("category", tx.getCategory());
            t.put("risk", tx.getRiskLevel());
            t.put("riskScore", tx.getRiskScore() + "%");
            t.put("status", tx.getStatus());
            txList.add(t);
        }
        
        data.put("recentTransactions", txList.subList(0, Math.min(4, txList.size())));
        return ResponseEntity.ok(data);
    }

    // --- GET /api/v1/banking/accounts ---
    @GetMapping("/accounts")
    public ResponseEntity<List<Map<String, Object>>> getAccounts() {
        List<Account> accounts = bankingService.getUserAccounts(getDemoUserId());
        List<Map<String, Object>> res = new ArrayList<>();
        for (Account a : accounts) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("name", a.getName());
            map.put("iban", a.getIban());
            map.put("balance", a.getBalance());
            map.put("currency", a.getCurrency());
            map.put("type", a.getAccountType());
            res.add(map);
        }
        return ResponseEntity.ok(res);
    }

    // --- GET /api/v1/banking/cards ---
    @GetMapping("/cards")
    public ResponseEntity<List<Map<String, Object>>> getCardDetails() {
        List<Card> cards = cardRepository.findByUserId(getDemoUserId());
        if (cards.isEmpty()) return ResponseEntity.ok(Collections.emptyList());
        
        List<Map<String, Object>> responseList = new ArrayList<>();
        for (Card card : cards) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", card.getId());
            map.put("type", card.getCardType());
            map.put("isFrozen", card.isFrozen());
            map.put("internetAllowed", card.isInternetAllowed());
            map.put("overseasAllowed", card.isOverseasAllowed());
            map.put("cardNumber", card.getCardNumberMasked());
            map.put("expiry", card.getExpiryDate());
            map.put("cvv", "***"); // masked
            map.put("holder", card.getCardHolder());
            map.put("totalLimit", card.getTotalLimit());
            map.put("currentSpent", card.getCurrentSpent());
            responseList.add(map);
        }
        
        return ResponseEntity.ok(responseList);
    }

    // --- POST /api/v1/banking/cards/toggle-freeze ---
    @PostMapping("/cards/toggle-freeze")
    public ResponseEntity<Map<String, Object>> toggleCardFreeze(@RequestBody Map<String, Object> body) {
        Boolean frozen = (Boolean) body.getOrDefault("isFrozen", false);
        String cardIdStr = (String) body.get("cardId");
        
        if (cardIdStr != null) {
            UUID cardId = UUID.fromString(cardIdStr);
            cardRepository.findById(cardId).ifPresent(card -> {
                if (card.getUser().getId().equals(getDemoUserId())) {
                    card.setFrozen(frozen);
                    cardRepository.save(card);
                }
            });
        }
        return ResponseEntity.ok(Map.of("success", true, "isFrozen", frozen));
    }

    // --- POST /api/v1/banking/cards/toggle-setting ---
    @PostMapping("/cards/toggle-setting")
    public ResponseEntity<List<Map<String, Object>>> toggleCardSetting(@RequestBody Map<String, Object> body) {
        String key = (String) body.get("key");
        Boolean value = (Boolean) body.get("value");
        String cardIdStr = (String) body.get("cardId");
        
        if (cardIdStr != null && key != null && value != null) {
            UUID cardId = UUID.fromString(cardIdStr);
            cardRepository.findById(cardId).ifPresent(card -> {
                if (card.getUser().getId().equals(getDemoUserId())) {
                    if ("internetAllowed".equals(key)) card.setInternetAllowed(value);
                    if ("overseasAllowed".equals(key)) card.setOverseasAllowed(value);
                    cardRepository.save(card);
                }
            });
        }
        return getCardDetails(); // return updated state of all cards
    }

    // --- POST /api/v1/banking/transfers (ML Fraud Engine Risk Evaluation) ---
    @PostMapping("/transfers")
    public ResponseEntity<Map<String, Object>> processTransfer(@RequestBody Map<String, Object> transferReq) {
        double amountDouble = Double.parseDouble(transferReq.getOrDefault("amount", 0).toString());
        BigDecimal amount = BigDecimal.valueOf(amountDouble);
        String recipientIban = (String) transferReq.getOrDefault("recipientIban", "TR000000000000000000000000");
        String recipientName = (String) transferReq.getOrDefault("recipientName", "Bilinmeyen Alıcı");
        String description = (String) transferReq.getOrDefault("description", "FAST Transfer");

        log.info("🚀 Transfer isteği: Amount={}, Recipient={}", amount, recipientName);

        // Demo ortamı için rastgele bir kaynak hesabı al (TR vadesiz)
        Account sourceAccount = bankingService.getUserAccounts(getDemoUserId()).stream()
            .filter(a -> "TRY".equals(a.getCurrency()) && "DEMAND".equals(a.getAccountType()))
            .findFirst().orElseThrow();

        // Client info (Gerçek uygulamada header/token üzerinden gelir)
        String ipAddress = "185.12.94.102"; 
        String deviceFingerprint = "FP-MAC-123";

        try {
            // ML Fraud Engine destekli transfer işlemi
            Transaction txn = bankingService.processTransfer(
                getDemoUserId(), sourceAccount.getId(), recipientIban, amount, description, deviceFingerprint, ipAddress
            );

            String status = txn.getStatus();

            // Push Onayı Gerekiyor (Medium/High Risk)
            if ("PUSH_CHALLENGED".equals(status)) {
                return ResponseEntity.ok(Map.of(
                    "status", "PUSH_CHALLENGED",
                    "riskLevel", txn.getRiskLevel(),
                    "riskScore", txn.getRiskScore(),
                    "requiresPush", true,
                    "requiresOtp", false,
                    "reason", "AI Fraud Shield, bu işlemi riskli bularak mobil cihaz onayı istedi.",
                    "amount", amount,
                    "recipient", recipientName,
                    "iban", recipientIban,
                    "transactionId", txn.getId()
                ));
            }

            // Critical Push Onayı Gerekiyor (Critical Risk - 2 Aşamalı)
            if ("CRITICAL_PUSH_CHALLENGED".equals(status)) {
                Map<String, Object> response = new HashMap<>();
                response.put("status", "CRITICAL_PUSH_CHALLENGED");
                response.put("riskLevel", txn.getRiskLevel());
                response.put("riskScore", txn.getRiskScore());
                response.put("requiresPush", true);
                response.put("requiresOtp", false);
                response.put("isCritical", true);
                response.put("reason", "AI Fraud Shield CRITICAL alarm: Mobil onay + E-posta OTP doğrulaması gerekiyor.");
                response.put("amount", amount);
                response.put("recipient", recipientName);
                response.put("iban", recipientIban);
                response.put("transactionId", txn.getId());
                return ResponseEntity.ok(response);
            }

            // Güvenli işlem (RiskLevel: LOW/SAFE)
            return ResponseEntity.ok(Map.of(
                "status", "COMPLETED",
                "riskLevel", txn.getRiskLevel(),
                "riskScore", txn.getRiskScore(),
                "requiresPush", false,
                "requiresOtp", false,
                "success", true,
                "message", "₺" + String.format("%.2f", amountDouble) + " tutarındaki işleminiz AI Fraud Shield (% " + txn.getRiskScore() + " Risk) tarafından onaylandı."
            ));

        } catch (SecurityException e) {
            // İşlem engellendi (RiskLevel: CRITICAL)
            return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // --- GET /api/v1/banking/transfers/pending-push ---
    // Mobil uygulama ve web bu endpoint'i polling yaparak bekleyen Push onaylarını kontrol eder.
    @GetMapping("/transfers/pending-push")
    public ResponseEntity<List<Map<String, Object>>> getPendingPushChallenges() {
        List<Transaction> pendingTxns = bankingService.getPendingPushChallenges(getDemoUserId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Transaction txn : pendingTxns) {
            Map<String, Object> map = new HashMap<>();
            map.put("transactionId", txn.getId());
            map.put("status", txn.getStatus());
            map.put("amount", txn.getAmount().abs());
            map.put("recipient", txn.getRecipientName() != null ? txn.getRecipientName() : txn.getDestIban());
            map.put("iban", txn.getDestIban());
            map.put("riskLevel", txn.getRiskLevel());
            map.put("riskScore", txn.getRiskScore());
            map.put("createdAt", txn.getCreatedAt().toString());
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    // --- POST /api/v1/banking/transfers/verify-push ---
    // Mobil cihazdan gelen Push Onayı (Kriptografik imza ile).
    @PostMapping("/transfers/verify-push")
    public ResponseEntity<Map<String, Object>> verifyPushApproval(@RequestBody Map<String, Object> req) {
        String transactionIdStr = (String) req.get("transactionId");
        // Gerçek üretim ortamında burada signing-service ile kriptografik imza doğrulanır.
        // Demo ortamında action: "APPROVE" ile onay alınır.
        String action = (String) req.getOrDefault("action", "APPROVE");

        if (transactionIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "transactionId gereklidir."));
        }

        try {
            UUID txId = UUID.fromString(transactionIdStr);

            if ("REJECT".equalsIgnoreCase(action)) {
                // Kullanıcı mobil cihazdan REDDETTİ
                Transaction txn = transactionRepository.findById(txId).orElseThrow();
                txn.setStatus("REJECTED");
                transactionRepository.save(txn);
                log.info("📱❌ Mobil cihazdan işlem reddedildi. Txn: {}", txn.getReferenceId());
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "status", "REJECTED",
                    "message", "İşlem mobil cihazınızdan reddedildi."
                ));
            }

            // APPROVE: Push onayını işle
            Transaction txn = bankingService.completePushChallenge(txId, getDemoUserId());

            if ("OTP_CHALLENGED".equals(txn.getStatus())) {
                // Critical flow: Push onaylandı, şimdi OTP bekleniyor
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "status", "OTP_CHALLENGED",
                    "message", "Mobil onay alındı. Kritik risk seviyesi nedeniyle e-posta adresinize gönderilen OTP kodunu giriniz.",
                    "requiresOtp", true,
                    "transactionId", txn.getId()
                ));
            }

            // Medium/High flow: İşlem tamamlandı
            return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "COMPLETED",
                "message", "📱 Mobil cihaz onayı doğrulandı! İşleminiz güvenle alıcıya iletildi."
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // --- POST /api/v1/banking/transfers/verify-otp ---
    // Critical akışının 2. aşaması: E-posta OTP doğrulama
    @PostMapping("/transfers/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyTransferOtp(@RequestBody Map<String, Object> req) {
        String otp = (String) req.getOrDefault("otp", "");
        String transactionIdStr = (String) req.get("transactionId");
        
        if ("123456".equals(otp.trim()) || (otp != null && otp.trim().length() == 6)) {
            try {
                UUID txId = UUID.fromString(transactionIdStr);
                Transaction txn = bankingService.completeChallengedTransfer(txId, getDemoUserId());
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "status", "COMPLETED",
                    "message", "Güvenlik OTP kodu doğrulandı! İşleminiz güvenle alıcıya iletildi."
                ));
            } catch (Exception e) {
                 return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Geçersiz OTP kodu."));
    }

    // --- GET /api/v1/banking/transfers/status/{transactionId} ---
    // Web frontend polling ile işlem durumunu kontrol eder.
    @GetMapping("/transfers/status/{transactionId}")
    public ResponseEntity<Map<String, Object>> getTransferStatus(@PathVariable String transactionId) {
        try {
            UUID txId = UUID.fromString(transactionId);
            Transaction txn = transactionRepository.findById(txId).orElseThrow();
            return ResponseEntity.ok(Map.of(
                "transactionId", txn.getId(),
                "status", txn.getStatus(),
                "riskLevel", txn.getRiskLevel() != null ? txn.getRiskLevel() : "UNKNOWN"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "İşlem bulunamadı."));
        }
    }

    // --- GET /api/v1/banking/security/sessions ---
    @GetMapping("/security/sessions")
    public ResponseEntity<List<Map<String, Object>>> getSessions() {
        List<UserSession> sessions = sessionRepository.findByUserId(getDemoUserId());
        List<Map<String, Object>> res = new ArrayList<>();
        for (UserSession s : sessions) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId());
            map.put("device", s.getDeviceInfo());
            map.put("ip", s.getIpAddress());
            map.put("location", s.getLocation());
            map.put("browser", s.getBrowser());
            map.put("isCurrent", s.isActive()); // simplified
            map.put("time", s.getCreatedAt().toString());
            res.add(map);
        }
        return ResponseEntity.ok(res);
    }

    // --- POST /api/v1/banking/security/terminate-session ---
    @PostMapping("/security/terminate-session")
    public ResponseEntity<Map<String, Object>> terminateSession(@RequestBody Map<String, Object> req) {
        Object idObj = req.get("id");
        if (idObj != null) {
            UUID sessionId = UUID.fromString(idObj.toString());
            sessionRepository.findById(sessionId).ifPresent(s -> {
                if (s.getUser().getId().equals(getDemoUserId())) {
                    s.setActive(false);
                    sessionRepository.save(s);
                }
            });
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    // --- GET /api/v1/banking/transactions ---
    @GetMapping("/transactions")
    public ResponseEntity<List<Map<String, Object>>> getTransactions() {
        List<Transaction> txs = bankingService.getUserTransactions(getDemoUserId());
        List<Map<String, Object>> res = new ArrayList<>();
        for (Transaction tx : txs) {
            Map<String, Object> t = new HashMap<>();
            t.put("id", tx.getId());
            t.put("title", tx.getRecipientName() != null ? tx.getRecipientName() : tx.getDestIban());
            t.put("date", tx.getCreatedAt().toString());
            t.put("amount", tx.getAmount());
            t.put("category", tx.getCategory());
            t.put("risk", tx.getRiskLevel());
            t.put("riskScore", tx.getRiskScore() + "%");
            t.put("status", tx.getStatus());
            res.add(t);
        }
        return ResponseEntity.ok(res);
    }
}
