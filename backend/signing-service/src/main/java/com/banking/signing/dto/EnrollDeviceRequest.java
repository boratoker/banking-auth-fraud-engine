package com.banking.signing.dto;

import java.util.UUID;

public class EnrollDeviceRequest {
    private UUID userId;
    private String publicKey; // Base64 or PEM
    private String deviceName;

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    
    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }
    
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
}
