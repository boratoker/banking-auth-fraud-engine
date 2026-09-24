package com.banking.auth.service;

import com.banking.auth.model.Transaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otp) {
        sendOtpEmail(toEmail, otp, "login");
    }

    @Autowired(required = false)
    private org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;

    public void sendOtpEmail(String toEmail, String otp, String mode) {
        if (rabbitTemplate != null) {
            String payload = toEmail + "|" + otp + "|" + mode;
            rabbitTemplate.convertAndSend("email.otp.queue", payload);
            log.info("📩 [Asenkron] E-posta görevi RabbitMQ kuyruğuna atıldı (email.otp.queue): {}", payload);
        } else {
            log.warn("⚠️ RabbitTemplate bulunamadı! E-posta senkron olarak gönderiliyor.");
            sendOtpEmailInternal(toEmail, otp, mode);
        }
    }

    @org.springframework.amqp.rabbit.annotation.RabbitListener(queuesToDeclare = @org.springframework.amqp.rabbit.annotation.Queue("email.otp.queue"))
    public void consumeOtpEmailTask(String payload) {
        String[] parts = payload.split("\\|");
        if (parts.length >= 3) {
            log.info("🚀 [RabbitMQ Tüketici] Kuyruktan Görev Alındı: E-Posta gönderiliyor...");
            sendOtpEmailInternal(parts[0], parts[1], parts[2]);
        }
    }

    private void sendOtpEmailInternal(String toEmail, String otp, String mode) {
        boolean isRegister = "register".equalsIgnoreCase(mode);
        boolean isResetPassword = "reset-password".equalsIgnoreCase(mode);
        boolean isLimitIncrease = "limit_increase".equalsIgnoreCase(mode);
        boolean isTransfer = "transfer".equalsIgnoreCase(mode);
        
        String actionTitle;
        if (isRegister) {
            actionTitle = "TokerBank Yeni Hesap Kaydı";
        } else if (isResetPassword) {
            actionTitle = "TokerBank Parola Sıfırlama Talebi";
        } else if (isLimitIncrease) {
            actionTitle = "TokerBank Günlük Limit Artırım Talebi";
        } else if (isTransfer) {
            actionTitle = "TokerBank Yüksek Riskli Transfer Doğrulaması";
        } else {
            actionTitle = "TokerBank Dijital Giriş";
        }

        String subject;
        if (isRegister) {
            subject = "TokerBank Kayıt Ol - E-Posta Doğrulama Kodunuz: " + otp;
        } else if (isResetPassword) {
            subject = "TokerBank Parola Sıfırlama - Doğrulama Kodunuz: " + otp;
        } else if (isLimitIncrease) {
            subject = "TokerBank Limit Artırımı - Onay Kodunuz: " + otp;
        } else if (isTransfer) {
            subject = "TokerBank Transfer Onayı - Doğrulama Kodunuz: " + otp;
        } else {
            subject = "TokerBank Giriş Yap - Oturum Açma Kodunuz: " + otp;
        }

        log.info("=================================================================");
        log.info("🔐 [{}] OTP DOĞRULAMA KODU: [{}]", actionTitle.toUpperCase(), otp);
        log.info("📧 ALICI E-POSTA: [{}]", toEmail);
        log.info("=================================================================");

        if (fromEmail == null || fromEmail.isBlank()) {
            log.info("[E-Posta Simülasyonu] SMTP e-posta adresi (MAIL_USERNAME) tanımlı değil. Konsol OTP kodu: {}", otp);
            return;
        }

        if (mailSender == null) {
            log.warn("[E-Posta Simülasyonu] MailSender bean aktif değil. Konsol OTP kodu kullanılıyor: {}", otp);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "TokerBank Digital Security");
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String bodyText;
            if (isRegister) {
                bodyText = "TokerBank yeni hesap kaydınızı tamamlamak için tek kullanımlık doğrulama kodunuz (OTP) aşağıdadır:";
            } else if (isResetPassword) {
                bodyText = "TokerBank hesabınızın parolasını sıfırlamak için tek kullanımlık doğrulama kodunuz (OTP) aşağıdadır:";
            } else if (isLimitIncrease) {
                bodyText = "TokerBank dijital kanallardaki günlük işlem limitinizi artırmak için tek kullanımlık onay kodunuz (OTP) aşağıdadır:";
            } else if (isTransfer) {
                bodyText = "TokerBank üzerinden başlattığınız transfer işlemini onaylamak için tek kullanımlık doğrulama kodunuz (OTP) aşağıdadır:";
            } else {
                bodyText = "TokerBank hesabınıza giriş yapabilmek için tek kullanımlık doğrulama kodunuz (OTP) aşağıdadır:";
            }

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;\">"
                    + "<h2 style=\"color: #003399; margin-top: 0;\">" + actionTitle + "</h2>"
                    + "<p>Sayın Müşterimiz,</p>"
                    + "<p>" + bodyText + "</p>"
                    + "<div style=\"text-align: center; margin: 24px 0;\">"
                    + "  <span style=\"display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; background-color: #f0f4ff; color: #003399; border-radius: 8px; border: 1px dashed #003399;\">"
                    + otp
                    + "  </span>"
                    + "</div>"
                    + "<p style=\"color: #555; font-size: 14px;\">Bu kod <strong>2 dakika</strong> boyunca geçerlidir. Güvenliğiniz için bu kodu kimseyle paylaşmayınız.</p>"
                    + "<hr style=\"border: none; border-top: 1px solid #eee; margin: 20px 0;\" />"
                    + "<p style=\"font-size: 12px; color: #888;\">Bu işlemi siz yapmadıysanız lütfen derhal Müşteri Hizmetleri ile iletişime geçiniz.</p>"
                    + "</div>";

            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("{} E-postası başarıyla gönderildi: {}", actionTitle, toEmail);
        } catch (Exception e) {
            log.warn("E-posta gönderilirken hata oluştu ({}), konsoldaki [{}] kodunu kullanabilirsiniz.", e.getMessage(), otp);
        }
    }

    public void sendFraudAlertEmail(String toEmail, Transaction txn) {
        log.info("=================================================================");
        log.info("🚨 YÜKSEK RİSKLİ İŞLEM BİLDİRİMİ: [{}]", txn.getReferenceId());
        log.info("📧 ALICI E-POSTA: [{}]", toEmail);
        log.info("=================================================================");

        if (fromEmail == null || fromEmail.isBlank() || mailSender == null) {
            log.warn("[E-Posta Simülasyonu] MailSender bean aktif değil. Riskli İşlem Bildirimi konsola yazıldı.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "TokerBank Fraud Shield");
            helper.setTo(toEmail);
            helper.setSubject("DİKKAT: Yüksek Tutarlı/Riskli İşlem Gerçekleşti - " + txn.getAmount() + " " + txn.getCurrency());

            String dateStr = txn.getCreatedAt() != null ? txn.getCreatedAt().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")) : "Bilinmiyor";
            String recipient = txn.getRecipientName() != null ? txn.getRecipientName() : txn.getDestIban();

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;\">"
                    + "<div style=\"background-color: #ffeaea; padding: 16px; border-left: 4px solid #cc0000; margin-bottom: 24px;\">"
                    + "<h2 style=\"color: #cc0000; margin-top: 0; margin-bottom: 8px;\">Riskli İşlem Bildirimi</h2>"
                    + "<p style=\"color: #333; margin: 0;\">Hesabınızdan yüksek tutarlı veya olağandışı lokasyondan bir işlem gerçekleşmiştir. İşlem detayları aşağıdadır.</p>"
                    + "</div>"
                    + "<table style=\"width: 100%; border-collapse: collapse; margin-bottom: 24px;\">"
                    + "<tr><td style=\"padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 35%;\">İşlem Tutarı:</td><td style=\"padding: 10px; border-bottom: 1px solid #eee; font-size: 18px; color: #cc0000; font-weight: bold;\">" + txn.getAmount() + " " + txn.getCurrency() + "</td></tr>"
                    + "<tr><td style=\"padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;\">Alıcı:</td><td style=\"padding: 10px; border-bottom: 1px solid #eee;\">" + recipient + "</td></tr>"
                    + "<tr><td style=\"padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;\">İşlem Tarihi:</td><td style=\"padding: 10px; border-bottom: 1px solid #eee;\">" + dateStr + "</td></tr>"
                    + "<tr><td style=\"padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;\">Risk Skoru:</td><td style=\"padding: 10px; border-bottom: 1px solid #eee;\">" + txn.getRiskScore() + " (" + txn.getRiskLevel() + ")</td></tr>"
                    + "<tr><td style=\"padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;\">Referans No:</td><td style=\"padding: 10px; border-bottom: 1px solid #eee;\">" + txn.getReferenceId() + "</td></tr>"
                    + "</table>"
                    + "<p style=\"color: #555; font-size: 14px;\">İşlemin sizin tarafınızdan <strong>yapılmadığını</strong> düşünüyorsanız, hemen 0850 XXX XX XX numaralı müşteri hizmetlerini arayarak veya mobil uygulamadan hesabınızı bloke ediniz.</p>"
                    + "<div style=\"margin-top: 30px; text-align: center;\">"
                    + "<a href=\"#\" style=\"display: inline-block; background-color: #cc0000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;\">Şüpheli İşlem Bildir / Hesabı Dondur</a>"
                    + "</div>"
                    + "</div>";

            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Riskli İşlem Bildirim E-postası başarıyla gönderildi: {}", toEmail);
        } catch (Exception e) {
            log.warn("Riskli İşlem E-postası gönderilirken hata oluştu: {}", e.getMessage());
        }
    }
}
