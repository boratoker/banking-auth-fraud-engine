package com.banking.signing.controller;

import com.banking.signing.dto.EnrollDeviceRequest;
import com.banking.signing.dto.VerifySignatureRequest;
import com.banking.signing.model.UserPublicKey;
import com.banking.signing.repository.UserPublicKeyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/signing")
public class SigningController {

    @Autowired
    private UserPublicKeyRepository repository;

    @PostMapping("/enroll")
    public ResponseEntity<?> enrollDevice(@RequestBody EnrollDeviceRequest request) {
        if (request.getUserId() == null || request.getPublicKey() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User ID and Public Key are required"));
        }

        Optional<UserPublicKey> existing = repository.findByUserId(request.getUserId());
        UserPublicKey key = existing.orElse(new UserPublicKey());
        
        key.setUserId(request.getUserId());
        key.setPublicKey(request.getPublicKey());
        key.setDeviceName(request.getDeviceName() != null ? request.getDeviceName() : "Web Browser");
        
        repository.save(key);
        
        return ResponseEntity.ok(Map.of("message", "Device enrolled successfully for cryptographic signing"));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifySignature(@RequestBody VerifySignatureRequest request) {
        if (request.getUserId() == null || request.getPayload() == null || request.getSignature() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User ID, Payload, and Signature are required"));
        }

        Optional<UserPublicKey> keyOpt = repository.findByUserId(request.getUserId());
        if (keyOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No enrolled device found for user. Please enroll first."));
        }

        String pubKeyStr = keyOpt.get().getPublicKey();
        boolean isValid = verifyECDSA(request.getPayload(), request.getSignature(), pubKeyStr);

        if (isValid) {
            return ResponseEntity.ok(Map.of("message", "Signature is valid. Transaction approved.", "valid", true));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid cryptographic signature. Fraud detected or payload tampered.", "valid", false));
        }
    }

    private boolean verifyECDSA(String payload, String signatureBase64, String publicKeyBase64) {
        try {
            // Strip PEM headers if present
            publicKeyBase64 = publicKeyBase64
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");

            byte[] publicBytes = Base64.getDecoder().decode(publicKeyBase64);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(publicBytes);
            // WebCrypto uses ECDSA P-256 by default usually, but we will support ECDSA
            KeyFactory keyFactory = KeyFactory.getInstance("EC"); 
            PublicKey pubKey = keyFactory.generatePublic(keySpec);

            Signature ecdsaVerify = Signature.getInstance("SHA256withECDSA");
            ecdsaVerify.initVerify(pubKey);
            ecdsaVerify.update(payload.getBytes("UTF-8"));
            
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            return ecdsaVerify.verify(signatureBytes);
        } catch (Exception e) {
            System.err.println("Cryptographic verification failed: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
}
