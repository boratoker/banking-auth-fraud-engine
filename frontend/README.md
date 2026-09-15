# 🎨 TokerBank Frontend - Digital Banking & AI Fraud Shield Dashboard UI

Bu dizin, **TokerBank Enterprise Banking & AI Fraud Shield** sisteminin React 18 ve Vite ile geliştirilmiş modern, performanslı ve dinamik kullanıcı arayüzünü içerir.

---

## 📐 Proje Mimarisi ve Klasör Yapısı

```
frontend/
├── src/
│   ├── api/                     # Backend REST API Entegrasyon Katmanı
│   │   ├── authApi.js           # E-posta kontrolü, Login, Register, OTP doğrulama API'leri
│   │   ├── bankingApi.js        # Hesaplar, Kartlar, FAST Transfer, Fraud ve Oturum API'leri
│   │   └── signingApi.js        # İşlem İmzalama (WebCrypto ECDSA) ve Cihaz Eşleştirme API'leri
│   ├── utils/                   # Yardımcı Sınıflar ve Servisler
│   │   └── CryptoService.js     # WebCrypto API sarmalayıcısı (Anahtar üretimi ve imzalama)
│   ├── components/              # Yeniden Kullanılabilir Arayüz Bileşenleri
│   │   ├── Navbar.jsx           # Üst Navigasyon Çubuğu, Canlı Fraud Durumu & Arama
│   │   └── Sidebar.jsx          # Sol Menü Gezinme Paneli
│   ├── view/                    # Ana Sayfa Görünümleri (Views)
│   │   ├── DashboardOverviewView.jsx  # Toplam varlıklar, kredi kartı özeti ve hızlı işlemler
│   │   ├── AccountsView.jsx           # Vadesiz/Vadeli hesaplar ve İnteraktif Sanal Kart Kontrolleri
│   │   ├── TransferView.jsx           # FAST Transfer & AI Fraud Risk Uyarı Modalı
│   │   ├── SecurityView.jsx           # Aktif oturumlar, IP/Cihaz takibi ve Oturum Sonlandırma
│   │   ├── TransactionsView.jsx       # Filtrelenebilir hesap hareketleri ve dekont görünümü
│   │   └── MainDashboardView.jsx      # Giriş sonrası ana dashboard düzeni (Wrapper)
│   ├── App.jsx                  # Şifresiz OTP Giriş/Kayıt Akışı & 2 Dakikalık Canlı Sayaç
│   ├── App.css                  # Custom Design System, Glassmorphism ve CSS Değişkenleri
│   ├── index.css                # Küresel Reset & Tipografi Stilleri
│   └── main.jsx                 # Uygulama Başlangıç Noktası (Entry Point)
├── package.json                 # Bağımlılıklar ve Komutlar
└── vite.config.js               # Vite Yapılandırması
```

---

## 🚀 Kullanılan Teknolojiler

* **Core Framework**: React 18 (`react`, `react-dom`)
* **Build Tool & Dev Server**: Vite 8 (Hot Module Replacement - HMR)
* **HTTP İstemcisi**: Axios (API Gateway entegrasyonu için)
* **Tasarım & Stil**: Vanilla CSS3 (Custom Glassmorphism, Dark/Light Temalar, CSS Variables, Flexbox/Grid)
* **Tipografi**: Outfit / Inter Google Fonts & System Emoji

---

## ✨ Öne Çıkan Arayüz Özellikleri ve Kullanıcı Akışları

### 🔐 1. E-Posta & 2-Dakikalık Canlı OTP Giriş Akışı (`App.jsx`)
- **Şifresiz E-Posta Doğrulama**: Kullanıcı e-postasını girer, sistem kullanıcı varlığını kontrol eder (Login vs Register).
- **Maskelenmiş E-Posta**: Güvenlik gereği e-posta adresi ekranda maskelenerek gösterilir (örn: `to***@gmail.com`).
- **Canlı 2 Dakikalık Sayaç**: Ekran açıldığında **`⏱ Kalan Süre: 02:00`** formatında canlı geri sayım başlar.
- **Otomatik Zaman Aşımı Engeli**: 2 dakika dolduğunda doğrulama butonu ve kod giriş alanı pasif hale geçer.
- **Kodu Tekrar Gönder Butonu**: Süre bittiğinde veya yeni kod istendiğinde *"Kodu Tekrar Gönder"* butonu ile sayaç sıfırlanır (`120s`) ve yeni OTP e-posta ile gönderilir.
- **Güvenli Şifre Sıfırlama (3 Adımlı Akış)**: Şifre sıfırlama talepleri zamanlama saldırılarına (timing attacks) karşı korunmak için tam asenkron yürütülür. (E-Posta Onayı -> OTP Bekleme -> Yeni Şifre).

