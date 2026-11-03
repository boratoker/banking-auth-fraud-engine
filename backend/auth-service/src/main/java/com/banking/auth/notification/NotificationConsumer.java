package com.banking.auth.notification;

import com.banking.auth.config.RabbitMQConfig;
import com.banking.auth.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Bildirim tüketicisi (consumer).
 * RabbitMQ kuyruğundaki mesajları alır ve harici SMTP sunucusuna e-posta olarak iletir.
 * SMTP gecikmesi veya kesintisi yalnızca bu tüketiciyi etkiler, bankacılık REST uç noktalarını değil.
 */
@Component
public class NotificationConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    public NotificationConsumer(EmailService emailService, ObjectMapper objectMapper) {
        this.emailService = emailService;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
    public void consumeNotification(String payload) {
        log.info("RabbitMQ bildirim kuyruğundan mesaj alındı.");
        try {
            handle(objectMapper.readValue(payload, NotificationMessage.class));
        } catch (Exception e) {
            log.error("Bildirim mesajı çözümlenemedi: {}", e.getMessage(), e);
        }
    }

    void handle(NotificationMessage message) {
        try {
            switch (message.getType()) {
                case OTP -> emailService.sendOtpEmail(message.getTo(), message.getOtp(), message.getMode());
                case TRANSFER_RECEIPT -> emailService.sendTransferReceiptEmail(message);
                case FRAUD_ALERT -> emailService.sendFraudAlertEmail(message);
            }
        } catch (Exception e) {
            log.error("Bildirim işlenirken hata oluştu: {}", e.getMessage(), e);
        }
    }
}
