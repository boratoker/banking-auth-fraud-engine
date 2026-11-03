package com.banking.auth.config;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Bildirim kuyruğu: OTP ve transfer e-postaları REST thread'inden ayrılarak
 * bu AMQP kuyruğu üzerinden asenkron olarak gönderilir.
 */
@Configuration
public class RabbitMQConfig {

    public static final String NOTIFICATION_QUEUE = "notificationQueue";

    @Bean
    public Queue notificationQueue() {
        return new Queue(NOTIFICATION_QUEUE, true);
    }
}
