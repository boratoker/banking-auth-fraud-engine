# ⚙️ TokerBank Backend - Microservices, AI Fraud Shield & Event-Driven Engine

Bu dizin, **TokerBank Enterprise Banking & AI Fraud Engine** sisteminin çekirdek mikroservis mimarisini, JPA veritabanı varlıklarını, gerçek zamanlı makine öğrenmesi çıkarım motorunu ve REST API uç noktalarını barındırır.

---

## 📐 Mikroservisler ve Mimari Katmanlar

```
                           ┌────────────────────────────────────────┐
                           │        Spring Cloud API Gateway        │
                           │              (Port: 8080)              │
                           └───────────────────┬────────────────────┘
                                               │ Route & Security
                                               ▼
                           ┌────────────────────────────────────────┐
                           │      Auth & Core Banking Service       │
                           │              (Port: 8081)              │
                           │                                        │
                           │  ┌──────────────────────────────────┐  │
                           │  │  Feature Engineering Service     │  │
                           │  │  (18 Real-Time Statistical Feats)│  │
                           │  └──────────────────┬───────────────┘  │
                           │                     │                  │
                           │  ┌──────────────────▼───────────────┐  │
                           │  │  ML Fraud Inference Engine       │  │
                           │  │  (IsoForest + XGBoost Hybrid)    │  │
                           │  └──────────────────┬───────────────┘  │
                           │                     │                  │
                           │  ┌──────────────────▼───────────────┐  │
                           │  │  Banking Service                 │  │
                           │  │  (Pessimistic Locking & Tx)      │  │
                           │  └──────────────────┬───────────────┘  │
                           └─────────────────────┼──────────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  ▼                              ▼                              ▼
       ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
       │     PostgreSQL     │         │    Apache Kafka    │         │      RabbitMQ      │
       │    (Port: 5432)    │         │    (Port: 9092)    │         │    (Port: 5672)    │
       │ - users            │         │ - auth-events      │         │ - Email Queues     │
       │ - accounts         │         │ - banking-events   │         │ - SMS OTP Queues   │
       │ - cards            │         │ - fraud-alerts     │         └────────────────────┘
       │ - transactions     │         └──────────┬─────────┘                    │
       │ - user_sessions    │                    │                              ▼
       │ - fraud_models     │                    ▼                     ┌────────────────────┐
       │ - fraud_evals      │         ┌────────────────────┐           │       Redis        │
       │ - audit_logs       │         │  AuditLog Consumer │           │    (Port: 6379)    │
       └────────────────────┘         │ (Async DB Audit)   │           │ - OTP (120s TTL)   │
                                      └────────────────────┘           └────────────────────┘
```

---

## 📂 Dizin ve Modül Yapısı

| Modül / Dizin | Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **`api-gateway/`** | Spring Cloud Gateway, Reactive Web | Tek giriş kapısı, rotalama, CORS ve hız sınırlama |
| **`auth-service/`** | Spring Boot 3.2, JPA, Hibernate, Kafka, AMQP | Çekirdek bankacılık, kimlik doğrulama, concurrency yönetimi ve Java ML çıkarım motoru |
| **`fraud-service/`** | Python 3.10+, Scikit-Learn, XGBoost, ONNX | 50.000 sentetik işlemle model eğitimi ve ONNX dışa aktarım aracı |

---

## 🗄️ PostgreSQL Veritabanı Şeması & Varlıklar

### 1. `users` Tablosu
Kullanıcı temel profil ve kimlik verilerini saklar:
- `id` (BIGINT, PK)
- `email` (VARCHAR, UNIQUE)
- `password` (VARCHAR, Hashed)
- `first_name`, `last_name` (VARCHAR)
- `phone_number` (VARCHAR)
- `email_verified` (BOOLEAN)
- `role` (VARCHAR: `ROLE_USER`, `ROLE_ADMIN`)
- `created_at`, `updated_at` (TIMESTAMP)

### 2. `accounts` Tablosu
Müşteri hesap bakiyelerini ve para birimlerini tutar. Para transferlerinde `PESSIMISTIC_WRITE` kilidi uygulanarak aynı anda gelen transferlerde bakiye tutarsızlığı önlenir.
- `id` (BIGINT, PK)
- `user_id` (FK -> users.id)
- `account_number` (VARCHAR, UNIQUE)
- `iban` (VARCHAR, UNIQUE)
- `account_type` (`CHECKING`, `SAVINGS`, `INVESTMENT`, `GOLD`)
- `currency` (`TRY`, `USD`, `EUR`, `GOLD`)
- `balance` (NUMERIC(18,2))
- `interest_rate` (NUMERIC(5,2))
- `is_active` (BOOLEAN)

