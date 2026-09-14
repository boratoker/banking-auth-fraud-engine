import React, { useState, useEffect } from 'react';
import { getAccounts, getCardDetails, toggleCardFreeze, toggleCardSetting } from '../api/bankingApi';

const AccountsView = () => {
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useEffect(() => {
    getAccounts()
      .then(res => setAccounts(res.data || []))
      .catch(() => {});

    getCardDetails()
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          setCards(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleNextCard = () => {
    setActiveCardIndex((prev) => (prev + 1) % cards.length);
    setShowCardDetails(false);
  };

  const handlePrevCard = () => {
    setActiveCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setShowCardDetails(false);
  };

  const handleFreezeToggle = async (checked) => {
    const activeCard = cards[activeCardIndex];
    if (!activeCard) return;

    // Optimistic update
    const updatedCards = [...cards];
    updatedCards[activeCardIndex] = { ...activeCard, isFrozen: checked };
    setCards(updatedCards);

    try {
      await toggleCardFreeze(activeCard.id, checked);
    } catch (e) {
      // Revert if error
      updatedCards[activeCardIndex] = { ...activeCard, isFrozen: !checked };
      setCards(updatedCards);
    }
  };

  const handleSettingToggle = async (key, value) => {
    const activeCard = cards[activeCardIndex];
    if (!activeCard) return;

    // Optimistic update
    const updatedCards = [...cards];
    updatedCards[activeCardIndex] = { ...activeCard, [key]: value };
    setCards(updatedCards);

    try {
      const res = await toggleCardSetting(activeCard.id, key, value);
      if (res.data && Array.isArray(res.data)) {
        setCards(res.data);
      }
    } catch (e) {
       updatedCards[activeCardIndex] = { ...activeCard, [key]: !value };
       setCards(updatedCards);
    }
  };

  const handleCopyIban = (iban, index) => {
    navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const activeCard = cards[activeCardIndex];

  return (
    <div className="view-container accounts-view">
      <div className="view-header">
        <h2>Kartlarım & Hesaplarım</h2>
        <p>Tüm kartlarınızı tek ekrandan yönetin, hesap bakiyelerinizi kontrol edin.</p>
      </div>

      <div className="accounts-layout">
        {/* CARDS SECTION (Slideshow + Controls) */}
        <div className="card-management-section">
          
          {cards.length > 0 ? (
            <div className="card-slideshow-container">
              {cards.length > 1 && (
                <button className="slideshow-btn prev" onClick={handlePrevCard}>&#10094;</button>
              )}
              
              <div className={`credit-card-visual card-${activeCard.type.toLowerCase()} ${activeCard.isFrozen ? 'frozen' : ''}`}>
                <div className="card-top">
                  <span className="card-brand-logo">TokerBank</span>
                  <span className="card-type-tag">{activeCard.type.replace('_', ' ')}</span>
                </div>

                <div className="card-chip-graphic">💳</div>

                <div className="card-number">
                  {showCardDetails ? activeCard.cardNumber.replace(/\*/g, Math.floor(Math.random() * 9)) : activeCard.cardNumber}
                </div>

                <div className="card-bottom">
                  <div className="card-holder">
                    <span className="label">KART SAHİBİ</span>
                    <span className="val">{activeCard.holder}</span>
                  </div>
                  <div className="card-exp">
                    <span className="label">SON KULLANMA</span>
                    <span className="val">{showCardDetails ? activeCard.expiry : '••/••'}</span>
                  </div>
                  <div className="card-cvv">
                    <span className="label">CVV</span>
                    <span className="val">{showCardDetails ? '492' : '•••'}</span>
                  </div>
                </div>

                {activeCard.isFrozen && (
                  <div className="card-frozen-overlay">
                    <span>🔒 KART DONDURULDU</span>
                  </div>
                )}
              </div>

              {cards.length > 1 && (
                <button className="slideshow-btn next" onClick={handleNextCard}>&#10095;</button>
              )}
            </div>
          ) : (
            <div className="no-cards-msg">Kayıtlı kartınız bulunmamaktadır.</div>
          )}

          {cards.length > 1 && (
            <div className="slideshow-dots">
               {cards.map((_, idx) => (
                 <span key={idx} className={`dot ${idx === activeCardIndex ? 'active' : ''}`} onClick={() => { setActiveCardIndex(idx); setShowCardDetails(false); }}></span>
               ))}
            </div>
          )}

          {/* Active Card Info & Limits (If Credit Card) */}
          {activeCard && activeCard.totalLimit !== null && (
            <div className="card-limits-panel">
               <div className="limit-row">
                  <span>Güncel Borç: <strong>₺{activeCard.currentSpent.toLocaleString()}</strong></span>
                  <span>Kalan Limit: <strong>₺{(activeCard.totalLimit - activeCard.currentSpent).toLocaleString()}</strong></span>
               </div>
               <div className="limit-bar">
                 <div className="limit-bar-fill" style={{ width: `${(activeCard.currentSpent / activeCard.totalLimit) * 100}%` }}></div>
               </div>
            </div>
          )}

          {/* Active Card Controls */}
          {activeCard && (
            <div className="card-controls-panel">
              <h3>{activeCard.type.replace('_', ' ')} Ayarları</h3>

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
                    checked={activeCard.isFrozen}
                    onChange={(e) => handleFreezeToggle(e.target.checked)}
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
                    checked={activeCard.internetAllowed}
                    disabled={activeCard.isFrozen}
                    onChange={(e) => handleSettingToggle('internetAllowed', e.target.checked)}
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
                    checked={activeCard.overseasAllowed}
                    disabled={activeCard.isFrozen}
                    onChange={(e) => handleSettingToggle('overseasAllowed', e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ACCOUNTS SECTION */}
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
            {accounts.length === 0 && <p className="no-data-msg">Kayıtlı hesap bulunamadı.</p>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AccountsView;
