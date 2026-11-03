package com.banking.auth.service;

import com.banking.auth.event.BankingEventProducer;
import com.banking.auth.ml.MlFraudInferenceEngine;
import com.banking.auth.model.Account;
import com.banking.auth.model.FraudEvaluation;
import com.banking.auth.model.Transaction;
import com.banking.auth.model.User;
import com.banking.auth.model.UserSecuritySettings;
import com.banking.auth.notification.NotificationPublisher;
import com.banking.auth.repository.AccountRepository;
import com.banking.auth.repository.SecuritySettingsRepository;
import com.banking.auth.repository.TransactionRepository;
import com.banking.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Eşzamanlı transfer testi: aynı hesaptan çok sayıda thread aynı anda para çekmeye çalışır.
 * PESSIMISTIC_WRITE kilidi sayesinde bakiye hiçbir zaman eksiye düşmemeli, başarılı transfer sayısı
 * ile son bakiye matematiksel olarak tutarlı olmalı (double-spending yok).
 */
@DataJpaTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:concurrency;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.show-sql=false",
    "spring.sql.init.mode=never"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(BankingService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ConcurrentTransferIntegrationTest {

    private static final int THREADS = 20;
    private static final BigDecimal INITIAL_BALANCE = new BigDecimal("1000.00");
    private static final BigDecimal TRANSFER_AMOUNT = new BigDecimal("100.00");

    @Autowired private BankingService bankingService;
    @Autowired private UserRepository userRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private SecuritySettingsRepository securitySettingsRepository;

    @MockBean private MlFraudInferenceEngine fraudEngine;
    @MockBean private BankingEventProducer eventProducer;
    @MockBean private NotificationPublisher notificationPublisher;
    @MockBean private OtpStore otpStore;

    private UUID userId;
    private UUID accountId;

    @BeforeEach
    void setUp() {
        transactionRepository.deleteAll();
        securitySettingsRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        User user = userRepository.save(new User("concurrency@toker.com", "Test", "User"));
        userId = user.getId();

        UserSecuritySettings settings = new UserSecuritySettings();
        settings.setUser(user);
        settings.setDailyTransferLimit(new BigDecimal("1000000.00"));
        securitySettingsRepository.save(settings);

        Account account = new Account();
        account.setUser(user);
        account.setAccountNumber("1000-00000001");
        account.setIban("TR000006100000000100000001");
        account.setName("Test Vadesiz");
        account.setAccountType("DEMAND");
        account.setCurrency("TRY");
        account.setBalance(INITIAL_BALANCE);
        accountId = accountRepository.save(account).getId();

        FraudEvaluation approve = new FraudEvaluation();
        approve.setRiskScore(5);
        approve.setRiskLevel("SAFE");
        approve.setDecision("APPROVE");
        when(fraudEngine.evaluate(any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(approve);
    }

    @Test
    void concurrentTransfers_neverOverdraw_andBalanceStaysConsistent() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch startGate = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();

        for (int i = 0; i < THREADS; i++) {
            Callable<Boolean> task = () -> {
                startGate.await();
                try {
                    Transaction txn = bankingService.processTransfer(userId, accountId, "TR999999999999999999999999",
                            "Alıcı", TRANSFER_AMOUNT, "Eşzamanlılık testi", "FP-TEST", "127.0.0.1");
                    return "COMPLETED".equals(txn.getStatus());
                } catch (IllegalArgumentException insufficientBalance) {
                    return false;
                }
            };
            results.add(pool.submit(task));
        }

        startGate.countDown(); // tüm thread'ler aynı anda başlar
        int succeeded = 0;
        for (Future<Boolean> f : results) {
            if (f.get()) succeeded++;
        }
        pool.shutdown();

        BigDecimal finalBalance = accountRepository.findById(accountId).orElseThrow().getBalance();
        int expectedSuccesses = INITIAL_BALANCE.divide(TRANSFER_AMOUNT).intValue(); // 10

        System.out.printf("[CONCURRENCY] %d threads x %s TL | succeeded: %d | rejected: %d | final balance: %s TL%n",
                THREADS, TRANSFER_AMOUNT, succeeded, THREADS - succeeded, finalBalance);

        assertEquals(expectedSuccesses, succeeded, "Bakiye kadar transfer başarılı olmalı");
        assertEquals(0, finalBalance.compareTo(BigDecimal.ZERO), "Son bakiye 0 olmalı (eksiye düşmemeli)");
        assertEquals(0, INITIAL_BALANCE.subtract(TRANSFER_AMOUNT.multiply(BigDecimal.valueOf(succeeded)))
                .compareTo(finalBalance), "Başlangıç - başarılı transferler = son bakiye");
    }
}
