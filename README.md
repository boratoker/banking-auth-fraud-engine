# 🛡️ TokerBank - Enterprise Banking Auth & Event-Driven AI Fraud Detection Engine

**TokerBank**, mikroservis mimarisi üzerine inşa edilmiş, yüksek güvenlikli kimlik doğrulama (E-Posta & 2-Dakikalık OTP), anlık yapay zeka destekli dolandırıcılık tespiti (AI Fraud Shield) ve dijital bankacılık yönetim paneli sunan kurumsal seviyede bir bankacılık ve güvenlik motorudur.

---

## 📐 Sistem Mimarisi & Servisler

Proje, bağımsız ölçeklenebilir mikroservisler, olay tabanlı (event-driven) mesajlaşma mimarisi ve modern bir React ön yüzünden oluşur:

```
                  ┌───────────────────────────────┐
                  │    React 18 + Vite Frontend   │
                  │     (http://localhost:5173)   │
                  └───────────────┬───────────────┘
                                  │ REST / JSON
                                  ▼
                  ┌───────────────────────────────┐
                  │     Spring Cloud Gateway      │
                  │     (http://localhost:8080)   │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
         ▼                                                 ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│     Auth & Banking Service    │         │         Fraud Service         │
│     (http://localhost:8081)   │         │    (AI Risk Analysis Engine)  │
└───────┬───────────────┬───────┘         └───────────────────────────────┘
        │               │
        ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  PostgreSQL   │ │     Redis     │ │ Apache Kafka  │ │   RabbitMQ    │
│  (Port 5432)  │ │  (Port 6379)  │ │  (Port 9092)  │ │  (Port 5672)  │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

---

## 🚀 Kullanılan Diller ve Teknolojiler

### 🖥️ Backend (Mikroservisler)
* **Programlama Dili**: Java 17+
* **Framework**: Spring Boot 3.2.3
* **API Gateway**: Spring Cloud Gateway
* **Veritabanı & ORM**: PostgreSQL 15, Spring Data JPA, Hibernate, H2 Database (Geliştirme fallback)
* **Önbellek & Oturum**: Redis 7 (OTP depolama, TTL yönetimi, Rate Limiting)
* **Olay Akışı (Event Streaming)**: Apache Kafka, Zookeeper (Audit logları ve dolandırıcılık olay analizi)
* **Asenkron Mesajlaşma**: RabbitMQ 3 (Bildirim ve e-posta kuyrukları)
* **E-Posta Servisi**: JavaMailSender & Gmail SMTP (TLS 587)
* **İzleme & Metrikler**: Spring Boot Actuator, Prometheus, Grafana

### 🎨 Frontend (Kullanıcı Arayüzü)
* **Programlama Dili**: JavaScript (ES6+)
* **Framework / Kütüphane**: React 18, Vite 8
* **Stil & Tasarım**: Vanilla CSS3 (Custom Glassmorphism, Dark/Light temalar, Esnek Kart Tasarımları)
* **HTTP İstemcisi**: Axios

### 🐳 DevOps & Altyapı
* **Containerization**: Docker & Docker Compose

---

## 📦 Proje Bağımlılık Tablolari

---

### 🔹 Backend Bağımlılıkları

| Bağımlılık | Kategori | Açıklama |
| :--- | :--- | :--- |
| **Spring Boot Web** | Web / REST | RESTful API uç noktaları ve HTTP isteği yönetimi |
| **Spring Data JPA** | ORM / DB | Veritabanı varlık yönetimi ve Hibernate ORM |
| **PostgreSQL Driver** | Database | PostgreSQL 15 veritabanı bağlantı sürücüsü |
| **Spring Data Redis** | Cache / Session | 2 dakikalık OTP TTL yönetimi ve önbellekleme |
| **Spring AMQP (RabbitMQ)** | Messaging | Asenkron bildirim ve kuyruk mesajlaşması |
| **Spring Kafka** | Event Streaming | Dolandırıcılık tespiti ve audit log olay akışı |
| **Spring Mail** | E-Posta / SMTP | Gmail SMTP üzerinden doğrulama e-postaları |
| **Spring Actuator** | Monitoring | Sistem sağlık durumu (Health check) ve metrikler |
| **Micrometer Prometheus** | Metrics | Prometheus & Grafana metrik aktarımı |
| **H2 Database** | In-Memory DB | Yerel geliştirme yedek veritabanı |

---

### 🔹 Frontend Bağımlılıkları

| Paket Adı | Sürüm | Tipi | Açıklama |
| :--- | :--- | :--- | :--- |
| **`react`** | `^18.3.1` | Core | Kullanıcı arayüzü motoru ve State yönetimi |
| **`react-dom`** | `^18.3.1` | Core | React bileşenlerinin DOM üzerine işlenmesi |
| **`axios`** | `^1.7.9` | HTTP Client | Backend mikroservislerine asenkron HTTP istekleri |
| **`vite`** | `^8.2.2` | Dev | Hızlı geliştirme sunucusu ve modül paketleyici |
| **`@vitejs/plugin-react`** | `^4.3.4` | Dev | Vite ve React JSX dönüştürme entegrasyonu |

---

## ✨ Öne Çıkan Özellikler

### 🔐 1. E-Posta & 2-Dakikalık OTP Doğrulama
- **Şifresiz Giriş (Passwordless Auth)**: E-posta adresiyle hızlı giriş veya yeni hesap oluşturma.
- **Canlı E-Posta Gönderimi**: Gmail SMTP üzerinden doğrudan kullanıcının e-posta adresine 6 haneli OTP kodu ulaştırılır.
- **2 Dakikalık Geçerlilik (TTL)**: Hem backend hem de frontend ekranında **2 dakikalık (`02:00` -> `00:00`) canlı geri sayım sayacı** çalışır.
- **Tekrar Gönder Butonu**: Süre dolduğunda doğrulama pasife geçer ve *"Kodu Tekrar Gönder"* butonu ile yeni kod talep edilebilir.

### 🛡️ 2. Yapay Zeka Destekli AI Fraud Engine (Şüpheli İşlem Engelleme)
- **Anlık Risk Analizi**: ₺10.000 ve üzerindeki FAST transferlerinde yapay zeka risk algoritmaları devreye girer.
- **Dinamik 2FA Kilit Mekanizması**: Yüksek risk tespit edilen işlemlerde kullanıcıya şüpheli işlem uyarısı (`%68 Risk`) verilerek ek SMS/OTP doğrulama şartı koşulur.

### 💳 3. Sanal Kart & Hesap Yönetimi
- **Anlık Kart Dondurma**: Tek tıkla sanal kart dondurulabilir veya açılabilir.
- **Güvenlik İzinleri**: İnternet harcamaları ve yurt dışı kullanımı bağımsız olarak yönetilebilir.
- **Çoklu Hesap Desteği**: Vadesiz TL, Vadeli Birikim (%48.5 Faiz), USD ve EUR hesap hareketleri takip edilebilir.

### 💻 4. Aktif Oturum & Cihaz Takibi
- Hesaba bağlı aktif cihazlar (macOS, iPhone, Windows vb.), IP adresleri ve lokasyon bilgileri görüntülenebilir ve şüpheli oturumlar sonlandırılabilir.

---

## 🛠️ Kurulum ve Çalıştırma

### 1. Altyapı Servislerini Başlatın (Docker)
PostgreSQL, Redis, RabbitMQ, Kafka ve Grafana servislerini Docker Compose ile kaldırın:
```bash
docker compose up -d
```

### 2. Backend Servislerini Çalıştırın

**API Gateway**:
```bash
cd backend/api-gateway
mvn spring-boot:run
```

**Auth & Banking Service**:
```bash
cd backend/auth-service
mvn spring-boot:run
```

### 3. Web Frontend Dev Sunucusunu Çalıştırın
```bash
cd frontend
npm install
npm run dev
```
Tarayıcınızdan **`http://localhost:5173`** adresine giderek uygulamayı kullanmaya başlayabilirsiniz!

### 4. Mobil Ön Yüz (React Native / Expo) Sunucusunu Çalıştırın
```bash
cd mobile
npm install
npm run web   # Mobil simülatörü tarayıcıda çalıştırmak için (http://localhost:5174)
# veya
npm start     # Expo CLI ile mobil cihaz / iOS & Android simülatöründe çalıştırmak için
```

