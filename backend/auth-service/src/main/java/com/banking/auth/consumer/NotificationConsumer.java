package com.banking.auth.consumer;

import com.banking.auth.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

@Component
public class NotificationConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    private final EmailService emailService;

    public NotificationConsumer(EmailService emailService) {
        this.emailService = emailService;
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue("notificationQueue", true);
    }

    @RabbitListener(queues = "notificationQueue")
    public void consumeNotification(String message) {
        log.info("RabbitMQ Bildirim Kuyruğundan mesaj alındı: {}", message);
        try {
            if (message != null && message.contains(":")) {
                String[] parts = message.split(":", 2);
                String email = parts[0].trim();
                String otp = parts[1].trim();

                if (email.startsWith("OTP Code for ")) {
                    email = email.replace("OTP Code for ", "").trim();
                }

                emailService.sendOtpEmail(email, otp);
            }
        } catch (Exception e) {
            log.error("Bildirim işlenirken hata oluştu: {}", e.getMessage(), e);
        }
    }
}
