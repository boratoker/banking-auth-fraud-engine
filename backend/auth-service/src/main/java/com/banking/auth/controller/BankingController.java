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
    private UUID getDemoUserId() {
        return userRepository.findByEmail("bora@toker.com")
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("Demo kullanıcısı veritabanında bulunamadı. Lütfen SQL betiğinin (data.sql) çalıştığından emin olun."));
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
        data.put("riskScore", 98); // AI Overall Shield Score (Demo)
        data.put("riskStatus", "Safe");

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
    public ResponseEntity<Map<String, Object>> getCardDetails() {
        List<Card> cards = cardRepository.findByUserId(getDemoUserId());
        if (cards.isEmpty()) return ResponseEntity.notFound().build();
        
        Card card = cards.get(0);
        Map<String, Object> map = new HashMap<>();
        map.put("id", card.getId());
        map.put("isFrozen", card.isFrozen());
        map.put("internetAllowed", card.isInternetAllowed());
        map.put("overseasAllowed", card.isOverseasAllowed());
        map.put("cardNumber", card.getCardNumberMasked());
        map.put("expiry", card.getExpiryDate());
        map.put("cvv", "***"); // masked
        map.put("holder", card.getCardHolder());
        
        return ResponseEntity.ok(map);
    }

    // --- POST /api/v1/banking/cards/toggle-freeze ---
    @PostMapping("/cards/toggle-freeze")
    public ResponseEntity<Map<String, Object>> toggleCardFreeze(@RequestBody Map<String, Boolean> body) {
        Boolean frozen = body.getOrDefault("isFrozen", false);
        List<Card> cards = cardRepository.findByUserId(getDemoUserId());
        if (!cards.isEmpty()) {
            Card card = cards.get(0);
            card.setFrozen(frozen);
            cardRepository.save(card);
        }
        return ResponseEntity.ok(Map.of("success", true, "isFrozen", frozen));
    }

    // --- POST /api/v1/banking/cards/toggle-setting ---
    @PostMapping("/cards/toggle-setting")
    public ResponseEntity<Map<String, Object>> toggleCardSetting(@RequestBody Map<String, Object> body) {
        String key = (String) body.get("key");
        Boolean value = (Boolean) body.get("value");
        List<Card> cards = cardRepository.findByUserId(getDemoUserId());
        if (!cards.isEmpty() && key != null && value != null) {
            Card card = cards.get(0);
            if ("internetAllowed".equals(key)) card.setInternetAllowed(value);
            if ("overseasAllowed".equals(key)) card.setOverseasAllowed(value);
            cardRepository.save(card);
        }
        return getCardDetails(); // return updated state
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

            // Eğer OTP gerektiriyorsa (RiskLevel: HIGH)
            if ("OTP_CHALLENGED".equals(txn.getStatus())) {
                return ResponseEntity.ok(Map.of(
                    "riskLevel", txn.getRiskLevel(),
                    "riskScore", txn.getRiskScore(),
                    "requiresOtp", true,
                    "reason", "AI Fraud Shield, bu işlemi riskli bularak ek doğrulama istedi.",
                    "amount", amount,
                    "recipient", recipientName,
                    "iban", recipientIban,
                    "transactionId", txn.getId()
                ));
            }

            // Güvenli işlem (RiskLevel: LOW/SAFE)
            return ResponseEntity.ok(Map.of(
                "riskLevel", txn.getRiskLevel(),
                "riskScore", txn.getRiskScore(),
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

    // --- POST /api/v1/banking/transfers/verify-otp ---
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
                    "message", "Güvenlik OTP kodu doğrulandı! İşleminiz güvenle alıcıya iletildi."
                ));
            } catch (Exception e) {
                 return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Geçersiz OTP kodu. Lütfen 123456 kodunu deneyin."));
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
