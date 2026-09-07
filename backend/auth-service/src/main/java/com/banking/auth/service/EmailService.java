package com.banking.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

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

    public void sendOtpEmail(String toEmail, String otp, String mode) {
        boolean isRegister = "register".equalsIgnoreCase(mode);
        String actionTitle = isRegister ? "TokerBank Yeni Hesap Kaydı" : "TokerBank Dijital Giriş";
        String subject = isRegister 
            ? "TokerBank Kayıt Ol - E-Posta Doğrulama Kodunuz: " + otp 
            : "TokerBank Giriş Yap - Oturum Açma Kodunuz: " + otp;

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

            String bodyText = isRegister 
                ? "TokerBank yeni hesap kaydınızı tamamlamak için tek kullanımlık doğrulama kodunuz (OTP) aşağıdadır:"
                : "TokerBank hesabınıza giriş yapabilmek için tek kullanımlık doğrulama kodunuz (OTP) aşağıdadır:";

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
}
