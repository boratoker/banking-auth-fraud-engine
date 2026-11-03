package com.banking.signing.controller;

import com.banking.signing.dto.VerifySignatureRequest;
import com.banking.signing.model.UserPublicKey;
import com.banking.signing.repository.UserPublicKeyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

/**
 * Tamper detection test: a transfer payload is signed with the device's ECDSA P-256 private key
 * (same P1363 format as WebCrypto), then IBAN, amount or description is changed after signing.
 * Every modified payload must be rejected; only the original payload may be accepted.
 */
@ExtendWith(MockitoExtension.class)
class SigningControllerTamperTest {

    private static final String ORIGINAL = "IBAN:TR330006100519786457841326,AMOUNT:100,DESC:Rent";

    @Mock private UserPublicKeyRepository repository;
    @Mock private RabbitTemplate rabbitTemplate;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks private SigningController controller;

    private final UUID userId = UUID.randomUUID();
    private KeyPair deviceKey;

    @BeforeEach
    void enrollDevice() throws Exception {
        deviceKey = newP256KeyPair();
        when(repository.findAllByUserId(userId)).thenReturn(List.of(enrolled(deviceKey)));
    }

    @Test
    void originalPayload_isAccepted() throws Exception {
        String signature = sign(deviceKey, ORIGINAL);
        assertEquals(200, verify(ORIGINAL, signature).getStatusCode().value());
    }

    @Test
    void amountChangedByOneCent_isRejected() throws Exception {
        String signature = sign(deviceKey, ORIGINAL);
        String tampered = "IBAN:TR330006100519786457841326,AMOUNT:100.01,DESC:Rent";
        assertEquals(400, verify(tampered, signature).getStatusCode().value());
    }

    @Test
    void destinationIbanChanged_isRejected() throws Exception {
        String signature = sign(deviceKey, ORIGINAL);
        String tampered = "IBAN:TR990006100519786457849999,AMOUNT:100,DESC:Rent";
        assertEquals(400, verify(tampered, signature).getStatusCode().value());
    }

    @Test
    void descriptionChanged_isRejected() throws Exception {
        String signature = sign(deviceKey, ORIGINAL);
        String tampered = "IBAN:TR330006100519786457841326,AMOUNT:100,DESC:Gift";
        assertEquals(400, verify(tampered, signature).getStatusCode().value());
    }

    @Test
    void signatureFromUnenrolledDevice_isRejected() throws Exception {
        String attackerSignature = sign(newP256KeyPair(), ORIGINAL);
        assertEquals(400, verify(ORIGINAL, attackerSignature).getStatusCode().value());
    }

    @Test
    void secondEnrolledDevice_isAccepted() throws Exception {
        KeyPair mobileKey = newP256KeyPair();
        when(repository.findAllByUserId(userId)).thenReturn(List.of(enrolled(deviceKey), enrolled(mobileKey)));
        String signature = sign(mobileKey, ORIGINAL);
        assertEquals(200, verify(ORIGINAL, signature).getStatusCode().value());
    }

    private ResponseEntity<?> verify(String payload, String signature) {
        VerifySignatureRequest request = new VerifySignatureRequest();
        request.setUserId(userId);
        request.setPayload(payload);
        request.setSignature(signature);
        return controller.verifySignature(request);
    }

    private static KeyPair newP256KeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        return generator.generateKeyPair();
    }

    private static String sign(KeyPair keyPair, String payload) throws Exception {
        Signature signer = Signature.getInstance("SHA256withECDSAinP1363Format");
        signer.initSign(keyPair.getPrivate());
        signer.update(payload.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signer.sign());
    }

    private UserPublicKey enrolled(KeyPair keyPair) {
        String pem = "-----BEGIN PUBLIC KEY-----\n"
                + Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded())
                + "\n-----END PUBLIC KEY-----";
        UserPublicKey key = new UserPublicKey();
        key.setUserId(userId);
        key.setPublicKey(pem);
        return key;
    }
}
