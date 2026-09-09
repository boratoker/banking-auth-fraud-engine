package com.banking.auth.ml;

import com.banking.auth.model.FraudEvaluation;
import com.banking.auth.model.Transaction;
import com.banking.auth.model.User;
import com.banking.auth.repository.FraudEvaluationRepository;
import com.banking.auth.repository.FraudFeatureStoreRepository;
import com.banking.auth.repository.FraudModelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MlFraudInferenceEngineTest {

    @Mock
    private FeatureEngineeringService featureService;

    @Mock
    private FraudModelRepository fraudModelRepository;

    @Mock
    private FraudFeatureStoreRepository featureStoreRepository;

    @Mock
    private FraudEvaluationRepository evaluationRepository;

    @InjectMocks
    private MlFraudInferenceEngine fraudEngine;

    private User mockUser;
    private Transaction mockTx;
    private Map<String, Object> mockFeatures;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId(UUID.randomUUID());
        
        mockTx = new Transaction();
        mockTx.setId(UUID.randomUUID());
        
        mockFeatures = new HashMap<>();
        // Set standard safe features
        mockFeatures.put("amount", 1000.0);
        mockFeatures.put("amount_to_user_avg_ratio", 1.0);
        mockFeatures.put("is_new_recipient_iban", 0.0);
        mockFeatures.put("is_night_time", 0.0);
        mockFeatures.put("tx_count_last_1h", 1.0);
        mockFeatures.put("device_fingerprint_matched", 1.0);
        mockFeatures.put("recipient_in_contacts", 1.0);
        mockFeatures.put("time_since_last_tx_sec", 3600.0);
    }

    @Test
    void testEvaluate_RuleBasedFallback_HighAmount_ScoresProperly() {
        // Arrange
        // Simulate ONNX not available
        ReflectionTestUtils.setField(fraudEngine, "onnxAvailable", false);
        
        // High amount to trigger rule-based points
        mockFeatures.put("amount", 60000.0);
        
        when(featureService.computeFeatures(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(mockFeatures);
                
        when(featureService.toJson(any())).thenReturn("{}");

        // Act
        FraudEvaluation evaluation = fraudEngine.evaluate(
                mockUser, mockTx, new BigDecimal("60000.00"), "TR001", "FAST", "TRY", "TRY", "device1", "127.0.0.1"
        );

        // Assert
        assertNotNull(evaluation);
        // >= 50,000 gives 30 points in rule-based
        assertEquals(30, evaluation.getRiskScore());
        assertEquals("MEDIUM", evaluation.getRiskLevel()); // 30 is MEDIUM
    }
}
