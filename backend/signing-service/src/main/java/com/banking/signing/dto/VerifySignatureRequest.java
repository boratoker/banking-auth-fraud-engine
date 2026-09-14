package com.banking.signing.dto;

public class VerifySignatureRequest {
    private Long userId;
    private String payload; // e.g. "amount:100,to:TR12345"
    private String signature; // Base64 signature

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    
    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }
}
