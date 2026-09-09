#!/usr/bin/env python3
"""
TokerBank AI Fraud Shield - ML Model Eğitim & ONNX Export Script

Hibrit model mimarisi:
1. Isolation Forest (Unsupervised) - Anomali tespiti
2. XGBoost (Supervised) - Sahtekarlık sınıflandırması

18 öznitelik kullanarak sentetik bankacılık verisi üzerinde eğitim yapar,
modeli ONNX formatına dönüştürür ve Spring Boot'tan yüklenebilecek şekilde kaydeder.

Kullanım:
    pip install -r requirements.txt
    python train_model.py
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, f1_score
import xgboost as xgb
import json
import os
import warnings
warnings.filterwarnings('ignore')

# === 1. Sentetik Veri Üretimi ===
# Gerçek bankacılık verisi yerine, modelin eğitim akışını göstermek için
# sentetik veri üretilir. Gerçek uygulamada PostgreSQL'deki transaction
# ve fraud_feature_store tablolarından beslenecektir.

np.random.seed(42)
N_NORMAL = 9500
N_FRAUD = 500
N_TOTAL = N_NORMAL + N_FRAUD

print("🏗️  TokerBank ML Fraud Model Eğitim Süreci Başlatılıyor...")
print(f"📊 Veri Seti: {N_NORMAL} Normal + {N_FRAUD} Fraud = {N_TOTAL} işlem\n")

# Normal işlem özellikleri
normal_data = {
    'amount': np.random.lognormal(mean=7, sigma=1.2, size=N_NORMAL).clip(10, 50000),
    'amount_to_user_avg_ratio': np.random.uniform(0.2, 3.0, N_NORMAL),
    'currency_mismatch': np.random.binomial(1, 0.02, N_NORMAL),
    'is_fast_type': np.random.binomial(1, 0.7, N_NORMAL),
    'tx_count_last_1h': np.random.poisson(0.5, N_NORMAL),
    'tx_amount_sum_last_24h': np.random.lognormal(mean=7, sigma=1, size=N_NORMAL).clip(0, 100000),
    'daily_limit_usage_pct': np.random.uniform(0.0, 0.6, N_NORMAL),
    'time_since_last_tx_sec': np.random.exponential(3600, N_NORMAL).clip(60, 86400),
    'is_night_time': np.random.binomial(1, 0.08, N_NORMAL),
    'is_new_recipient_iban': np.random.binomial(1, 0.15, N_NORMAL),
    'recipient_transfers_count': np.random.poisson(5, N_NORMAL),
    'recipient_in_contacts': np.random.binomial(1, 0.7, N_NORMAL),
    'device_fingerprint_matched': np.random.binomial(1, 0.95, N_NORMAL),
    'ip_location_distance_km': np.random.exponential(5, N_NORMAL).clip(0, 50),
    'recent_failed_logins': np.random.binomial(1, 0.03, N_NORMAL),
    'session_age_minutes': np.random.uniform(5, 480, N_NORMAL),
    'amount_is_round': np.random.binomial(1, 0.2, N_NORMAL),
    'high_amount_flag': np.zeros(N_NORMAL),
}
# high_amount_flag'ı amount'a göre ayarla
normal_data['high_amount_flag'] = (np.array(normal_data['amount']) >= 10000).astype(int)

# Fraud işlem özellikleri (şüpheli kalıplar)
fraud_data = {
    'amount': np.random.lognormal(mean=9.5, sigma=0.8, size=N_FRAUD).clip(5000, 200000),
    'amount_to_user_avg_ratio': np.random.uniform(4.0, 20.0, N_FRAUD),
    'currency_mismatch': np.random.binomial(1, 0.15, N_FRAUD),
    'is_fast_type': np.random.binomial(1, 0.9, N_FRAUD),
    'tx_count_last_1h': np.random.poisson(3, N_FRAUD),
    'tx_amount_sum_last_24h': np.random.lognormal(mean=9, sigma=1, size=N_FRAUD).clip(5000, 500000),
    'daily_limit_usage_pct': np.random.uniform(0.6, 1.0, N_FRAUD),
    'time_since_last_tx_sec': np.random.exponential(120, N_FRAUD).clip(5, 600),
    'is_night_time': np.random.binomial(1, 0.45, N_FRAUD),
    'is_new_recipient_iban': np.random.binomial(1, 0.85, N_FRAUD),
    'recipient_transfers_count': np.random.poisson(0.5, N_FRAUD),
    'recipient_in_contacts': np.random.binomial(1, 0.1, N_FRAUD),
    'device_fingerprint_matched': np.random.binomial(1, 0.3, N_FRAUD),
    'ip_location_distance_km': np.random.exponential(200, N_FRAUD).clip(50, 5000),
    'recent_failed_logins': np.random.binomial(3, 0.4, N_FRAUD),
    'session_age_minutes': np.random.uniform(0, 15, N_FRAUD),
    'amount_is_round': np.random.binomial(1, 0.6, N_FRAUD),
    'high_amount_flag': np.ones(N_FRAUD),
}

# DataFrame oluştur
df_normal = pd.DataFrame(normal_data)
df_normal['is_fraud'] = 0

df_fraud = pd.DataFrame(fraud_data)
df_fraud['is_fraud'] = 1

df = pd.concat([df_normal, df_fraud], ignore_index=True).sample(frac=1, random_state=42)

FEATURE_NAMES = [
    'amount', 'amount_to_user_avg_ratio', 'currency_mismatch', 'is_fast_type',
    'tx_count_last_1h', 'tx_amount_sum_last_24h', 'daily_limit_usage_pct',
    'time_since_last_tx_sec', 'is_night_time', 'is_new_recipient_iban',
    'recipient_transfers_count', 'recipient_in_contacts', 'device_fingerprint_matched',
    'ip_location_distance_km', 'recent_failed_logins', 'session_age_minutes',
    'amount_is_round', 'high_amount_flag'
]

X = df[FEATURE_NAMES].values
y = df['is_fraud'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"✅ Eğitim seti: {len(X_train)} | Test seti: {len(X_test)}")
print(f"   Eğitim - Normal: {sum(y_train==0)}, Fraud: {sum(y_train==1)}")
print(f"   Test   - Normal: {sum(y_test==0)}, Fraud: {sum(y_test==1)}\n")

# === 2. Isolation Forest (Anomali Tespiti) ===
print("=" * 60)
print("🌲 Aşama 1: Isolation Forest (Denetimsiz Anomali Tespiti)")
print("=" * 60)

iso_forest = IsolationForest(
    n_estimators=200,
    contamination=0.05,
    max_features=1.0,
    random_state=42,
    n_jobs=-1
)
iso_forest.fit(X_train)

# Anomali skorları (-1 = anomali, 1 = normal) -> 0-1 arası normalize et
iso_scores_train = iso_forest.decision_function(X_train)
iso_scores_test = iso_forest.decision_function(X_test)

# Normalize: Düşük decision_function = yüksek anomali
iso_min, iso_max = iso_scores_train.min(), iso_scores_train.max()
anomaly_scores_test = 1 - (iso_scores_test - iso_min) / (iso_max - iso_min)
anomaly_scores_test = np.clip(anomaly_scores_test, 0, 1)

print(f"   Normal İşlem Ort. Anomali Skoru: {anomaly_scores_test[y_test==0].mean():.4f}")
print(f"   Fraud İşlem Ort. Anomali Skoru:  {anomaly_scores_test[y_test==1].mean():.4f}")
print()

# === 3. XGBoost (Denetimli Sınıflandırma) ===
print("=" * 60)
print("🚀 Aşama 2: XGBoost (Denetimli Fraud Sınıflandırması)")
print("=" * 60)

xgb_model = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.1,
    scale_pos_weight=N_NORMAL / N_FRAUD,  # Dengesiz sınıf ağırlığı
    min_child_weight=3,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    eval_metric='logloss',
    use_label_encoder=False
)
xgb_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

# Test tahminleri
y_pred = xgb_model.predict(X_test)
y_prob = xgb_model.predict_proba(X_test)[:, 1]

# Metrikler
auc_roc = roc_auc_score(y_test, y_prob)
f1 = f1_score(y_test, y_pred)
accuracy = (y_pred == y_test).mean()

print(f"\n📊 XGBoost Model Performansı:")
print(f"   Accuracy:  {accuracy:.4f} ({accuracy*100:.1f}%)")
print(f"   AUC-ROC:   {auc_roc:.4f}")
print(f"   F1 Score:  {f1:.4f}")
print(f"\n{classification_report(y_test, y_pred, target_names=['Normal', 'Fraud'])}")

# Feature Importance
print("📌 En Etkili Öznitelikler (Feature Importance):")
importances = xgb_model.feature_importances_
importance_pairs = sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1])
for name, imp in importance_pairs[:10]:
    bar = "█" * int(imp * 80)
    print(f"   {name:35s} {imp:.4f} {bar}")

# === 4. ONNX Export ===
print("\n" + "=" * 60)
print("📦 Aşama 3: ONNX Model Export")
print("=" * 60)

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

try:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType as SklFloatTensorType
    import onnxmltools
    from onnxmltools.convert import convert_xgboost
    from onnxmltools.convert.common.data_types import FloatTensorType as OnnxFloatTensorType

    # XGBoost -> ONNX
    initial_type_xgb = [('float_input', OnnxFloatTensorType([None, len(FEATURE_NAMES)]))]
    onnx_xgb = convert_xgboost(xgb_model, initial_types=initial_type_xgb)
    xgb_onnx_path = os.path.join(MODELS_DIR, 'fraud_xgboost_v1.onnx')
    with open(xgb_onnx_path, 'wb') as f:
        f.write(onnx_xgb.SerializeToString())
    print(f"   ✅ XGBoost ONNX kaydedildi: {xgb_onnx_path}")

    # Isolation Forest -> ONNX
    initial_type_iso = [('float_input', SklFloatTensorType([None, len(FEATURE_NAMES)]))]
    iso_onnx = convert_sklearn(iso_forest, initial_types=initial_type_iso, target_opset={'ai.onnx.ml': 3})
    iso_onnx_path = os.path.join(MODELS_DIR, 'fraud_isolation_forest_v1.onnx')
    with open(iso_onnx_path, 'wb') as f:
        f.write(iso_onnx.SerializeToString())
    print(f"   ✅ Isolation Forest ONNX kaydedildi: {iso_onnx_path}")

except ImportError as e:
    print(f"   ⚠️  ONNX export kütüphaneleri yüklenemedi: {e}")
    print(f"   ℹ️  Model sadece Python ortamında kullanılabilir.")

# === 5. Model Metadata Kaydet ===
metadata = {
    "model_name": "Toker-XGB-Anomaly-Hybrid",
    "model_version": "v1.0.0-onnx",
    "algorithm": "XGBoost + IsolationForest",
    "accuracy": round(accuracy, 4),
    "auc_roc": round(auc_roc, 4),
    "f1_score": round(f1, 4),
    "feature_names": FEATURE_NAMES,
    "n_features": len(FEATURE_NAMES),
    "training_samples": len(X_train),
    "test_samples": len(X_test),
    "fraud_ratio": round(N_FRAUD / N_TOTAL, 4),
    "xgb_params": {
        "n_estimators": 300,
        "max_depth": 6,
        "learning_rate": 0.1
    },
    "iso_forest_params": {
        "n_estimators": 200,
        "contamination": 0.05
    }
}

metadata_path = os.path.join(MODELS_DIR, 'model_metadata.json')
with open(metadata_path, 'w', encoding='utf-8') as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)
print(f"   ✅ Model metadata kaydedildi: {metadata_path}")

# === SHAP Açıklanabilirlik ===
print("\n" + "=" * 60)
print("🔍 Aşama 4: SHAP Açıklanabilirlik Analizi")
print("=" * 60)
try:
    import shap
    explainer = shap.TreeExplainer(xgb_model)
    shap_values = explainer.shap_values(X_test[:100])
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    shap_pairs = sorted(zip(FEATURE_NAMES, mean_abs_shap), key=lambda x: -x[1])

    print("   Top-10 SHAP Feature Katkısı:")
    for name, val in shap_pairs[:10]:
        bar = "█" * int(val * 40)
        print(f"   {name:35s} {val:.4f} {bar}")

    # SHAP summary plot kaydet
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        shap.summary_plot(shap_values, X_test[:100], feature_names=FEATURE_NAMES, show=False)
        shap_plot_path = os.path.join(MODELS_DIR, 'shap_summary.png')
        plt.savefig(shap_plot_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"   ✅ SHAP görselleştirme kaydedildi: {shap_plot_path}")
    except Exception as e:
        print(f"   ⚠️  SHAP plot kaydedilemedi: {e}")

except ImportError:
    print("   ⚠️  SHAP kütüphanesi yüklü değil. Açıklanabilirlik atlandı.")

print("\n" + "=" * 60)
print("✅ TokerBank ML Fraud Model Eğitimi Tamamlandı!")
print(f"   Model Versiyonu: v1.0.0-onnx")
print(f"   Accuracy: {accuracy*100:.1f}% | AUC-ROC: {auc_roc:.4f} | F1: {f1:.4f}")
print("=" * 60)
