// Transaction signing: the signature is mandatory and verified BEFORE the balance changes
UUID userId = getDemoUserId();   // resolved from the verified session token
if (signature == null || signature.isBlank()) {
    securityAudit.logEvent(userEmail, "SIGNATURE_MISSING", "WARN", ipAddress, deviceFingerprint,
        "{\"iban\": \"" + recipientIban + "\", \"amount\": \"" + transferReq.get("amount") + "\"}");
    return ResponseEntity.status(403).body(Map.of(
        "error", "İşlem imzası zorunludur. Lütfen cihazınızı kaydedip tekrar deneyiniz.",
        "signatureRequired", true));
}

// The canonical payload is rebuilt on the server from the request fields
String payloadStr = SigningClient.canonicalTransferPayload(
    recipientIban, transferReq.get("amount"), transferReq.get("description"));
SigningClient.Result verification = signingClient.verify(userId, payloadStr, signature);

if (verification == SigningClient.Result.UNAVAILABLE) {
    return ResponseEntity.status(503).body(Map.of("error", "Kriptografik imza servisi yanıt vermiyor. İşlem reddedildi."));
}
if (verification == SigningClient.Result.INVALID) {
    securityAudit.logEvent(userEmail, "SIGNATURE_INVALID", "CRITICAL", ipAddress, deviceFingerprint,
        "{\"payload\": \"" + payloadStr.replace("\"", "'") + "\"}");
    return ResponseEntity.status(403).body(Map.of(
        "error", "Geçersiz kriptografik imza: işlem verisi değiştirilmiş olabilir. İşlem reddedildi.",
        "signatureValid", false));
}
