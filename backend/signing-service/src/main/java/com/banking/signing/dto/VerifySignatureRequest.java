package com.banking.signing.dto;

import java.util.UUID;

public class VerifySignatureRequest {
    private UUID userId;
    private String payload; // e.g. "amount:100,to:TR12345"
    private String signature; // Base64 signature

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    
    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }
}
