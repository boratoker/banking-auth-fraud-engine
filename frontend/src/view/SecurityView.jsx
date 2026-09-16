import React, { useState, useEffect } from 'react';
import { getSecuritySessions, terminateSession, getOverviewData, getSecuritySettings, updateSecuritySettings, requestLimitIncrease, verifyLimitIncrease } from '../api/bankingApi';

const SecurityView = () => {
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [fraudAlertsEnabled, setFraudAlertsEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(50000);
  const [activeSessions, setActiveSessions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [newLimitInput, setNewLimitInput] = useState('');
  const [showLimitOtpModal, setShowLimitOtpModal] = useState(false);
  const [limitOtp, setLimitOtp] = useState('');
  const [limitStatusMsg, setLimitStatusMsg] = useState('');
  const [limitError, setLimitError] = useState('');

  useEffect(() => {
    Promise.all([
      getSecuritySessions().then(res => {
        if (Array.isArray(res.data)) setActiveSessions(res.data);
      }).catch(() => {}),
      getOverviewData().then(res => {
        if (res.data) setOverview(res.data);
      }).catch(() => {}),
      getSecuritySettings().then(res => {
        if (res.data) {
          setBiometricsEnabled(res.data.biometricsEnabled);
          setFraudAlertsEnabled(res.data.fraudAlertsEnabled);
          setDailyLimit(res.data.dailyTransferLimit);
        }
      }).catch(() => {})
    ]).finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key, value) => {
    try {
      if (key === 'biometricsEnabled') setBiometricsEnabled(value);
      if (key === 'fraudAlertsEnabled') setFraudAlertsEnabled(value);
      
      await updateSecuritySettings({ [key]: value });
    } catch (e) {
      console.error("Failed to update security settings", e);
    }
  };

  const handleRequestLimitIncrease = async () => {
    setLimitError('');
    setLimitStatusMsg('');
    const val = Number(newLimitInput);
    if (!val || val <= 0) {
      setLimitError("Lütfen geçerli bir limit giriniz.");
      return;
    }
    if (val === dailyLimit) {
      setLimitError("Yeni limit mevcut limit ile aynı olamaz.");
      return;
    }
    try {
      if (val < dailyLimit) {
        // Decrease limit directly without OTP
        await updateSecuritySettings({ dailyTransferLimit: val });
        setDailyLimit(val);
        setNewLimitInput('');
        setLimitStatusMsg("Limit başarıyla düşürüldü.");
      } else {
        // Increase limit needs OTP
        await requestLimitIncrease(val);
        setShowLimitOtpModal(true);
      }
    } catch (e) {
      setLimitError("İşlem başarısız oldu.");
    }
  };

  const handleVerifyLimitIncrease = async () => {
    setLimitError('');
    try {
      await verifyLimitIncrease(limitOtp);
      setDailyLimit(Number(newLimitInput));
      setShowLimitOtpModal(false);
      setLimitOtp('');
      setNewLimitInput('');
      setLimitStatusMsg("Limit başarıyla artırıldı!");
    } catch (e) {
      setLimitError("Hatalı kod veya işlem başarısız.");
    }
  };

  const handleTerminateSession = async (id) => {
    setActiveSessions(prev => prev.filter(s => s.id !== id));
    try {
      await terminateSession(id);
    } catch (e) {
      // Fallback
    }
  };

  const riskPercent = overview?.riskScore != null ? (100 - overview.riskScore) : null;
  const riskLabel = riskPercent == null
    ? 'Hesaplanıyor'
    : riskPercent <= 10 ? `GÜVENLİ (%${riskPercent} Risk)`
    : riskPercent <= 30 ? `DİKKAT (%${riskPercent} Risk)`
    : `YÜKSEK RİSK (%${riskPercent} Risk)`;
  const riskClass = riskPercent == null ? '' : riskPercent <= 10 ? 'safe' : riskPercent <= 30 ? 'medium' : 'high';

  const activeSession = activeSessions.find(s => s.isCurrent);

  return (
    <div className="view-container security-view">
      <div className="view-header">
        <h2>Güvenlik & Risk Yönetim Merkezi</h2>
        <p>Yapay zeka destekli dolandırıcılık koruması, aktif cihaz oturumları ve güvenlik tercihleri.</p>
      </div>

      <div className="security-grid">
        {/* Risk Assessment Box */}
        <div className="widget-card risk-assessment-card">
          <div className="card-header">
            <h3>Cihaz ve Oturum Risk Değerlendirmesi</h3>
            {!loading && (
              <span className={`risk-level-badge ${riskClass}`}>{riskLabel}</span>
            )}
          </div>

          <div className="risk-metrics-row">
            <div className="metric-box">
              <span className="metric-label">Cihaz Parmak İzi</span>
              <span className="metric-val text-success">
                {activeSession ? 'Eşleşti (Güvenilir)' : 'Bilinmiyor'}
              </span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Statik / Dinamik IP</span>
              <span className="metric-val">
                {activeSession?.ip || overview?.lastSessionIp || '—'}
              </span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Giriş Metodu</span>
              <span className="metric-val">OTP + Email Verified</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Son Oturum Konumu</span>
              <span className="metric-val">
                {activeSession?.location || overview?.lastSessionLocation || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Preferences */}
        <div className="widget-card security-settings-card">
          <h3>Güvenlik Tercihleri & İzinler</h3>

          <div className="control-row">
            <div className="control-info">
              <span className="control-title">Biyometrik / Passkey Girişi</span>
              <span className="control-desc">TouchID / FaceID ile şifresiz güvenli oturum açma.</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={biometricsEnabled} 
                onChange={(e) => handleToggle('biometricsEnabled', e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="control-row">
            <div className="control-info">
              <span className="control-title">Anlık Şüpheli İşlem Bildirimleri</span>
              <span className="control-desc">Farklı konum veya yüksek tutarlı harcamalarda SMS/Push uyarısı.</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={fraudAlertsEnabled} 
                onChange={(e) => handleToggle('fraudAlertsEnabled', e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">Günlük Maksimum Transfer Limiti (TL)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', marginTop: '8px' }}>
              <input 
                type="number" 
                className="form-input"
                placeholder={`Mevcut: ₺${dailyLimit.toLocaleString('tr-TR')}`}
                value={newLimitInput}
                onChange={(e) => setNewLimitInput(e.target.value)}
                style={{ flex: 1.6, margin: 0 }}
              />
              <button className="btn btn-primary" onClick={handleRequestLimitIncrease} style={{ flex: 1, whiteSpace: 'nowrap', display: 'flex', justifyContent: 'center' }}>
                Güncelle
              </button>
            </div>
            
            {limitStatusMsg && <div className="alert-message success" style={{ marginTop: '10px', padding: '10px' }}>{limitStatusMsg}</div>}
            {limitError && <div className="alert-message error" style={{ marginTop: '10px', padding: '10px' }}>{limitError}</div>}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
              <span>Mevcut Limit: ₺{dailyLimit.toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="widget-card full-width active-sessions-card">
          <div className="widget-header">
            <h3>Aktif Oturumlar & Cihaz Geçmişi</h3>
            <span>Toplam {activeSessions.length} Cihaz Bağlı</span>
          </div>

          <div className="sessions-list">
            {activeSessions.length === 0 && !loading && (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>
                Kayıtlı aktif oturum bulunamadı.
              </p>
            )}
            {activeSessions.map((session) => (
              <div key={session.id} className="session-item">
                <div className="device-icon">
                  {session.deviceType === 'WEB' ? '💻' : '📱'}
                </div>
                <div className="session-info">
                  <div className="session-device-name">
                    {session.device}
                    {session.isCurrent && <span className="current-badge">Bu Cihaz</span>}
                  </div>
                  <div className="session-meta">
                    <span>IP: {session.ip}</span> • <span>{session.location}</span> • <span>{session.browser}</span>
                  </div>
                </div>
                <div className="session-time">
                  {session.time}
                </div>
                {!session.isCurrent && (
                  <button 
                    className="btn-danger-sm" 
                    onClick={() => handleTerminateSession(session.id)}
                  >
                    Oturumu Kapat
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OTP Modal for Limit Increase */}
      {showLimitOtpModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '10px', color: '#0f172a' }}>Limit Artırımı İçin Onay</h3>
            <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '14px' }}>
              Güvenliğiniz için limit artırım taleplerinde doğrulama gereklidir. Lütfen e-postanıza gönderilen onay kodunu giriniz.
            </p>
            
            {limitError && <div className="alert-message error" style={{ padding: '8px', marginBottom: '10px' }}>{limitError}</div>}

            <div className="form-group">
              <label className="form-label">6 HANELİ ONAY KODU</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="••••••"
                maxLength="6"
                value={limitOtp}
                onChange={(e) => setLimitOtp(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-success" onClick={handleVerifyLimitIncrease} disabled={limitOtp.length !== 6}>Onayla</button>
              <button className="btn btn-outline" onClick={() => { setShowLimitOtpModal(false); setLimitOtp(''); }}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityView;