### 3. `cards` Tablosu
Fiziksel ve sanal kartların limit ve güvenlik kilitlerini yönetir:
- `id` (BIGINT, PK)
- `user_id` (FK -> users.id)
- `card_number`, `card_holder_name`, `expiry_date`, `cvv` (VARCHAR)
- `card_type` (`VIRTUAL`, `DEBIT`, `CREDIT`)
- `card_network` (`VISA`, `MASTERCARD`, `TROY`)
- `is_frozen` (BOOLEAN - Anlık kart dondurma)
- `internet_allowed` (BOOLEAN - E-Ticaret yetkisi)
- `overseas_allowed` (BOOLEAN - Yurt dışı işlem yetkisi)
- `contactless_allowed` (BOOLEAN - Temassız işlem yetkisi)
- `daily_limit`, `current_spent` (NUMERIC(18,2))

### 4. `transactions` Tablosu
Tüm para transferlerinin ve ödemelerin durumunu ve risk puanını saklar:
- `id` (BIGINT, PK)
- `source_account_id` (FK -> accounts.id)
- `target_iban`, `target_name` (VARCHAR)
- `transaction_type` (`FAST_TRANSFER`, `EFT`, `CARD_PAYMENT`)
- `channel` (`WEB`, `MOBILE`, `API`)
- `amount`, `fee` (NUMERIC(18,2))
- `currency` (VARCHAR)
- `status` (`PENDING`, `COMPLETED`, `OTP_CHALLENGED`, `REJECTED`)
- `risk_score` (DOUBLE PRECISION - 0.00 ile 1.00 arası)
- `risk_level` (`SAFE`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `failure_reason` (VARCHAR)
- `otp_verified` (BOOLEAN)

### 5. `fraud_evaluations` Tablosu
Her bir transfer için AI motoru tarafından üretilen tüm alt metrikleri saklar:
- `id` (BIGINT, PK)
- `transaction_id` (BIGINT)
- `user_id` (BIGINT)
- `risk_score` (DOUBLE PRECISION)
- `risk_level` (VARCHAR)
- `isolation_forest_score` (DOUBLE PRECISION - Denetimsiz Anomali Skoru)
- `xgboost_risk_prob` (DOUBLE PRECISION - Denetimli Sahtekarlık İhtimali)
- `trigger_flags` (TEXT - Tetiklenen şüpheli göstergeler listesi)
- `action_taken` (`APPROVE`, `FLAG`, `CHALLENGE_OTP`, `BLOCK`)
- `execution_time_ms` (BIGINT - Çıkarım gecikme süresi, örn: 3 ms)

---

## 🧠 AI Fraud Shield - 18 Gerçek Zamanlı Özellik & Skorlama

Para transferi isteği geldiğinde `FeatureEngineeringService` şu 18 özniteliği anlık olarak çıkarır:

```java
double[] features = new double[] {
    amount,                         // 1. İşlem tutarı
    Math.log1p(amount),             // 2. Logaritmik tutar dönüşümü
    amount / currentBalance,        // 3. Tutarin hesap bakiyesine oranı
    hourOfDay,                      // 4. Günün saati (0-23)
    isNightTransaction ? 1.0 : 0.0, // 5. Gece transferi mi (00:00 - 06:00)?
    dayOfWeek,                      // 6. Haftanın günü (1-7)
    isWeekend ? 1.0 : 0.0,          // 7. Hafta sonu mu?
    transfersCount1h,               // 8. Son 1 saatteki transfer adedi (Velocity)
    transfersCount24h,              // 9. Son 24 saatteki transfer adedi
    totalAmountTransferred24h,      // 10. Son 24 saatte transfer edilen toplam tutar
    avgAmountTransferred30d,        // 11. Son 30 günlük ortalama transfer tutarı
    maxAmountTransferred30d,        // 12. Son 30 gündeki en yüksek tekil transfer
    stdDevAmount30d,                // 13. Son 30 günlük transfer standart sapması
    zScoreAmount,                   // 14. Z-Skor sapma derecesi ((tutar - ortalama) / sapma)
    isNewRecipient ? 1.0 : 0.0,     // 15. İlk kez mi bu IBAN'a gönderiliyor?
    channelEncoded,                 // 16. İşlem kanalı kodu (1.0 = Web, 2.0 = Mobil)
    isNewDevice ? 1.0 : 0.0,        // 17. Tanınmayan / yeni cihaz mı?
    locationDistanceKm              // 18. Son olağan konuma göre mesafe (km)
};
```

### Risk Değerlendirme & Dinamik OTP Koruması
- **SAFE (0.00 - 0.29)**: İşlem doğrudan bakiyeden düşer ve tamamlanır.
- **MEDIUM (0.30 - 0.59)**: İşlem tamamlanır, Kafka `banking-transaction-events` konusuna loglanır.
- **HIGH (0.60 - 0.84)**: İşlem askıya alınır (`OTP_CHALLENGED`), 6 haneli OTP kodu üretilerek kullanıcıdan onay istenir.
- **CRITICAL (0.85 - 1.00)**: Yüksek sahtekarlık şüphesiyle işlem OTP korumasına veya otomatik blokeye alınır.

---

## 📡 REST API Uç Noktaları

### 🔐 1. Kimlik Doğrulama (`/api/v1/auth`)

#### E-Posta Kontrolü
- **URL**: `POST /api/v1/auth/check-email`
- **Request**: `{"email": "bora@toker.com"}`
- **Response**: `{"exists": true, "email": "bora@toker.com"}`

#### Şifre Doğrulama
- **URL**: `POST /api/v1/auth/verify-password`
- **Request**: `{"email": "bora@toker.com", "password": "..."}`
- **Response**: `{"verified": true, "user": { ... }}`

#### OTP Başlatma / Giriş
- **URL**: `POST /api/v1/auth/login`
- **Request**: `{"email": "bora@toker.com"}`
- **Response**: `{"message": "Doğrulama kodu e-posta adresinize iletildi", "ttl": 120}`

#### OTP Doğrulama
- **URL**: `POST /api/v1/auth/verify-otp`
- **Request**: `{"email": "bora@toker.com", "otp": "123456", "mode": "login"}`
- **Response**: `{"token": "jwt_token...", "user": { ... }}`

---

### 💳 2. Bankacılık & Kartlar (`/api/v1/banking`)

#### Genel Durum & Varlık Özeti
- **URL**: `GET /api/v1/banking/overview`
- **Response**: Toplam varlık, vadeli getiri, sanal kart özeti, son 5 işlem ve risk istatistiği.

#### Hesap Listesi
- **URL**: `GET /api/v1/banking/accounts`
- **Response**: Kullanıcının tüm vadeli, vadesiz, döviz ve altın hesapları.

#### Kart Detayı & Güvenlik Ayarları
- **URL**: `GET /api/v1/banking/cards`
- **Kart Dondurma**: `POST /api/v1/banking/cards/toggle-freeze` (`{"isFrozen": true}`)
- **Ayar Güncelleme**: `POST /api/v1/banking/cards/toggle-setting` (`{"key": "internetAllowed", "value": false}`)

---

### 🛡️ 3. FAST Transfer & AI Risk Analizi (`/api/v1/banking/transfers`)

#### Transfer Başlatma
- **URL**: `POST /api/v1/banking/transfers`
- **Request**:
```json
{
  "sourceAccountId": 1,
  "targetIban": "TR330006100512345678901234",
  "targetName": "Ahmet Yılmaz",
  "amount": 15000.00,
  "description": "Kira ödemesi",
  "channel": "WEB"
}
```
- **Response (Düşük Risk)**: `{"status": "COMPLETED", "transactionId": 102, "riskScore": 0.12, "riskLevel": "SAFE"}`
- **Response (Yüksek Risk / ₺10.000+)**:
```json
{
  "status": "OTP_CHALLENGED",
  "transactionId": 103,
  "riskScore": 0.72,
  "riskLevel": "HIGH",
  "otpRequired": true,
  "challengeReason": "Yüksek transfer tutarı ve yeni alıcı tespiti sebebiyle ek güvenlik doğrulaması gerekiyor.",
  "warningMessage": "Şüpheli işlem koruması devreye girdi. Telefonunuza iletilen 6 haneli kodu giriniz."
}
```

#### Transfer OTP Doğrulama
- **URL**: `POST /api/v1/banking/transfers/verify-otp`
- **Request**:
```json
{
  "transactionId": 103,
  "otp": "654321"
}
```
- **Response**: `{"status": "COMPLETED", "message": "Transfer başarıyla tamamlandı."}`

---

## 🛠️ Python Model Eğitimi & ONNX Export (`fraud-service`)

`backend/fraud-service/` dizininde yer alan araç seti ile modelleri eğitip dışa aktarabilirsiniz:

```bash
cd backend/fraud-service

# 1. Sanal ortamı oluşturun ve bağımlılıkları yükleyin
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. 50.000 sentetik veri ile XGBoost ve Isolation Forest modellerini eğitin
python train_model.py
```

Bu komut başarıyla tamamlandığında:
- `isolation_forest.onnx`
- `xgboost_fraud.onnx`
- `model_metadata.json`
dosyaları üretilir ve Java motorunun doğrudan yükleyebileceği formata getirilir.
