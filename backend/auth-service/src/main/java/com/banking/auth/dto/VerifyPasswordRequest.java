package com.banking.auth.dto;

public class VerifyPasswordRequest {
    private String email;
    private String password;
    private String channel;

    public VerifyPasswordRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
}
