package com.banking.signing.dto;

public class EnrollDeviceRequest {
    private Long userId;
    private String publicKey; // Base64 or PEM
    private String deviceName;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }
    
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
}
