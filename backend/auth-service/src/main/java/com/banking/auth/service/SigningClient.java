package com.banking.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * signing-service (ECDSA P-256) istemcisi.
 * Cihaz açık anahtarı kaydı ve transfer imzası doğrulaması bu servis üzerinden yapılır.
 */
@Service
public class SigningClient {

    public enum Result { VALID, INVALID, UNAVAILABLE }

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public SigningClient(RestTemplateBuilder builder, @Value("${signing.service.url}") String baseUrl) {
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(2))
                .setReadTimeout(Duration.ofSeconds(3))
                .build();
        this.baseUrl = baseUrl;
    }

    /**
     * İmzalanan kanonik transfer verisi. İstemci (WebCrypto / mobil) aynı formatı imzalar;
     * sunucu bu metni istek alanlarından kendisi yeniden üretir. Böylece IBAN, tutar veya açıklama
     * imzadan sonra 1 kuruş bile değiştirilirse imza tutmaz.
     */
    public static String canonicalTransferPayload(String recipientIban, Object amount, Object description) {
        String amountStr = new BigDecimal(String.valueOf(amount)).stripTrailingZeros().toPlainString();
        String desc = description == null ? "" : description.toString();
        return "IBAN:" + recipientIban + ",AMOUNT:" + amountStr + ",DESC:" + desc;
    }

    public Result verify(UUID userId, String payload, String signature) {
        try {
            restTemplate.postForEntity(baseUrl + "/api/v1/signing/verify",
                    Map.of("userId", userId.toString(), "payload", payload, "signature", signature), Map.class);
            return Result.VALID;
        } catch (HttpClientErrorException e) {
            // signing-service geçersiz imza için 4xx döner
            return Result.INVALID;
        } catch (Exception e) {
            return Result.UNAVAILABLE;
        }
    }

    public void enroll(UUID userId, String publicKey, String deviceName) {
        restTemplate.postForEntity(baseUrl + "/api/v1/signing/enroll",
                Map.of("userId", userId.toString(), "publicKey", publicKey,
                        "deviceName", deviceName != null ? deviceName : "Unknown Device"), Map.class);
    }
}
