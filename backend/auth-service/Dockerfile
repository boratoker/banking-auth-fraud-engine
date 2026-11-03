# ============================================
# TokerBank - auth-service
# ============================================

# --- Build Aşaması (Multi-stage) ---
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Önce bağımlılıkları indir (cache katmanı)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Kaynak kodu kopyala ve derle
COPY src ./src
RUN mvn clean package -DskipTests -B

# --- Runtime Aşaması (Minimal & Güvenli) ---
FROM eclipse-temurin:17-jre

# Güvenlik: Root yetkisi olmayan kullanıcı
RUN groupadd -r tokerbank && useradd -r -g tokerbank tokerbank

WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
RUN chown -R tokerbank:tokerbank /app
USER tokerbank

EXPOSE 8081

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
