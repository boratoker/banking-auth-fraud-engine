import React from 'react';
import tokerbankLogo from '../assets/tokerbank-logo.png';

const Navbar = ({ userName, email, onLogout, userRiskScore = 98 }) => {
  const maskEmail = (str) => {
    if (!str || !str.includes('@')) return str;
    const [user, domain] = str.split('@');
    const maskedUser = user.length > 2 ? user.slice(0, 2) + '***' : user + '***';
    return `${maskedUser}@${domain}`;
  };

  return (
    <header className="dashboard-navbar">
      <div className="navbar-brand">
        <img src={tokerbankLogo} alt="TokerBank Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
        <div className="brand-text">
          <span className="brand-title">TokerBank</span>
          <span className="brand-subtitle">Auth & Fraud Shield</span>
        </div>
      </div>

      <div className="navbar-search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Hesap, transfer veya işlem ara..."
          className="search-input"
        />
      </div>

      <div className="navbar-right">
        {/* Real-time Fraud Engine Status Badge */}
        <div className="fraud-status-badge tooltip" title="Canlı yapay zeka dolandırıcılık koruması aktif">
          <span className="pulse-dot"></span>
          <span className="status-label">Fraud Shield Active</span>
          <span className="score-pill">{userRiskScore}/100</span>
        </div>

        {/* User Info & Profile */}
        <div className="user-profile-badge">
          <div className="user-avatar">
            {(userName || email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{userName || 'Kullanıcı'}</span>
            <span className="user-email">{maskEmail(email)}</span>
          </div>
        </div>

        <button className="logout-btn" onClick={onLogout} title="Çıkış Yap">
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Çıkış</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
