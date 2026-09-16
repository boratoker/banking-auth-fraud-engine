package com.banking.auth.service;

import com.banking.auth.event.BankingEventProducer;
import com.banking.auth.ml.MlFraudInferenceEngine;
import com.banking.auth.model.Account;
import com.banking.auth.model.FraudEvaluation;
import com.banking.auth.model.Transaction;
import com.banking.auth.model.User;
import com.banking.auth.repository.AccountRepository;
import com.banking.auth.repository.TransactionRepository;
import com.banking.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Banking Servisi
 * JPA ile kalıcı veri yönetimi, atomik (transactional) para transferi
 * ve ML Fraud Engine entegrasyonu.
 */
@Service
public class BankingService {

    private static final Logger log = LoggerFactory.getLogger(BankingService.class);

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final BankingEventProducer eventProducer;
    private final MlFraudInferenceEngine fraudEngine;
    private final EmailService emailService;
    
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    private final java.util.Map<String, String> alertFallbackMap = new java.util.concurrent.ConcurrentHashMap<>();

    public BankingService(AccountRepository accountRepository,
                          TransactionRepository transactionRepository,
                          UserRepository userRepository,
                          BankingEventProducer eventProducer,
                          MlFraudInferenceEngine fraudEngine,
                          EmailService emailService) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.eventProducer = eventProducer;
        this.fraudEngine = fraudEngine;
        this.emailService = emailService;
    }

    /**
     * Kullanıcının hesaplarını getirir.
     */
    public List<Account> getUserAccounts(UUID userId) {
        return accountRepository.findByUserId(userId);
    }

    /**
     * Kullanıcının son işlemlerini getirir.
     */
    public List<Transaction> getUserRecentTransactions(UUID userId) {
        return transactionRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Kullanıcının tüm işlemlerini getirir.
     */
    public List<Transaction> getUserTransactions(UUID userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Para transferi başlatır ve ML fraud kontrolünden geçirir.
     */
    @Transactional
    public Transaction processTransfer(UUID userId, UUID sourceAccountId, String destIban,
                                       BigDecimal amount, String description,
                                       String deviceFingerprint, String ipAddress) {
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı."));

        // Atomik bakiye güncellemesi için PESSIMISTIC_WRITE lock ile hesabı al
        Account sourceAccount = accountRepository.findByIdForUpdate(sourceAccountId)
            .orElseThrow(() -> new IllegalArgumentException("Kaynak hesap bulunamadı."));

        if (!sourceAccount.getUser().getId().equals(userId)) {
            throw new SecurityException("Hesap yetkisi yok.");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer tutarı sıfırdan büyük olmalıdır.");
        }

        if (sourceAccount.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Yetersiz bakiye.");
        }

        // 1. İşlemi PENDING olarak kaydet
        Transaction txn = new Transaction();
        txn.setUser(user);
        txn.setSourceAccount(sourceAccount);
        txn.setSourceIban(sourceAccount.getIban());
        txn.setDestIban(destIban);
        txn.setAmount(amount.negate()); // Çıkış
        txn.setCurrency(sourceAccount.getCurrency());
        txn.setTransferType("FAST");
        txn.setCategory("Transfer");
        txn.setDescription(description);
        txn.setStatus("PENDING_EVALUATION");
        
        txn = transactionRepository.save(txn);
        eventProducer.publishTransferInitiated(txn.getReferenceId(), user.getId().toString(), destIban, amount, sourceAccount.getCurrency());

        // 2. ML Fraud Değerlendirmesi (sub-5ms)
        FraudEvaluation evaluation = fraudEngine.evaluate(
            user, txn, amount, destIban, "FAST", sourceAccount.getCurrency(),
            sourceAccount.getCurrency(), deviceFingerprint, ipAddress
        );

        txn.setRiskScore(BigDecimal.valueOf(evaluation.getRiskScore()));
        txn.setRiskLevel(evaluation.getRiskLevel());

        // 3. Karara göre işlemi ilerlet
        String decision = evaluation.getDecision();
        eventProducer.publishFraudEvaluated(txn.getReferenceId(), evaluation.getRiskScore(), evaluation.getRiskLevel(), decision);

        if ("BLOCK".equals(decision)) {
            txn.setStatus("REJECTED");
            transactionRepository.save(txn);
            eventProducer.publishTransferBlocked(txn.getReferenceId(), evaluation.getRiskScore(), evaluation.getReason());
            throw new SecurityException("İşlem güvenlik politikası gereği engellendi. Neden: " + evaluation.getReason());
        } 
        
        if ("PUSH_CHALLENGED".equals(decision)) {
            txn.setStatus("PUSH_CHALLENGED");
            transactionRepository.save(txn);
            log.info("📱 Push Onay bekliyor. Txn: {}, Risk: {}", txn.getReferenceId(), evaluation.getRiskLevel());
            return txn; 
        }

        if ("CRITICAL_PUSH_CHALLENGED".equals(decision)) {
            txn.setStatus("CRITICAL_PUSH_CHALLENGED");
            transactionRepository.save(txn);
            log.info("🔴 Critical Push Onay bekliyor (2 aşamalı). Txn: {}, Risk: {}", txn.getReferenceId(), evaluation.getRiskLevel());
            return txn; 
        }

        // 4. Onay (APPROVE) - Bakiye düş
        executeTransfer(txn, sourceAccount, amount);
        return txn;
    }

    /**
     * Push onayı (Mobil Cihaz İmzası) doğrulandıktan sonra:
     * - PUSH_CHALLENGED → İşlemi doğrudan COMPLETED yapar.
     * - CRITICAL_PUSH_CHALLENGED → İşlemi OTP_CHALLENGED'a çeker (2. aşama: E-posta OTP).
     */
    @Transactional
    public Transaction completePushChallenge(UUID transactionId, UUID userId) {
        Transaction txn = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("İşlem bulunamadı."));

        if (!txn.getUser().getId().equals(userId)) {
             throw new SecurityException("İşlem yetkisi yok.");
        }

        String status = txn.getStatus();

        if ("PUSH_CHALLENGED".equals(status)) {
            // Medium/High risk: Push onayı yeterli, direkt tamamla
            Account sourceAccount = accountRepository.findByIdForUpdate(txn.getSourceAccount().getId())
                .orElseThrow(() -> new IllegalArgumentException("Kaynak hesap bulunamadı."));
            executeTransfer(txn, sourceAccount, txn.getAmount().abs());
            log.info("📱✅ Push onayı ile transfer tamamlandı. Txn: {}", txn.getReferenceId());
            return txn;
        }

        if ("CRITICAL_PUSH_CHALLENGED".equals(status)) {
            // Critical risk: Push onayı alındı, şimdi E-posta OTP gönder (2. aşama)
            txn.setStatus("OTP_CHALLENGED");
            transactionRepository.save(txn);
            
            String otpCode = String.format("%06d", new java.util.Random().nextInt(999999));
            emailService.sendOtpEmail(txn.getUser().getEmail(), otpCode, "transfer");
            log.info("🔴➡️ Critical Push onaylandı, OTP gönderildi. Txn: {}", txn.getReferenceId());
            return txn;
        }

        throw new IllegalStateException("Bu işlem Push onay bekleyen durumda değil. Mevcut durum: " + status);
    }

    /**
     * OTP doğrulandıktan sonra işlemi tamamlar (Critical akışının 2. aşaması).
     */
    @Transactional
    public Transaction completeChallengedTransfer(UUID transactionId, UUID userId) {
        Transaction txn = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("İşlem bulunamadı."));

        if (!txn.getUser().getId().equals(userId)) {
             throw new SecurityException("İşlem yetkisi yok.");
        }

        if (!"OTP_CHALLENGED".equals(txn.getStatus())) {
            throw new IllegalStateException("Bu işlem OTP onay bekleyen durumda değil.");
        }

        Account sourceAccount = accountRepository.findByIdForUpdate(txn.getSourceAccount().getId())
            .orElseThrow(() -> new IllegalArgumentException("Kaynak hesap bulunamadı."));

        executeTransfer(txn, sourceAccount, txn.getAmount().abs());
        return txn;
    }

    /**
     * Belirli bir kullanıcının Push onayı bekleyen işlemlerini getirir.
     */
    public List<Transaction> getPendingPushChallenges(UUID userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .filter(t -> "PUSH_CHALLENGED".equals(t.getStatus()) || "CRITICAL_PUSH_CHALLENGED".equals(t.getStatus()))
            .toList();
    }
    
    private void executeTransfer(Transaction txn, Account sourceAccount, BigDecimal amountToSubtract) {
        sourceAccount.setBalance(sourceAccount.getBalance().subtract(amountToSubtract));
        accountRepository.save(sourceAccount);
        
        txn.setStatus("COMPLETED");
        txn.setCompletedAt(java.time.LocalDateTime.now());
        transactionRepository.save(txn);
        
        eventProducer.publishTransferCompleted(txn.getReferenceId(), amountToSubtract);
        log.info("💸 Transfer tamamlandı. Txn: {}, Tutar: {}", txn.getReferenceId(), amountToSubtract);

        // Yüksek veya Kritik Riskliyse E-posta ve Mobil Push Bildirimi Gönder
        if ("HIGH".equals(txn.getRiskLevel()) || "CRITICAL".equals(txn.getRiskLevel())) {
            // E-posta Bildirimi
            emailService.sendFraudAlertEmail(txn.getUser().getEmail(), txn);
            
            // Mobil Push Bildirimi (Redis üzerinden simüle ediliyor, mobile app poll edecek)
            String alertMessage = String.format("DİKKAT: Hesabınızdan %s %s tutarında riskli bir transfer gerçekleşti.", 
                                                amountToSubtract.toString(), txn.getCurrency());
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set("PENDING_ALERT:" + txn.getUser().getEmail(), alertMessage, java.time.Duration.ofMinutes(5));
            } else {
                alertFallbackMap.put("PENDING_ALERT:" + txn.getUser().getEmail(), alertMessage);
            }
        }
    }
    
    public String popPendingAlert(String email) {
        String key = "PENDING_ALERT:" + email;
        if (redisTemplate != null) {
            String alert = redisTemplate.opsForValue().get(key);
            if (alert != null) redisTemplate.delete(key);
            return alert;
        } else {
            return alertFallbackMap.remove(key);
        }
    }
}
