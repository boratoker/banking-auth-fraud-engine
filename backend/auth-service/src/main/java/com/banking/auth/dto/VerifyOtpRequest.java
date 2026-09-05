package com.banking.auth.dto;

public class VerifyOtpRequest {
    private String email;
    private String otp;
    private String mode; // "login" or "register"

    public VerifyOtpRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
}
