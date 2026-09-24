package com.banking.signing.config;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    @Bean
    public Queue cryptoAuditQueue() {
        return new Queue("crypto.audit.logs", true);
    }
}
