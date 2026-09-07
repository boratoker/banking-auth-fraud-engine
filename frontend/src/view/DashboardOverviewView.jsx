import React, { useState, useEffect } from 'react';
import { getOverviewData } from '../api/bankingApi';

const DashboardOverviewView = ({ userName, onNavigate }) => {
  const [showBalances, setShowBalances] = useState(true);
  const [overview, setOverview] = useState({

    recentTransactions: [
      { id: 1, title: 'Migros Sanal Market', date: 'Bugün, 14:22', amount: -482.50, category: 'Alışveriş', risk: 'Safe', riskScore: '1%' },
      { id: 2, title: 'Gelen Transfer - Ahmet Yıl.', date: 'Bugün, 11:05', amount: 3500.00, category: 'FAST Transfer', risk: 'Safe', riskScore: '0%' },
      { id: 3, title: 'Netflix Abonelik', date: 'Dün, 22:15', amount: -199.99, category: 'Eğlence', risk: 'Safe', riskScore: '2%' },
      { id: 4, title: 'Shell Yakıt Alımı', date: '05 Eylül, 18:40', amount: -1250.00, category: 'Ulaşım', risk: 'Safe', riskScore: '3%' },
    ]
  });

  useEffect(() => {
    getOverviewData()
      .then(res => {
        if (res.data) setOverview(prev => ({ ...prev, ...res.data }));
      })
      .catch(() => { });
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);
  };

  return (
    <div className="view-container overview-view">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h1>Hoş geldin, {userName || 'Değerli Müşterimiz'} 👋</h1>
          <p>Hesap durumunuz ve güvenlik özetiniz günceldir. Son oturum: İstanbul, Türkiye (Bu Cihaz)</p>
        </div>
        <button
          className="toggle-balance-btn"
          onClick={() => setShowBalances(!showBalances)}
        >
          {showBalances ? '👁️ Bakiyeleri Gizle' : '👁️‍🗨️ Bakiyeleri Göster'}
        </button>
      </div>

      {/* Main Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="card-header">
            <span className="card-title">Toplam Varlık</span>
            <span className="card-chip">Vadesiz TL</span>
          </div>
          <div className="card-value">
            {showBalances ? formatCurrency(overview.totalBalance) : '•••••••• ₺'}
          </div>
          <div className="card-footer">
            <span className="badge positive">+₺12,500.00 bu ay</span>
            <span className="account-iban">TR32 0006 1000 0000 1234 5678 90</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">Birikim Hesabı (Vadeli)</span>
            <span className="card-chip">%48.5 Faiz</span>
          </div>
          <div className="card-value">
            {showBalances ? formatCurrency(overview.savingsBalance) : '•••••••• ₺'}
          </div>
          <div className="card-footer">
            <span className="footer-meta">Vade Sonu: 18 Ekim 2026</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="card-header">
            <span className="card-title">Platinum Kredi Kartı</span>
            <span className="card-chip">Limit: ₺100.000</span>
          </div>
          <div className="card-value">
            {showBalances ? formatCurrency(overview.creditCardSpent) : '•••••••• ₺'}
          </div>
          <div className="card-footer">
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: '28%' }}></div>
            </div>
            <span className="footer-meta">Kullanılabilir Limit: ₺{(overview.creditCardLimit - overview.creditCardSpent).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Security & Fraud Engine Widget Section */}
      <div className="dashboard-grid">
        {/* Fraud Protection Widget */}
        <div className="widget-card fraud-widget">
          <div className="widget-header">
            <div className="widget-title">
              <span className="widget-icon">🛡️</span>
              <h3>AI Fraud Shield & Güvenlik Analizi</h3>
            </div>
            <span className="live-pill">CANLI İZLEME</span>
          </div>

          <div className="fraud-widget-content">
            <div className="score-ring-container">
              <div className="score-ring">
                <span className="score-number">{overview.riskScore || 98}</span>
                <span className="score-max">/100</span>
              </div>
              <div className="score-info">
                <h4>Güvenlik Durumu: Mükemmel</h4>
                <p>Hesabınızda herhangi bir şüpheli girişim tespit edilmedi.</p>
              </div>
            </div>

            <div className="security-checks-list">
              <div className="check-item verified">
                <span className="check-icon">✓</span>
                <span className="check-text">Cihaz Parmak İzi: Tanımlı macOS (MacBook Pro)</span>
              </div>
              <div className="check-item verified">
                <span className="check-icon">✓</span>
                <span className="check-text">Konum Analizi: İstanbul, TR (Olağan Konum)</span>
              </div>
              <div className="check-item verified">
                <span className="check-icon">✓</span>
                <span className="check-text">Behavioral Biometrics: İki Faktörlü OTP Doğrulandı</span>
              </div>
            </div>
          </div>

          <div className="widget-action">
            <button className="btn-link" onClick={() => onNavigate('security')}>
              Güvenlik Loglarını İncele →
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="widget-card quick-actions-widget">
          <div className="widget-header">
            <h3>Hızlı Bankacılık İşlemleri</h3>
          </div>
          <div className="quick-actions-grid">
            <button className="action-tile" onClick={() => onNavigate('transfer')}>
              <span className="tile-icon">💸</span>
              <span className="tile-title">FAST Transfer</span>
              <span className="tile-sub">Anında Para Gönder</span>
            </button>

            <button className="action-tile" onClick={() => onNavigate('accounts')}>
              <span className="tile-icon">💳</span>
              <span className="tile-title">Kart Kontrolü</span>
              <span className="tile-sub">Limit & Dondurma</span>
            </button>

            <button className="action-tile" onClick={() => onNavigate('security')}>
              <span className="tile-icon">🔑</span>
              <span className="tile-title">Güvenlik Ayarları</span>
              <span className="tile-sub">2FA & Şifre Değiştir</span>
            </button>

            <button className="action-tile" onClick={() => onNavigate('transactions')}>
              <span className="tile-icon">🧾</span>
              <span className="tile-title">Hesap Özeti</span>
              <span className="tile-sub">Dekont & Raporlar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="widget-card full-width">
        <div className="widget-header">
          <h3>Son İşlemler & Güvenlik Doğrulaması</h3>
          <button className="btn-secondary-sm" onClick={() => onNavigate('transactions')}>
            Tümünü Gör
          </button>
        </div>

        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>İşlem Adı</th>
                <th>Kategori</th>
                <th>Tarih</th>
                <th>Fraud Risk Analizi</th>
                <th className="text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <div className="tx-title-wrapper">
                      <span className="tx-icon">{tx.amount < 0 ? '↗️' : '↙️'}</span>
                      <span className="tx-title">{tx.title}</span>
                    </div>
                  </td>
                  <td><span className="tx-category">{tx.category}</span></td>
                  <td><span className="tx-date">{tx.date}</span></td>
                  <td>
                    <span className="risk-tag safe">
                      🛡️ %{tx.riskScore} Risk (Güvenli)
                    </span>
                  </td>
                  <td className={`text-right tx-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                    {tx.amount > 0 ? `+${tx.amount.toFixed(2)} ₺` : `${tx.amount.toFixed(2)} ₺`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverviewView;
