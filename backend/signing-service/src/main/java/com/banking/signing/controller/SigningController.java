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

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@RestController
@RequestMapping("/api/v1/signing")
public class SigningController {

    @Autowired
    private UserPublicKeyRepository repository;

    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;

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

            Signature ecdsaVerify = Signature.getInstance("SHA256withECDSAinP1363Format");
            ecdsaVerify.initVerify(pubKey);
            ecdsaVerify.update(payload.getBytes("UTF-8"));
            
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            boolean isValid = ecdsaVerify.verify(signatureBytes);

            // --- DETAYLI KRİPTOGRAFİK AUDIT LOG (Jüriye Kanıt İçin) ---
            String pubKeyHex = bytesToHex(publicBytes);
            String sigHex = bytesToHex(signatureBytes);
            
            System.out.println("\n========================================================");
            System.out.println("🔐 [SEALCONF] KRİPTOGRAFİK İMZA DOĞRULAMA AUDIT LOG");
            System.out.println("========================================================");
            System.out.println("▶ Payload (Raw)   : " + payload);
            System.out.println("▶ Public Key (Hex): " + pubKeyHex.substring(0, 40) + "...");
            System.out.println("▶ Signature (Hex) : " + sigHex.substring(0, 40) + "...");
            System.out.println("▶ Math Check (ECDSA P-256): " + (isValid ? "PASSED ✅" : "FAILED ❌"));
            System.out.println("========================================================\n");
            
            try {
                ObjectNode auditLog = objectMapper.createObjectNode();
                auditLog.put("timestamp", System.currentTimeMillis());
                auditLog.put("source", "sealconf-crypto-engine");
                auditLog.put("payload", payload);
                auditLog.put("publicKeyHex", pubKeyHex);
                auditLog.put("signatureHex", sigHex);
                auditLog.put("algorithm", "SHA256withECDSA");
                auditLog.put("mathCheckResult", isValid ? "PASSED" : "FAILED");
                
                // RabbitMQ'ya mesajı gönder (Jüri bunu RabbitMQ Management arayüzünde görecek!)
                rabbitTemplate.convertAndSend("crypto.audit.logs", auditLog.toString());
            } catch (Exception rmqEx) {
                System.err.println("RabbitMQ'ya audit log gönderilemedi: " + rmqEx.getMessage());
            }
            // ---------------------------------------------------------

            return isValid;
        } catch (Exception e) {
            System.err.println("Cryptographic verification failed: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private byte[] convertRawToDer(byte[] rawSignature) {
        if (rawSignature.length != 64) {
            return rawSignature; 
        }
        byte[] r = new byte[32];
        byte[] s = new byte[32];
        System.arraycopy(rawSignature, 0, r, 0, 32);
        System.arraycopy(rawSignature, 32, s, 0, 32);

        int rPad = r[0] < 0 ? 1 : 0;
        int sPad = s[0] < 0 ? 1 : 0;
        
        int rLen = 32;
        int sLen = 32;
        
        while (rLen > 1 && r[32 - rLen] == 0 && r[32 - rLen + 1] >= 0) rLen--;
        while (sLen > 1 && s[32 - sLen] == 0 && s[32 - sLen + 1] >= 0) sLen--;

        byte[] der = new byte[6 + rLen + rPad + sLen + sPad];
        der[0] = 0x30;
        der[1] = (byte) (der.length - 2);
        der[2] = 0x02;
        der[3] = (byte) (rLen + rPad);
        
        if (rPad == 1) der[4] = 0x00;
        System.arraycopy(r, 32 - rLen, der, 4 + rPad, rLen);
        
        int sOffset = 4 + rPad + rLen;
        der[sOffset] = 0x02;
        der[sOffset + 1] = (byte) (sLen + sPad);
        
        if (sPad == 1) der[sOffset + 2] = 0x00;
        System.arraycopy(s, 32 - sLen, der, sOffset + 2 + sPad, sLen);
        
        return der;
    }
}
