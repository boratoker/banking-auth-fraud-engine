package com.banking.auth.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Oturum token'ı üretimi ve özetleme.
 * İstemciye rastgele 256-bit token verilir; veritabanında yalnızca SHA-256 özeti saklanır,
 * böylece DB sızıntısında token'lar doğrudan kullanılamaz.
 */
public final class SessionTokens {

    public static final String HEADER = "X-Session-Token";

    private static final SecureRandom RANDOM = new SecureRandom();

    private SessionTokens() {}

    public static String generate() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 desteklenmiyor", e);
        }
    }
}
