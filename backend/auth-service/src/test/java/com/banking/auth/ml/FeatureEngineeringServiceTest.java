package com.banking.auth.ml;

import com.banking.auth.model.User;
import com.banking.auth.repository.BeneficiaryContactRepository;
import com.banking.auth.repository.TransactionRepository;
import com.banking.auth.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeatureEngineeringServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private BeneficiaryContactRepository beneficiaryRepository;

    @Mock
    private UserSessionRepository sessionRepository;

    @InjectMocks
    private FeatureEngineeringService featureService;

    private User mockUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        mockUser = new User();
        mockUser.setId(userId);
    }

    @Test
    void testComputeFeatures_NewRecipient_IsNewRecipientFlagIs1() {
        // Arrange
        String destIban = "TR001NEWIBAN";
        when(transactionRepository.countByUserIdAndDestIban(eq(userId), eq(destIban)))
                .thenReturn(0L); // Daha önce hiç transfer yok

        // Act
        Map<String, Object> features = featureService.computeFeatures(
                mockUser, new BigDecimal("1000.00"), destIban, "FAST", "TRY", "TRY", "device1", "127.0.0.1"
        );

        // Assert
        assertEquals(1, features.get("is_new_recipient_iban"), "Yeni IBAN olduğu için 1 dönmeli.");
    }

    @Test
    void testComputeFeatures_KnownRecipient_IsNewRecipientFlagIs0() {
        // Arrange
        String destIban = "TR001KNOWNIBAN";
        when(transactionRepository.countByUserIdAndDestIban(eq(userId), eq(destIban)))
                .thenReturn(5L); // Daha önce 5 kez başarılı transfer yapılmış

        // Act
        Map<String, Object> features = featureService.computeFeatures(
                mockUser, new BigDecimal("1000.00"), destIban, "FAST", "TRY", "TRY", "device1", "127.0.0.1"
        );

        // Assert
        assertEquals(0, features.get("is_new_recipient_iban"), "Tanıdık IBAN olduğu için 0 dönmeli.");
    }
}