### 💳 2. Çoklu Kart Yönetimi & Karusel (`AccountsView.jsx`)
- **Dinamik Kart Karuseli (Slideshow)**: Kullanıcının sahip olduğu tüm kartlar (Sanal, Kredi, Banka) arasında kaydırılabilir karusel arayüzü ile geçiş imkanı.
- **Kart Türüne Göre Dinamik Tasarım**: VIRTUAL kartlar için premium siyah, CREDIT kartlar için lüks altın (Gold), DEBIT kartlar için mavi temalı CSS gradyan tasarımları. Gerçek kredi kartı ebatlarına (1.586 aspect-ratio) duyarlı responsive yapı.
- **Anlık Kart Dondurma Switch'i**: Kart dondurulduğunda kart üzeri buzlu kilit efekti (`Card Frozen Overlay`) aktif olur ve tüm harcama izinleri engellenir.
- **İnternet & Yurt Dışı İzinleri**: E-ticaret ve yurt dışı harcama izinleri yönetilebilir. Kredi kartları için anlık harcama limit çubukları dinamik olarak çalışır.
- **Hesap Listesi & IBAN Kopyalama**: Vadesiz, vadeli ve döviz hesapları alt alta listelenir, tek tıkla IBAN kopyalama desteği sunar.

### 🔍 3. Küresel Arama Çubuğu (Global Search)
- **Hızlı Erişim (CMD+K)**: Navigasyon çubuğundaki arama bölümü ile tüm uygulama içi menülere hızlıca erişim sağlanır.
- **Türkçe Karakter Uyumlu Arama**: `normalizeTurkish` utils fonksiyonu ile büyük/küçük harf ve Türkçe/İngilizce karakter duyarlılığı olmadan pürüzsüz arama yeteneği.

### 🛡️ 4. FAST Transfer & AI Fraud Risk Modalı (`TransferView.jsx`)
- **Hızlı Transfer Formu**: Kayıtlı kişiler veya IBAN ile FAST transfer başlatılır.
- **Yapay Zeka Risk Analizi Modalı**: Transfer tutarı ₺10.000 üzerindeyse backend'den gelen `%68 Risk` uyarısıyla şık bir **AI Fraud Shield Modal** açılır.
- **2FA SMS/OTP Onay Ekranı**: Şüpheli işlem için kullanıcıya ek güvenlik kodu şartı koşulur, onay verilirse işlem gerçekleşir.

### 🖋️ 5. İşlem İmzalama & WebCrypto (PSD2 SCA)
- **Donanımsal Anahtar Üretimi**: Tarayıcının WebCrypto API'si ile `ECDSA P-256` şifreleme anahtarları cihazda üretilir.
- **İnteraktif Hacker Modu**: Transfer sırasında veri paketini yolda (payload) manipüle ederek backend'in asimetrik şifreleme (Digital Signature) ile bunu nasıl reddettiği canlı olarak simüle edilebilir.

### 🔑 6. Güvenlik & Oturum Takibi (`SecurityView.jsx`)
- **Cihaz Parmak İzi & Konum**: Hesaba bağlı cihazlar (macOS, iPhone, Windows), IP adresleri ve şehir bilgisi listelenir.
- **Tek Tıkla Oturum Sonlandırma**: Şüpheli cihazların oturumu anında kapatılabilir.

---

## 📦 Frontend Bağımlılık Tablosu (`package.json`)

| Paket Adı | Sürüm | Bağımlılık Tipi | Kullanım Amacı |
| :--- | :--- | :--- | :--- |
| **`react`** | `^18.3.1` | Core Dependency | Bileşen tabanlı kullanıcı arayüzü motoru ve state yönetimi |
| **`react-dom`** | `^18.3.1` | Core Dependency | React bileşenlerinin DOM üzerine işlenmesi (Rendering) |
| **`axios`** | `^1.7.9` | Core Dependency | API Gateway (`http://localhost:8080`) ile asenkron veri iletişimi |
| **`vite`** | `^8.2.2` | DevDependency | Hızlı geliştirme sunucusu, HMR ve production derleyicisi |
| **`@vitejs/plugin-react`** | `^4.3.4` | DevDependency | Vite için React JSX ve Fast Refresh eklentisi |

---

## 🛠️ Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleyin:
```bash
cd frontend
npm install
```

### 2. Geliştirme Sunucusunu Başlatın (Dev Server):
```bash
npm run dev
```
Uygulama Varsayılan Olarak **`http://localhost:5173`** Adresinde Yayına Başlar.

### 3. Production Derlemesi (Build):
```bash
npm run build
```
