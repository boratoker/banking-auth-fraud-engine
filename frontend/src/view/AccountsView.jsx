import React, { useState } from 'react';

const AccountsView = () => {
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  const [internetAllowed, setInternetAllowed] = useState(true);
  const [overseasAllowed, setOverseasAllowed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const accounts = [
    { id: 1, name: 'Ana Vadesiz TL Hesabı', iban: 'TR32 0006 1000 0000 1234 5678 90', balance: 148250.75, currency: 'TRY', type: 'Vadesiz' },
    { id: 2, name: 'Büyüyen Vadeli Birikim', iban: 'TR32 0006 1000 0000 9876 5432 11', balance: 85000.00, currency: 'TRY', type: 'Vadeli (%48.5)' },
    { id: 3, name: 'USD Döviz Hesabı', iban: 'TR32 0006 1000 0000 4455 6677 88', balance: 4250.00, currency: 'USD', type: 'Döviz' },
    { id: 4, name: 'EUR Döviz Hesabı', iban: 'TR32 0006 1000 0000 1122 3344 55', balance: 1800.50, currency: 'EUR', type: 'Döviz' },
  ];

  const handleCopyIban = (iban, index) => {
    navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="view-container accounts-view">
      <div className="view-header">
        <h2>Hesaplarım & Sanal Kart Yönetimi</h2>
        <p>Banka hesaplarınızı inceleyin, kart limitlerinizi kontrol edin ve güvenlik kısıtlamalarını yönetin.</p>
      </div>

      <div className="accounts-layout">
        {/* Virtual Card Interactive Box */}
        <div className="card-management-section">
          <div className={`credit-card-visual ${isCardFrozen ? 'frozen' : ''}`}>
            <div className="card-top">
              <span className="card-brand-logo">ApexBank</span>
              <span className="card-type-tag">PLATINUM VIRTUAL</span>
            </div>

            <div className="card-chip-graphic">💳</div>

            <div className="card-number">
              {showCardDetails ? '4543 8912 0012 8819' : '4543 •••• •••• 8819'}
            </div>

            <div className="card-bottom">
              <div className="card-holder">
                <span className="label">KART SAHİBİ</span>
                <span className="val">BORA TOKER</span>
              </div>
              <div className="card-exp">
                <span className="label">SON KULLANMA</span>
                <span className="val">{showCardDetails ? '09/29' : '••/••'}</span>
              </div>
              <div className="card-cvv">
                <span className="label">CVV</span>
                <span className="val">{showCardDetails ? '492' : '•••'}</span>
              </div>
            </div>

            {isCardFrozen && (
              <div className="card-frozen-overlay">
                <span>🔒 KART DONDURULDU</span>
              </div>
            )}
          </div>

          {/* Card Controls */}
          <div className="card-controls-panel">
            <h3>Sanal Kart Güvenlik Ayarları</h3>
            
            <div className="control-row">
              <div className="control-info">
                <span className="control-title">Kart Bilgilerini Göster</span>
                <span className="control-desc">Kart numarası ve CVV kodunu ekranda açıklar.</span>
              </div>
              <button 
                className="btn-toggle-sm"
                onClick={() => setShowCardDetails(!showCardDetails)}
              >
                {showCardDetails ? 'Gizle' : 'Göster'}
              </button>
            </div>

            <div className="control-row">
              <div className="control-info">
                <span className="control-title">Kartı Geçici Dondur</span>
                <span className="control-desc">Tüm fiziki ve sanal harcamaları anında engeller.</span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={isCardFrozen} 
                  onChange={(e) => setIsCardFrozen(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="control-row">
              <div className="control-info">
                <span className="control-title">İnternet Alışverişi</span>
                <span className="control-desc">Online e-ticaret harcamalarına izin ver.</span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={internetAllowed} 
                  disabled={isCardFrozen}
                  onChange={(e) => setInternetAllowed(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="control-row">
              <div className="control-info">
                <span className="control-title">Yurt Dışı İşlemler</span>
                <span className="control-desc">Yurt dışı pos ve sitelerde kullanımı açar.</span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={overseasAllowed} 
                  disabled={isCardFrozen}
                  onChange={(e) => setOverseasAllowed(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        <div className="accounts-list-section">
          <h3>Banka Hesaplarım ({accounts.length})</h3>

          <div className="accounts-grid">
            {accounts.map((acc, index) => (
              <div key={acc.id} className="account-item-card">
                <div className="acc-header">
                  <span className="acc-type-pill">{acc.type}</span>
                  <span className="acc-currency">{acc.currency}</span>
                </div>
                <div className="acc-name">{acc.name}</div>
                <div className="acc-balance">
                  {acc.currency === 'TRY' && '₺'}
                  {acc.currency === 'USD' && '$'}
                  {acc.currency === 'EUR' && '€'}
                  {acc.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div className="acc-iban-wrapper">
                  <span className="acc-iban-text">{acc.iban}</span>
                  <button 
                    className="copy-iban-btn" 
                    onClick={() => handleCopyIban(acc.iban, index)}
                  >
                    {copiedIndex === index ? '✓ Kopyalandı' : 'Kopyala'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsView;
