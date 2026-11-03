// ===== SessionTokens.java =====
public static String generate() {
    byte[] bytes = new byte[32];                       // 256-bit random token
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
}

public static String hash(String token) {              // only the SHA-256 hash is stored in the DB
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
}

// ===== SessionAuthInterceptor.java =====
@Override
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
    String token = request.getHeader(SessionTokens.HEADER);   // "X-Session-Token"
    if (token == null || token.isBlank()) {
        return reject(response, "Oturum bulunamadı. Lütfen giriş yapınız.");
    }

    Optional<UserSession> sessionOpt = sessionRepository.findBySessionTokenHash(SessionTokens.hash(token));
    // A session terminated remotely (is_active = false) is rejected immediately with HTTP 401
    if (sessionOpt.isEmpty() || !sessionOpt.get().isActive()) {
        return reject(response, "Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapınız.");
    }

    UserSession session = sessionOpt.get();
    // The identity comes from the verified session, never from a client-supplied header
    request.setAttribute(AUTH_USER_ID, session.getUser().getId());

    session.setLastActiveAt(LocalDateTime.now());
    sessionRepository.save(session);
    return true;
}
