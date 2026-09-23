# ============================================
# TokerBank Mini Sealconf - Signing Service
# Codevo Sealconf Mimarisi (Izole Konteyner)
# ============================================

# --- Build Aşaması (Multi-stage) ---
FROM eclipse-temurin:17-jdk AS builder

WORKDIR /app

# Maven kurulumu
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Önce bağımlılıkları indir (cache katmanı)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Kaynak kodu kopyala ve derle
COPY src ./src
COPY .env .
COPY data ./data
RUN mvn clean package -DskipTests -B

# --- Runtime Aşaması (Minimal & Güvenli) ---
FROM eclipse-temurin:17-jre

LABEL maintainer="TokerBank DevSecOps"
LABEL description="Mini Sealconf - Kriptografik Islem Imzalama Servisi (ECDSA P-256)"

# Güvenlik: Root yetkisi olmayan kullanıcı oluştur
RUN groupadd -r sealconf && useradd -r -g sealconf sealconf

WORKDIR /app

# Builder aşamasından sadece JAR dosyasını al
COPY --from=builder /app/target/*.jar app.jar
COPY --from=builder /app/.env .env
COPY --from=builder /app/data ./data

# Sahipliği kısıtlı kullanıcıya ver
RUN chown -R sealconf:sealconf /app

# Non-root kullanıcıya geç
USER sealconf

# Signing Service portu
EXPOSE 8083

# Sağlık kontrolü (Health Check)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8083/actuator/health || exit 1

# JVM optimizasyonları (Konteyner ortamı için)
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
