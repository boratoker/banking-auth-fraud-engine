package com.banking.auth.security;

import com.banking.auth.model.UserSession;
import com.banking.auth.repository.UserSessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Bankacılık uç noktalarını oturum token'ı ile korur.
 * Her istekte token'ın özeti DB'de aranır; oturum uzaktan sonlandırılmışsa (is_active=false)
 * istek anında 401 ile reddedilir. Kimlik, istemcinin gönderdiği e-posta başlığından değil
 * doğrulanmış oturumdan alınır.
 */
@Component
public class SessionAuthInterceptor implements HandlerInterceptor {

    public static final String AUTH_USER_ID = "auth.userId";
    public static final String AUTH_SESSION_ID = "auth.sessionId";

    private final UserSessionRepository sessionRepository;

    public SessionAuthInterceptor(UserSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String token = request.getHeader(SessionTokens.HEADER);
        if (token == null || token.isBlank()) {
            return reject(response, "Oturum bulunamadı. Lütfen giriş yapınız.");
        }

        Optional<UserSession> sessionOpt = sessionRepository.findBySessionTokenHash(SessionTokens.hash(token));
        if (sessionOpt.isEmpty() || !sessionOpt.get().isActive()) {
            return reject(response, "Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapınız.");
        }

        UserSession session = sessionOpt.get();
        UUID userId = session.getUser().getId();
        request.setAttribute(AUTH_USER_ID, userId);
        request.setAttribute(AUTH_SESSION_ID, session.getId());

        session.setLastActiveAt(LocalDateTime.now());
        sessionRepository.save(session);
        return true;
    }

    private boolean reject(HttpServletResponse response, String message) throws Exception {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"error\":\"" + message + "\",\"sessionExpired\":true}");
        return false;
    }
}
