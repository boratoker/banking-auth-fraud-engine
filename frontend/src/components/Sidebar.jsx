import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Genel Özet', icon: '📊' },
    { id: 'accounts', label: 'Hesaplarım & Kartlar', icon: '💳' },
    { id: 'transfer', label: 'Para Transferi (FAST)', icon: '💸' },
    { id: 'security', label: 'Güvenlik & Risk Merkezi', icon: '🔒', badge: 'AI Active' },
    { id: 'transactions', label: 'İşlem Geçmişi', icon: '🧾' },
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
          </button>
        ))}
      </div>

      <div className="sidebar-footer-card">
        <div className="footer-card-header">
          <span className="shield-icon">🛡️</span>
          <span>Fraud Engine v2.4</span>
        </div>
        <p className="footer-card-desc">
          İşlemleriniz 256-bit şifreleme ve makine öğrenimi risk tespiti ile korunmaktadır.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
