# 🎨 TokerBank Frontend - Digital Banking & AI Fraud Shield Dashboard UI

Bu dizin, **TokerBank Enterprise Banking & AI Fraud Shield** sisteminin React 18 ve Vite ile geliştirilmiş modern, performanslı ve dinamik kullanıcı arayüzünü içerir.

---

## 📐 Proje Mimarisi ve Klasör Yapısı

```
frontend/
├── src/
│   ├── api/                     # Backend REST API Entegrasyon Katmanı
│   │   ├── authApi.js           # E-posta kontrolü, Login, Register, OTP doğrulama API'leri
│   │   └── bankingApi.js        # Hesaplar, Kartlar, FAST Transfer, Fraud ve Oturum API'leri
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

### 💳 2. Sanal Kart & Güvenlik Ayarları (`AccountsView.jsx`)
- **Canlı Sanal Kart Görseli**: Platinum Sanal Kart numarası, CVV ve son kullanma tarihi dinamik olarak görüntülenir.
- **Anlık Kart Dondurma Switch'i**: Kart dondurulduğunda kart üzeri buzlu kilit efekti (`Card Frozen Overlay`) aktif olur ve tüm harcama izinleri engellenir.
- **İnternet & Yurt Dışı İzinleri**: E-ticaret ve yurt dışı harcama switch'leri anında backend ile senkronize olur.
- **IBAN Kopyalama**: Tek tıkla IBAN kopyalama ve *"✓ Kopyalandı"* görsel uyarısı.

### 🛡️ 3. FAST Transfer & AI Fraud Risk Modalı (`TransferView.jsx`)
- **Hızlı Transfer Formu**: Kayıtlı kişiler veya IBAN ile FAST transfer başlatılır.
- **Yapay Zeka Risk Analizi Modalı**: Transfer tutarı ₺10.000 üzerindeyse backend'den gelen `%68 Risk` uyarısıyla şık bir **AI Fraud Shield Modal** açılır.
- **2FA SMS/OTP Onay Ekranı**: Şüpheli işlem için kullanıcıya ek güvenlik kodu şartı koşulur, onay verilirse işlem gerçekleşir.

### 🔑 4. Güvenlik & Oturum Takibi (`SecurityView.jsx`)
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
