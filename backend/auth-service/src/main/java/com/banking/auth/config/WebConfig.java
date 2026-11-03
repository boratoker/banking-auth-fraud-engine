package com.banking.auth.config;

import com.banking.auth.security.SessionAuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final SessionAuthInterceptor sessionAuthInterceptor;

    public WebConfig(SessionAuthInterceptor sessionAuthInterceptor) {
        this.sessionAuthInterceptor = sessionAuthInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(sessionAuthInterceptor)
                .addPathPatterns("/api/v1/banking/**", "/api/v1/auth/logout");
    }
}
