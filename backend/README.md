# ⚙️ TokerBank Backend - Microservices Architecture & API Documentation

Bu dizin, **TokerBank Enterprise Banking & AI Fraud Engine** sisteminin mikroservis mimarisini, REST API uç noktalarını ve arka plan servis entegrasyonlarını içerir.

---

## 📐 Mikroservisler ve Port Yapısı

```
                           ┌───────────────────────────────┐
                           │    Spring Cloud API Gateway   │
                           │      (Port: 8080)             │
                           └───────────────┬───────────────┘
                                           │ Route Yönlendirmeleri
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                        ▼                                     ▼
        ┌───────────────────────────────┐     ┌───────────────────────────────┐
        │     Auth & Banking Service    │     │         Fraud Service         │
        │      (Port: 8081)             │     │    (AI Risk Analysis Engine)  │
        └───────────────┬───────────────┘     └───────────────────────────────┘
                        │
       ┌────────────────┼────────────────┬────────────────┐
       ▼                ▼                ▼                ▼
┌───────────────┐┌───────────────┐┌───────────────┐┌───────────────┐
│  PostgreSQL   ││     Redis     ││ Apache Kafka  ││   RabbitMQ    │
│  (Port 5432)  ││  (Port 6379)  ││  (Port 9092)  ││  (Port 5672)  │
└───────────────┘└───────────────┘└───────────────┘└───────────────┘
```

| Servis Adı | Dizin / Modül | Port | Kullanılan Teknolojiler | Sorumluluk & Görev |
| :--- | :--- | :--- | :--- | :--- |
| **`api-gateway`** | `backend/api-gateway` | `8080` | Spring Cloud Gateway | Merkezi istek yönlendirmesi, CORS yönetimi ve API güvenliği |
| **`auth-service`** | `backend/auth-service` | `8081` | Spring Boot 3.2, JPA, PostgreSQL, Redis, Kafka, RabbitMQ | Kimlik doğrulama, OTP gönderimi, bankacılık işlemleri ve AI Fraud Engine |
| **`fraud-service`**| `backend/fraud-service`| - | Spring Boot, ML/AI Libraries | Bağımsız yapay zeka ve risk analizi mikroservis alanı |

---

## 📡 REST API Uç Noktaları (Endpoints Reference)

Tüm istemci (Frontend) istekleri **API Gateway (Port 8080)** üzerinden ilgili mikroservise yönlendirilir:

### 🔐 1. Kimlik Doğrulama & OTP Servisi (`/api/v1/auth`)

| Method | Endpoint | Açıklama | İstek Gövdesi (Request Body) |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/check-email` | E-posta adresinin DB varlığını kontrol eder | `{"email": "user@gmail.com"}` |
| `POST` | `/api/v1/auth/login` | Giriş OTP kodu üretir ve e-posta gönderir | `{"email": "user@gmail.com"}` |
| `POST` | `/api/v1/auth/register` | Yeni kullanıcı kaydeder ve doğrulama OTP'si atar | `{"email": "...", "firstName": "...", "lastName": "..."}` |
| `POST` | `/api/v1/auth/verify-otp` | 2 dakikalık OTP kodunu doğrular (Mode: login / register) | `{"email": "...", "otp": "123456", "mode": "login"}` |

### 💳 2. Bankacılık & Kart Yönetimi Servisi (`/api/v1/banking`)

| Method | Endpoint | Açıklama | Dönen Veri / Yanıt |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/banking/overview` | Toplam varlık, vadeli birikim, kart harcaması ve risk özeti | Bakiye JSON & Son 4 Hareket |
| `GET` | `/api/v1/banking/accounts` | Vadesiz TL, Vadeli Birikim, USD ve EUR hesap listesi | Hesaplar Listesi JSON |
| `GET` | `/api/v1/banking/cards` | Sanal kart detayları, dondurma ve limit durumu | Kart Bilgisi JSON |
| `POST` | `/api/v1/banking/cards/toggle-freeze` | Sanal kartı anında dondurur veya açar | `{"isFrozen": true}` |
| `POST` | `/api/v1/banking/cards/toggle-setting` | E-ticaret / Yurt dışı harcama izinlerini günceller | `{"key": "internetAllowed", "value": true}` |

### 🛡️ 3. FAST Transfer & AI Fraud Engine (`/api/v1/banking/transfers`)

| Method | Endpoint | Açıklama | Davranış & Kural |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/banking/transfers` | FAST transfer işlemi başlatır | ₺10.000 altı anında onaylanır. ₺10.000+ için AI Fraud Engine devreye girerek `%68 Risk` üretir ve 2FA OTP ister. |
| `POST` | `/api/v1/banking/transfers/verify-otp` | Şüpheli transfer için 2FA SMS/OTP onaylar | Doğrulama başarılı ise transfer tamamlanır ve hareket kaydolur. |

### 💻 4. Oturum & Cihaz Güvenliği (`/api/v1/banking/security`)

| Method | Endpoint | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/v1/banking/security/sessions` | Aktif bağlı cihazları (macOS, iPhone vb.), IP ve konum bilgilerini listeler |
| `POST` | `/api/v1/banking/security/terminate-session` | Şüpheli oturumu sonlandırır |

---

## 🗄️ Veritabanı ve Altyapı Yapılandırması

### 1. PostgreSQL Veritabanı
- **Host / Port**: `localhost:5432`
- **Veritabanı Adı**: `banking_auth`
- **Kullanıcı / Şifre**: `banking` / `Balkancan19*`
- **Ana Tablolar**: `users` (id, email, first_name, last_name, email_verified, created_at, updated_at)

### 2. Redis Önbellek (OTP & Session)
- **Host / Port**: `localhost:6379`
- **OTP TTL**: 120 saniye (2 dakika). Süresi dolan OTP anahtarları otomatik silinir.

### 3. Gmail SMTP Servisi
- **Host / Port**: `smtp.gmail.com:587` (TLS)
- **Ayrıştırılmış Mail Şablonları**: Giriş için ayrı, Yeni Kayıt için ayrı konu ve HTML e-posta içeriği iletilir.

---

## 🛠️ Derleme ve Çalıştırma

### Bağımlılıkları Derleme:
```bash
cd backend/auth-service
mvn clean compile
```

### Sunucuyu Başlatma:
```bash
mvn spring-boot:run
```
