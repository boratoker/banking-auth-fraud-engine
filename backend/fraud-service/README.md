# 🛡️ AI Fraud Shield - Python ML Training & ONNX Pipeline

Bu servis, **TokerBank Enterprise Banking** platformu için sahtecilik ve şüpheli işlem tespiti (Fraud Detection) modellerini eğiten, değerlendiren ve üretim (production) ortamı için optimize edilmiş **ONNX** formatına dönüştüren makine öğrenmesi boru hattıdır.

---

## 🎯 Model Mimarisi: Hibrit Yaklaşım

Finansal dolandırıcılık tespiti iki temel zorluk barındırır:
1. **Etiketlenmemiş / Yeni Saldırı Türleri**: Daha önce hiç görülmemiş anomali kalıpları.
2. **Bilinen Dolandırıcılık Senaryoları**: Hesap boşaltma, gece transfer patlamaları, yeni alıcılara ani yüksek meblağ transferleri.

Bu nedenle sistem hibrit bir yapı kullanır:

```
                                  [ Transfer İsteği ]
                                           │
                                           ▼
                      [ 18-Boyutlu Feature Engineering ]
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
           ┌────────────────────────┐            ┌────────────────────────┐
           │    Isolation Forest    │            │        XGBoost         │
           │  (Denetimsiz Anomali)  │            │ (Denetimli Sınıflandırma)
           └────────────┬───────────┘            └────────────┬───────────┘
                        │ Anomali Skoru (0-1)                 │ Sahtecilik İhtimali (0-1)
                        └──────────────────┬──────────────────┘
                                           ▼
                        [ Ağırlıklı Hibrit Risk Skoru ]
                        Score = (0.35 * IsoForest) + (0.65 * XGBoost)
                                           │
               ┌───────────────────────────┼───────────────────────────┐
               ▼                           ▼                           ▼
        [ SAFE: 0.0-0.29 ]        [ HIGH: 0.60-0.84 ]        [ CRITICAL: 0.85-1.0 ]
         Doğrudan Onay             2FA OTP Challenge          Kritik Alarm & Bloke
```

---

## 📊 18 Giriş Özelliği (Features)

| No | Özellik Adı | Tip | Açıklama |
| :---: | :--- | :---: | :--- |
| **1** | `amount` | Float | Transfer tutarı (TL) |
| **2** | `log_amount` | Float | $\ln(1 + \text{amount})$ logaritmik dönüşümü |
| **3** | `amount_to_balance_ratio` | Float | Transferin mevcut hesap bakiyesine oranı (0.0 - 1.0+) |
| **4** | `hour_of_day` | Int | İşlemin yapıldığı saat (0 - 23) |
| **5** | `is_night_transaction` | Binary | 00:00 - 06:00 arası gece işlemi bayrağı (0 veya 1) |
| **6** | `day_of_week` | Int | Haftanın günü (Pazartesi: 1, Pazar: 7) |
| **7** | `is_weekend` | Binary | Hafta sonu işlemi bayrağı (0 veya 1) |
| **8** | `transfers_count_1h` | Int | Kullanıcının son 1 saatteki transfer adedi (Velocity) |
| **9** | `transfers_count_24h` | Int | Kullanıcının son 24 saatteki transfer adedi |
| **10**| `total_amount_transferred_24h` | Float | Son 24 saatte transfer edilen kümülatif tutar |
| **11**| `avg_amount_transferred_30d` | Float | Son 30 günlük transfer tutarlarının ortalaması |
| **12**| `max_amount_transferred_30d` | Float | Son 30 gündeki en yüksek tekil transfer tutarı |
| **13**| `std_dev_amount_30d` | Float | Son 30 günlük transferlerin standart sapması |
| **14**| `z_score_amount` | Float | Tutarin 30 günlük ortalamadan kaç standart sapma saptığı |
| **15**| `is_new_recipient` | Binary | Alıcı IBAN'a ilk defa mı para gönderiliyor? (0 veya 1) |
| **16**| `channel_encoded` | Float | İşlem kanalı (1.0 = Web, 2.0 = Mobil, 3.0 = API) |
| **17**| `is_new_device` | Binary | İlk kez kullanılan veya tanınmayan cihaz mı? (0 veya 1) |
| **18**| `location_distance_km` | Float | Kullanıcının son olağan konumuna olan coğrafi mesafe (km) |

---

## ⚙️ Kurulum ve Eğitim Adımları

### 1. Python Sanal Ortamını Hazırlayın
```bash
cd backend/fraud-service

python3 -m venv venv
source venv/bin/activate  # macOS / Linux
# veya: venv\Scripts\activate (Windows)

pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Modelleri Eğitin ve ONNX Formatında Kaydedin
```bash
python train_model.py
```

### 3. Çıktılar (Generated Artifacts)
İşlem tamamlandığında aşağıdaki dosyalar oluşturulur:
- **`isolation_forest.onnx`**: Java tarafında ONNX Runtime ile yüklenen denetimsiz anomali modeli.
- **`xgboost_fraud.onnx`**: Yüksek doğruluklu denetimli sınıflandırıcı modeli.
- **`model_metadata.json`**: Model doğruluk metrikleri (ROC-AUC, Precision, Recall, F1), özellik listesi ve eğitim zaman damgası.

---

## ⚡ Java Backend Entegrasyonu

Spring Boot uygulaması (`backend/auth-service`), bu modelleri `MlFraudInferenceEngine` servisi üzerinden belleğe alır. Her transfer isteğinde öznitelikler çıkarılarak mikro-saniyeler seviyesinde karar verilir. ONNX dosyaları bulunmadığında dahi motor, istatistiksel z-score ve kural tabanlı koruma kalkanıyla kesintisiz çalışmayı sürdürür.
