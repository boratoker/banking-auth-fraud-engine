@PostMapping("/verify")
public ResponseEntity<?> verifySignature(@RequestBody VerifySignatureRequest request) {
    List<UserPublicKey> keys = repository.findAllByUserId(request.getUserId());
    if (keys.isEmpty()) {
        return ResponseEntity.badRequest().body(Map.of("error", "No enrolled device found for user. Please enroll first."));
    }

    // The signature must be produced by the private key of one of the user's enrolled devices
    boolean isValid = keys.stream()
            .anyMatch(k -> verifyECDSA(request.getPayload(), request.getSignature(), k.getPublicKey()));

    if (isValid) {
        return ResponseEntity.ok(Map.of("message", "Signature is valid. Transaction approved.", "valid", true));
    } else {
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid cryptographic signature. Fraud detected or payload tampered.", "valid", false));
    }
}

private boolean verifyECDSA(String payload, String signatureBase64, String publicKeyBase64) {
    try {
        publicKeyBase64 = publicKeyBase64
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s+", "");

        byte[] publicBytes = Base64.getDecoder().decode(publicKeyBase64);
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(publicBytes);
        KeyFactory keyFactory = KeyFactory.getInstance("EC");
        PublicKey pubKey = keyFactory.generatePublic(keySpec);

        Signature ecdsaVerify = Signature.getInstance("SHA256withECDSAinP1363Format");
        ecdsaVerify.initVerify(pubKey);
        ecdsaVerify.update(payload.getBytes("UTF-8"));

        byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
        return ecdsaVerify.verify(signatureBytes);
    } catch (Exception e) {
        return false;
    }
}
