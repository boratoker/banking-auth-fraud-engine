package com.banking.auth.notification;

import com.banking.auth.model.Transaction;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

/**
 * RabbitMQ bildirim kuyruğuna JSON olarak yazılan mesaj.
 * Tüketici veritabanına dönmeden e-postayı oluşturabilsin diye gerekli tüm alanları taşır.
 */
public class NotificationMessage {

    public enum Type { OTP, TRANSFER_RECEIPT, FRAUD_ALERT }

    private Type type;
    private String to;

    // OTP alanları
    private String otp;
    private String mode;

    // Transfer alanları
    private String referenceId;
    private BigDecimal amount;
    private String currency;
    private String recipient;
    private String createdAt;
    private BigDecimal riskScore;
    private String riskLevel;

    public NotificationMessage() {}

    public static NotificationMessage otp(String to, String otp, String mode) {
        NotificationMessage m = new NotificationMessage();
        m.type = Type.OTP;
        m.to = to;
        m.otp = otp;
        m.mode = mode;
        return m;
    }

    public static NotificationMessage forTransaction(Type type, String to, Transaction txn) {
        NotificationMessage m = new NotificationMessage();
        m.type = type;
        m.to = to;
        m.referenceId = txn.getReferenceId();
        m.amount = txn.getAmount() != null ? txn.getAmount().abs() : null;
        m.currency = txn.getCurrency();
        m.recipient = txn.getRecipientName() != null ? txn.getRecipientName() : txn.getDestIban();
        m.createdAt = txn.getCreatedAt() != null
            ? txn.getCreatedAt().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss"))
            : "Bilinmiyor";
        m.riskScore = txn.getRiskScore();
        m.riskLevel = txn.getRiskLevel();
        return m;
    }

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public BigDecimal getRiskScore() { return riskScore; }
    public void setRiskScore(BigDecimal riskScore) { this.riskScore = riskScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
}
