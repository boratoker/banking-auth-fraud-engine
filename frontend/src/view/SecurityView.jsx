import React, { useState } from 'react';

const SecurityView = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [fraudAlertsEnabled, setFraudAlertsEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(50000);

  const [activeSessions, setActiveSessions] = useState([
    { id: 1, device: 'MacBook Pro (macOS 15.1)', ip: '185.12.94.102', location: 'İstanbul, Türkiye', browser: 'Chrome 128.0', isCurrent: true, time: 'Aktif Oturum' },
    { id: 2, device: 'iPhone 15 Pro (iOS 18)', ip: '212.156.40.18', location: 'İstanbul, Türkiye', browser: 'Mobile Safari', isCurrent: false, time: '3 saat önce' },
    { id: 3, device: 'Windows Desktop', ip: '88.241.12.50', location: 'Ankara, Türkiye', browser: 'Edge 126.0', isCurrent: false, time: 'Dün, 19:40' },
  ]);

  const handleTerminateSession = (id) => {
    setActiveSessions(activeSessions.filter(s => s.id !== id));
  };

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
            <span className="risk-level-badge safe">GÜVENLİ (%2 Risk)</span>
          </div>

          <div className="risk-metrics-row">
            <div className="metric-box">
              <span className="metric-label">Cihaz Parmak İzi</span>
              <span className="metric-val text-success">Eşleşti (Güvenilir)</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Statik / Dinamik IP</span>
              <span className="metric-val">185.12.94.102</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Giriş Metodu</span>
              <span className="metric-val">OTP + Email Verified</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Anomalı Skoru</span>
              <span className="metric-val text-success">0.02 (Çok Düşük)</span>
            </div>
          </div>
        </div>

        {/* Security Preferences */}
        <div className="widget-card security-settings-card">
          <h3>Güvenlik Tercihleri & İzinler</h3>

          <div className="control-row">
            <div className="control-info">
              <span className="control-title">İki Faktörlü Doğrulama (2FA / OTP)</span>
              <span className="control-desc">Her girişte e-posta veya SMS ile 6 haneli kod istenir.</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={twoFactorEnabled} 
                onChange={(e) => setTwoFactorEnabled(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="control-row">
            <div className="control-info">
              <span className="control-title">Biyometrik / Passkey Girişi</span>
              <span className="control-desc">TouchID / FaceID ile şifresiz güvenli oturum açma.</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={biometricsEnabled} 
                onChange={(e) => setBiometricsEnabled(e.target.checked)} 
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
                onChange={(e) => setFraudAlertsEnabled(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">Günlük Maksimum Transfer Limiti (TL)</label>
            <input 
              type="range" 
              min="5000" 
              max="200000" 
              step="5000"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '14px', fontWeight: 'bold' }}>
              <span>Mevcut Limit: ₺{dailyLimit.toLocaleString('tr-TR')}</span>
              <span>Maks: ₺200,000</span>
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
            {activeSessions.map((session) => (
              <div key={session.id} className="session-item">
                <div className="device-icon">
                  {session.device.includes('MacBook') || session.device.includes('Windows') ? '💻' : '📱'}
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
    </div>
  );
};

export default SecurityView;
