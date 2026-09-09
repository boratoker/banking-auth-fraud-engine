# 🛡️ TokerBank - Enterprise Banking Auth & Event-Driven AI Fraud Detection Engine

**TokerBank**, kurumsal seviyede mikroservis mimarisi, yüksek güvenlikli kimlik doğrulama (E-Posta & 2-Dakikalık OTP / Şifre), gerçek zamanlı makine öğrenmesi destekli dolandırıcılık koruması (**AI Fraud Shield - XGBoost & Isolation Forest**) ve modern dijital bankacılık yönetim paneli sunan tam teşekküllü bir finansal teknoloji ekosistemidir.

---

## 📐 Sistem Mimarisi & Servisler

Proje; bağımsız ölçeklenebilir Spring Boot mikroservisleri, olay tabanlı (event-driven) Kafka/RabbitMQ mimarisi, PostgreSQL veritabanı, Python ML eğitim boru hattı ve modern React/React Native arayüzlerinden oluşur:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │    İstemciler: React Web (5173) & Expo Mobil (8081)     │
                  └────────────────────────────┬────────────────────────────┘
                                               │ REST / JSON
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │        Spring Cloud Gateway (http://localhost:8080)     │
                  │        (Rate Limiter, CORS, Route Routing & Filter)     │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │              Auth & Banking Microservice                │
                  │               (http://localhost:8081)                   │
                  │                                                         │
                  │  ┌──────────────────────┐    ┌───────────────────────┐  │
                  │  │ Core Banking Service │    │ AI Fraud Shield Engine│  │
                  │  │ - Pessimistic Locks  │    │ - 18-Feature Extract  │  │
                  │  │ - Accounts & Cards   │    │ - XGBoost + IsoForest │  │
                  │  │ - FAST Transfers     │    │ - Sub-5ms Inference   │  │
                  │  └──────────┬───────────┘    └───────────▲───────────┘  │
                  └─────────────┼────────────────────────────┼──────────────┘
                                │                            │
         ┌──────────────────────┴──────────────┬─────────────┴────────┐
         ▼                                     ▼                      ▼
┌──────────────────┐                  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │                  │   Apache Kafka   │  │  Python ML Train │
│   (Port 5432)    │                  │   (Port 9092)    │  │  (fraud-service) │
│ - Users, Accounts│                  │ - auth-events    │  │ - Synthetic Data │
│ - Cards, Trans.  │                  │ - banking-events │  │ - XGBoost / ONNX │
│ - Fraud Audit    │                  │ - fraud-alerts   │  │ - IsoForest ONNX │
└──────────────────┘                  └──────────────────┘  └──────────────────┘
         │                                     │
         ▼                                     ▼
┌──────────────────┐                  ┌──────────────────┐
│      Redis       │                  │     RabbitMQ     │
│   (Port 6379)    │                  │   (Port 5672)    │
│ - OTP (120s TTL) │                  │ - Email & SMS    │
│ - Rate Limiting  │                  │   Notification   │
└──────────────────┘                  └──────────────────┘
```

---

## 🔗 Servis Adresleri ve Bağlantı Linkleri

### 🌐 Kullanıcı Arayüzleri

| Servis | Adres / Link | Port | Açıklama |
| :--- | :--- | :--- | :--- |
| **Web Frontend** (React + Vite) | [http://localhost:5173](http://localhost:5173) | `5173` | Kurumsal dijital bankacılık web arayüzü |
| **Mobile Frontend** (Expo Dev Server) | [http://localhost:8081](http://localhost:8081) | `8081` | Expo Metro Bundler & QR kod ile Expo Go mobil bağlantısı |
| **Mobile Web Simulator** | [http://localhost:5174](http://localhost:5174) | `5174` | Mobil arayüzün tarayıcı simülasyonu (`npm run web`) |

---

### ⚙️ Backend ve API Servisleri

| Servis | Adres / Link | Port | Açıklama |
| :--- | :--- | :--- | :--- |
| **API Gateway** | [http://localhost:8080](http://localhost:8080) | `8080` | Frontend isteklerinin tek giriş kapısı (Reverse Proxy & CORS) |
| **Auth & Banking Service** | [http://localhost:8081](http://localhost:8081) | `8081` | Kimlik doğrulama, hesaplar, kartlar, transferler ve AI Fraud Engine |
| **Python Fraud ML Pipeline** | `backend/fraud-service` | Local CLI | 50.000 sentetik veri ile model eğitimi ve ONNX export betiği |

---

### 📊 İzleme, Yönetim ve Altyapı Panelleri

| Servis | Adres / Link | Giriş Bilgileri | Açıklama |
| :--- | :--- | :--- | :--- |
| **Grafana Dashboard** | [http://localhost:3000](http://localhost:3000) | `admin` / `admin` | Sistem metrikleri ve görselleştirme paneli |
| **Prometheus UI** | [http://localhost:9090](http://localhost:9090) | Giriş gerekmez | Ham metrik toplayıcı |
| **RabbitMQ Management** | [http://localhost:15672](http://localhost:15672) | `guest` / `guest` | Mesaj kuyrukları ve bildirim yönetimi paneli |
| **Gateway Health Check** | [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) | - | Gateway anlık sağlık durumu |
| **Auth & Banking Health** | [http://localhost:8081/actuator/health](http://localhost:8081/actuator/health) | - | Bankacılık mikroservisi sağlık durumu |

---

## 👤 Hazır Demo Kullanıcı Bilgileri (Data Pool / data.sql)

**ÖNEMLİ BİLGİ:** Projemizde daha önceden kodların içerisinde (Örn: `BankingController`) bulunan "hardcoded" sahte test verilerinin tamamı silinmiş ve kurumsal standartlara geçilmiştir. Sistem artık tamamen gerçek veritabanı (PostgreSQL) üzerinden çalışmaktadır.

Spring Boot (Backend) ilk defa başlatıldığında arka planda `data.sql` betiği devreye girerek veritabanını aşağıdaki demo verilerle doldurur:

- **E-Posta**: `bora@toker.com`
- **Şifre**: `12345678`
- **Hesaplar**:
  - ₺ Vadesiz TL Hesabı (`TR33 0006 1005 1234 5678 9012 34`) — Bakiye: `₺128,450.00`
  - 🟡 Altın Yatırım Hesabı (`TR33 0006 1005 9876 5432 1098 76`) — Bakiye: `₺45,200.00`
  - 💵 USD Döviz Hesabı (`TR33 0006 1005 5544 3322 1100 99`) — Bakiye: `$3,420.00`
  - 📈 Vadeli Birikim Hesabı (`TR33 0006 1005 7788 9900 1122 33`) — Bakiye: `₺250,000.00` (%48.5 Faiz)
- **Kartlar**:
  - Toker Platinum Sanal Kart (`**** **** **** 8842`) — Limit: `₺50,000.00`

---

## 📡 Temel API Endpoint Özeti (Gateway: `http://localhost:8080`)

### 1. Kimlik Doğrulama (`/api/v1/auth`)
- `POST /api/v1/auth/check-email` — E-postanın kayıtlı olup olmadığını kontrol eder.
- `POST /api/v1/auth/verify-password` — Şifreli kimlik doğrulama sağlar.
- `POST /api/v1/auth/login` — 2FA OTP kodu üretir ve e-posta ile iletir.
- `POST /api/v1/auth/register` — Yeni kullanıcı kaydı oluşturur ve doğrulama kodu yollar.
- `POST /api/v1/auth/verify-otp` — 2 dakikalık OTP kodunu doğrular (JWT oturumu başlatır).

### 2. Çekirdek Bankacılık (`/api/v1/banking`)
- `GET /api/v1/banking/overview` — Kullanıcının hesap bakiyeleri, kartları, son hareketleri ve risk skorunu döner.
- `GET /api/v1/banking/accounts` — Kullanıcının tüm vadeli, vadesiz, döviz ve altın hesaplarını listeler.
- `GET /api/v1/banking/cards` — Kullanıcının kartlarını, kalan limitlerini ve güvenlik durumlarını getirir.
- `POST /api/v1/banking/cards/toggle-freeze` — Sanal kartı anında dondurur veya aktif eder.
- `POST /api/v1/banking/cards/toggle-setting` — E-ticaret, yurt dışı harcama ve temassız işlem izinlerini günceller.

### 3. FAST Para Transferi & AI Fraud Shield (`/api/v1/banking/transfers`)
- `POST /api/v1/banking/transfers` — FAST transferi başlatır:
  - 18 boyutlu gerçek zamanlı öznitelik çıkarımı (Feature Engineering) yapılır.
  - XGBoost + Isolation Forest hibrit modeli ile risk değerlendirmesi yapılır.
  - Risk skoru düşükse işlem **Pessimistic Lock** güvencesiyle anında tamamlanır.
  - Risk skoru yüksekse veya tutar `>= ₺10.000` ise işlem `OTP_CHALLENGED` durumuna alınır.
- `POST /api/v1/banking/transfers/verify-otp` — Şüpheli transfer için iletilen dinamik 2FA OTP onaylanır ve transfer tamamlanır.

### 4. Güvenlik, Oturumlar & Fraud İstatistiği
- `GET /api/v1/banking/security/sessions` — Aktif bağlı cihazlar (macOS, iPhone vb.), IP ve lokasyon bilgilerini listeler.
- `POST /api/v1/banking/security/terminate-session` — Şüpheli cihaz oturumunu sonlandırır.
- `GET /api/v1/banking/fraud/model-status` — Devredeki yapay zeka modelinin aktif versiyonunu, algoritmasını ve metriklerini döner.

---

## 🧠 AI Fraud Shield - Makine Öğrenmesi Mimarisi

TokerBank, finansal dolandırıcılıkları ve hesap ele geçirme (Account Takeover - ATO) girişimlerini milisaniyeler içerisinde tespit etmek için hibrit bir yapay zeka koruma kalkanı kullanır:

### 1. 18-Boyutlu Gerçek Zamanlı Özellik Çıkarımı (Feature Engineering)
Her para transferinde kullanıcının geçmiş 30 günlük veritabanı hareketlerinden 18 özellik anlık olarak hesaplanır:
1. **İşlem Boyutu**: `amount`, `log_amount`, `amount_to_balance_ratio`
2. **Zaman Analizi**: `hour_of_day`, `is_night_transaction` (00:00 - 06:00), `day_of_week`, `is_weekend`
3. **İşlem Hızı & Hacim (Velocity)**: `transfers_count_1h`, `transfers_count_24h`, `total_amount_transferred_24h`
4. **İstatistiksel Sapma**: `avg_amount_transferred_30d`, `max_amount_transferred_30d`, `std_dev_amount_30d`, `z_score_amount`
5. **Davranışsal Güvenlik**: `is_new_recipient` (daha önce transfer yapılmamış IBAN), `channel_encoded`, `is_new_device`, `location_distance_km`

### 2. Hibrit Karar Motoru (Isolation Forest + XGBoost)
- **Isolation Forest (Denetimsiz Anomali Tespiti)**: Kullanıcının olağan transfer alışkanlıklarının dışına çıkan ani sapmaları tespit eder.
- **XGBoost (Denetimli Sınıflandırma)**: Bilinen dolandırıcılık modellerini (Gece transfer patlamaları, yeni alıcıya yüklü transfer, hızlı bakiye boşaltma) olasılıksal olarak tahminler.
- **Birleşik Skor & 4 Kademeli Risk Seviyesi**:
  - 🟢 **SAFE (0.00 - 0.29)**: İşlem otomatik onaylanır.
  - 🟡 **MEDIUM (0.30 - 0.59)**: İşlem onaylanır, audit loglara şüpheli izleme bayrağı eklenir.
  - 🟠 **HIGH (0.60 - 0.84)**: İşlem durdurulur, kullanıcıya dinamik **2FA OTP Challenge** sunulur.
  - 🔴 **CRITICAL (0.85 - 1.00)**: Otomatik bloke veya kritik 2FA onayı tetiklenir, `banking-fraud-alerts` Kafka konusuna bildirim düşer.
- **Çıkarım Hızı**: `< 5 milisaniye` ortalama işlem gecikmesi.

---

## 🗄️ Veritabanı Varlıkları & E-R Yapısı (PostgreSQL)

- **`users`**: Kimlik, e-posta, hash'lenmiş şifre, doğrulama durumu ve roller.
- **`accounts`**: IBAN, hesap numarası, vadesiz/vadeli/altın türü, para birimi, anlık bakiye. (`PESSIMISTIC_WRITE` kilitleme destekli)
- **`cards`**: Sanal/fiziksel kartlar, CVV, son kullanma, kart dondurma (`is_frozen`), e-ticaret ve yurt dışı izinleri, harcama limitleri.
- **`transactions`**: FAST/EFT işlem kayıtları, transfer durumu (`COMPLETED`, `OTP_CHALLENGED`, `REJECTED`), hesaplanan risk skoru ve seviyesi.
- **`user_sessions`**: Aktif cihazlar, tarayıcı bilgisi, IP adresi, şehir/ülke konumu ve son aktiflik zamanı.
- **`fraud_models`**: Sisteme yüklenen ONNX / ML modellerinin versiyonları, algoritmaları ve doğruluk (F1 / Accuracy) oranları.
- **`fraud_evaluations`**: Her işlem için çıkarılan 18 özellik, tetiklenen kural bayrakları, model puanları ve karar geçmişi.
- **`audit_logs`**: Asenkron Kafka tüketicisi tarafından yazılan güvenlik denetim kayıtları.

---

## 📬 Olay Tabanlı Mesajlaşma (Event-Driven Streaming)

Sistem kritik eylemleri asenkron olaylar (events) olarak dağıtır:

1. **`banking-auth-events`**:
   - Giriş başarılı / başarısız, yeni kayıt, şifre değişikliği.
2. **`banking-transaction-events`**:
   - Transfer başlatıldı (`TRANSFER_INITIATED`), transfer tamamlandı (`TRANSFER_COMPLETED`).
3. **`banking-fraud-alerts`**:
   - Yüksek riskli işlem alarmı (`FRAUD_CHALLENGE_TRIGGERED`, `FRAUD_BLOCKED`).
4. **RabbitMQ Bildirimleri**:
   - 2 dakikalık OTP mailleri, SMS transfer güvenlik kodları.

---

## 🛠️ Kurulum ve Çalıştırma

### 1. Altyapı Servislerini Başlatın (Docker Compose)
PostgreSQL, Redis, RabbitMQ, Kafka ve Grafana servislerini tek komutla ayağa kaldırın:
```bash
docker compose up -d
```

### 2. Python ML Modelini Eğitin (Opsiyonel - Fraud Engine)
50.000 sentetik bankacılık verisi ile XGBoost & Isolation Forest modellerini eğitmek ve ONNX formatına dönüştürmek için:
```bash
cd backend/fraud-service
pip install -r requirements.txt
python train_model.py
```

### 3. Backend Servislerini Çalıştırın

**API Gateway**:
```bash
cd backend/api-gateway
mvn clean spring-boot:run
```

**Auth & Banking Mikroservisi**:
```bash
cd backend/auth-service
mvn clean spring-boot:run
```
> *Not: Veritabanı ilk başlatıldığında, sistem `data.sql` dosyasını kullanarak veritabanına `bora@toker.com` / `12345678` kullanıcısını ve demo hesap verilerini otomatik yazar. Kod (Controller vb.) içinde sahte/gömülü (mock) veri barındırılmaz.*

### 4. Web Frontend'i Başlatın (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Tarayıcınızdan **`http://localhost:5173`** adresine giderek sistemi kullanabilirsiniz.

### 5. Mobil Arayüzü Başlatın (Expo / React Native)
```bash
cd mobile
npm install
npm run web   # Tarayıcıda mobil simülasyonu (http://localhost:5174)
# veya
npm start     # Expo Go mobil QR kodu ile gerçek cihazda çalıştırma
```

---

## 👥 Katkı ve Lisans
TokerBank açık kaynaklı finansal teknoloji ve yapay zeka güvenlik mimarisi referans projesidir. Ticari ve akademik kullanımlar için uygundur.
