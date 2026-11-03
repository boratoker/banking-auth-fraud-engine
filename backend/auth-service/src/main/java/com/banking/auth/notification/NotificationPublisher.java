package com.banking.auth.notification;

import com.banking.auth.config.RabbitMQConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.CompletableFuture;

/**
 * Bildirim üreticisi (producer).
 * E-posta gönderimini REST isteğinden ayırır: mesaj RabbitMQ kuyruğuna bırakılır ve HTTP yanıtı
 * SMTP sunucusunu beklemeden döner. Aktif bir DB transaction'ı varsa mesaj yalnızca commit'ten
 * sonra yayınlanır; böylece geri alınan bir işlem için bildirim gitmez.
 */
@Service
public class NotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationPublisher.class);

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    private final ObjectMapper objectMapper;
    private final NotificationConsumer consumer;

    public NotificationPublisher(ObjectMapper objectMapper, NotificationConsumer consumer) {
        this.objectMapper = objectMapper;
        this.consumer = consumer;
    }

    public void publish(NotificationMessage message) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send(message);
                }
            });
        } else {
            send(message);
        }
    }

    private void send(NotificationMessage message) {
        try {
            if (rabbitTemplate != null) {
                rabbitTemplate.convertAndSend(RabbitMQConfig.NOTIFICATION_QUEUE, objectMapper.writeValueAsString(message));
                log.info("📨 Bildirim kuyruğa alındı [{}] → {}", message.getType(), message.getTo());
                return;
            }
        } catch (Exception e) {
            log.warn("RabbitMQ'ya erişilemedi ({}), bildirim arka plan thread'inde gönderilecek.", e.getMessage());
        }
        // Broker yoksa da REST thread'i bloklanmaz: aynı işleyici arka planda çalıştırılır
        CompletableFuture.runAsync(() -> consumer.handle(message));
    }
}
