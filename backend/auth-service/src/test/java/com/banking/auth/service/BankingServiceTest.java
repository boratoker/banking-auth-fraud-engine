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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BankingServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BankingEventProducer eventProducer;

    @Mock
    private MlFraudInferenceEngine fraudEngine;

    @InjectMocks
    private BankingService bankingService;

    private User mockUser;
    private Account mockAccount;
    private UUID userId;
    private UUID accountId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        accountId = UUID.randomUUID();

        mockUser = new User();
        mockUser.setId(userId);
        mockUser.setEmail("test@toker.com");

        mockAccount = new Account();
        mockAccount.setId(accountId);
        mockAccount.setUser(mockUser);
        mockAccount.setBalance(new BigDecimal("5000.00"));
        mockAccount.setCurrency("TRY");
    }

    @Test
    void testProcessTransfer_InsufficientBalance_ThrowsException() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(accountRepository.findByIdForUpdate(accountId)).thenReturn(Optional.of(mockAccount));

        // Act & Assert
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            bankingService.processTransfer(userId, accountId, "TR001", new BigDecimal("10000.00"), "Kira", "device1", "127.0.0.1");
        });

        assertEquals("Yetersiz bakiye.", exception.getMessage());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void testProcessTransfer_NegativeAmount_ThrowsException() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(accountRepository.findByIdForUpdate(accountId)).thenReturn(Optional.of(mockAccount));

        // Act & Assert
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            bankingService.processTransfer(userId, accountId, "TR001", new BigDecimal("-500.00"), "Kira", "device1", "127.0.0.1");
        });

        assertEquals("Transfer tutarı sıfırdan büyük olmalıdır.", exception.getMessage());
    }

    @Test
    void testProcessTransfer_HighRisk_ChallengesOTP() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(accountRepository.findByIdForUpdate(accountId)).thenReturn(Optional.of(mockAccount));
        
        FraudEvaluation mockEval = new FraudEvaluation();
        mockEval.setRiskLevel("HIGH");
        mockEval.setRiskScore(75);
        mockEval.setDecision("CHALLENGE_OTP");
        
        when(fraudEngine.evaluate(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(mockEval);

        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        Transaction result = bankingService.processTransfer(userId, accountId, "TR001", new BigDecimal("1000.00"), "Kira", "device1", "127.0.0.1");

        // Assert
        assertEquals("OTP_CHALLENGED", result.getStatus());
        assertEquals("HIGH", result.getRiskLevel());
        verify(accountRepository, never()).save(any()); // Bakiye düşmemeli
    }

    @Test
    void testProcessTransfer_SafeRisk_CompletesTransfer() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(accountRepository.findByIdForUpdate(accountId)).thenReturn(Optional.of(mockAccount));
        
        FraudEvaluation mockEval = new FraudEvaluation();
        mockEval.setRiskLevel("SAFE");
        mockEval.setRiskScore(10);
        mockEval.setDecision("APPROVE");
        
        when(fraudEngine.evaluate(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(mockEval);

        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        Transaction result = bankingService.processTransfer(userId, accountId, "TR001", new BigDecimal("1000.00"), "Kira", "device1", "127.0.0.1");

        // Assert
        assertEquals("COMPLETED", result.getStatus());
        assertEquals(new BigDecimal("4000.00"), mockAccount.getBalance()); // Bakiye düştü mü?
        verify(accountRepository, times(1)).save(mockAccount);
    }
}
