package com.banking.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            if (fromEmail == null || fromEmail.isBlank()) {
                log.warn("[EMAIL SIMULATION] spring.mail.username henüz yapılandırılmadı. Kime: {}, OTP Kodu: {}", toEmail, otp);
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "Banking Digital Security");
            helper.setTo(toEmail);
            helper.setSubject("Bankacılık Dijital Giriş - Doğrulama Kodunuz: " + otp);

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;\">"
                    + "<h2 style=\"color: #003399; margin-top: 0;\">Banking Digital Security</h2>"
                    + "<p>Sayın Müşterimiz,</p>"
                    + "<p>Bankacılık hesabınıza giriş yapabilmek için tek kullanımlık doğrulama kodunuz (OTP) aşağıdadır:</p>"
                    + "<div style=\"text-align: center; margin: 24px 0;\">"
                    + "  <span style=\"display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; background-color: #f0f4ff; color: #003399; border-radius: 8px; border: 1px dashed #003399;\">"
                    + otp
                    + "  </span>"
                    + "</div>"
                    + "<p style=\"color: #555; font-size: 14px;\">Bu kod <strong>3 dakika</strong> boyunca geçerlidir. Güvenliğiniz için bu kodu kimseyle paylaşmayınız.</p>"
                    + "<hr style=\"border: none; border-top: 1px solid #eee; margin: 20px 0;\" />"
                    + "<p style=\"font-size: 12px; color: #888;\">Bu işlemi siz yapmadıysanız lütfen derhal Müşteri Hizmetleri ile iletişime geçiniz.</p>"
                    + "</div>";

            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("OTP e-postası başarıyla gönderildi: {}", toEmail);
        } catch (Exception e) {
            log.error("OTP e-postası gönderilirken hata oluştu: {}", e.getMessage(), e);
        }
    }
}
