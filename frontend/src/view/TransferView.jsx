import React, { useState } from 'react';
import { submitTransfer, verifyTransferOtp } from '../api/bankingApi';

const TransferView = () => {
  const [recipientIban, setRecipientIban] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('TR320006100000001234567890');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fraud Modal State
  const [showFraudModal, setShowFraudModal] = useState(false);
  const [fraudModalData, setFraudModalData] = useState(null);
  const [modalOtpInput, setModalOtpInput] = useState('');

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    const numericAmount = parseFloat(amount);

    try {
      // Backend REST API Request to Banking & AI Fraud Engine
      const res = await submitTransfer({
        selectedAccount,
        recipientIban,
        recipientName,
        amount: numericAmount,
        description
      });

      setLoading(false);
      const data = res.data;

      if (data.requiresOtp || data.riskLevel === 'HIGH') {
        // High amount/risk triggers Fraud Engine verification modal
        setFraudModalData({
          riskLevel: data.riskLevel,
          riskScore: data.riskScore || 68,
          reason: data.reason || 'Yüksek tutarlı transfer (₺10,000+) ve ek güvenlik kuralı.',
          amount: numericAmount,
          recipient: recipientName || 'Alıcı',
          iban: recipientIban
        });
        setShowFraudModal(true);
      } else {
        // Standard normal amount approved
        setSuccessMsg(data.message || `✅ ₺${numericAmount.toLocaleString('tr-TR')} tutarındaki FAST transferiniz AI Fraud Shield tarafından onaylandı.`);
        setAmount('');
        setRecipientIban('');
        setRecipientName('');
        setDescription('');
      }
    } catch (err) {
      // Graceful fallback if backend API is not responding
      setLoading(false);
      if (numericAmount >= 10000) {
        setFraudModalData({
          riskLevel: 'HIGH',
          riskScore: 68,
          reason: 'Yüksek tutarlı transfer (₺10,000+) ve daha önce işlem yapılmamış yeni IBAN.',
          amount: numericAmount,
          recipient: recipientName || 'Alıcı',
          iban: recipientIban
        });
        setShowFraudModal(true);
      } else {
        setSuccessMsg(`✅ ₺${numericAmount.toLocaleString('tr-TR')} tutarındaki FAST transferiniz AI Fraud Shield tarafından onaylandı.`);
        setAmount('');
        setRecipientIban('');
        setRecipientName('');
        setDescription('');
      }
    }
  };

  const handleConfirmFraudOtp = async () => {
    if (!modalOtpInput || modalOtpInput.trim().length !== 6) {
      alert('Lütfen 6 haneli doğrulama kodunu giriniz (Örnek: 123456).');
      return;
    }

    try {
      const res = await verifyTransferOtp({
        otp: modalOtpInput,
        amount: fraudModalData.amount,
        recipient: fraudModalData.recipient
      });

      setShowFraudModal(false);
      setModalOtpInput('');
      setSuccessMsg(res.data.message || `✅ Güvenlik OTP doğrulandı! ₺${fraudModalData.amount.toLocaleString('tr-TR')} tutarındaki transferiniz güvenle alıcıya iletildi.`);
      setAmount('');
      setRecipientIban('');
      setRecipientName('');
      setDescription('');
    } catch (err) {
      if (modalOtpInput === '123456') {
        setShowFraudModal(false);
        setModalOtpInput('');
        setSuccessMsg(`✅ Güvenlik OTP doğrulandı! ₺${fraudModalData.amount.toLocaleString('tr-TR')} tutarındaki transferiniz güvenle alıcıya iletildi.`);
        setAmount('');
        setRecipientIban('');
        setRecipientName('');
        setDescription('');
      } else {
        alert(err.response?.data?.error || 'Geçersiz OTP Kodu. Lütfen 123456 deneyiniz.');
      }
    }
  };

  const savedContacts = [
    { name: 'Ahmet Yılmaz', iban: 'TR32 0006 1000 0000 5544 3322 11' },
    { name: 'Ayşe Kaya', iban: 'TR32 0006 1000 0000 9988 7766 55' },
    { name: 'Mehmet Demir', iban: 'TR32 0006 1000 0000 1111 2222 33' },
  ];

  return (
    <div className="view-container transfer-view">
      <div className="view-header">
        <h2>Para Transferi & FAST (7/24)</h2>
        <p>IBAN veya Kolay Adres ile anında para gönderin. Tüm işlemler yapay zeka fraud motoru ile taranır.</p>
      </div>

      {successMsg && <div className="alert-message success">{successMsg}</div>}
      {errorMsg && <div className="alert-message error">{errorMsg}</div>}

      <div className="transfer-layout">
        {/* Form */}
        <div className="widget-card transfer-form-card">
          <h3>Transfer Bilgileri</h3>
          <form onSubmit={handleTransferSubmit}>
            <div className="form-group">
              <label className="form-label">Gönderen Hesap</label>
              <select
                className="form-input"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <option value="TR320006100000001234567890">
                  Ana Vadesiz TL Hesabı (Bakiye: ₺148,250.75)
                </option>
                <option value="TR320006100000009876543211">
                  Büyüyen Vadeli Birikim (Bakiye: ₺85,000.00)
                </option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Alıcı IBAN</label>
              <input
                type="text"
                className="form-input"
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                value={recipientIban}
                onChange={(e) => setRecipientIban(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Alıcı Adı Soyadı</label>
              <input
                type="text"
                className="form-input"
                placeholder="Örn: Ahmet Yılmaz"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tutar (TL)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="any"
                required
              />
              <span className="field-hint">
                💡 ₺10,000 üzerindeki transferlerde AI Fraud Engine otomatik ek doğrulama isteyebilir.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Açıklama</label>
              <input
                type="text"
                className="form-input"
                placeholder="Örn: Kira Ödemesi / Borç"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'AI Fraud Taraması Yapılıyor...' : 'Para Gönder (FAST)'}
            </button>
          </form>
        </div>

        {/* Saved Contacts & Fraud Info Panel */}
        <div className="transfer-sidebar-panel">
          <div className="widget-card">
            <h3>Kayıtlı Kişiler</h3>
            <div className="contacts-list">
              {savedContacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="contact-item"
                  onClick={() => {
                    setRecipientName(contact.name);
                    setRecipientIban(contact.iban);
                  }}
                >
                  <div className="contact-avatar">{contact.name.charAt(0)}</div>
                  <div className="contact-details">
                    <span className="contact-name">{contact.name}</span>
                    <span className="contact-iban">{contact.iban}</span>
                  </div>
                  <span className="select-arrow">➔</span>
                </div>
              ))}
            </div>
          </div>

          <div className="widget-card fraud-shield-info-box">
            <div className="shield-header">
              <span className="shield-icon">🛡️</span>
              <h4>Toker AI Fraud Protection</h4>
            </div>
            <p>
              TokerBank, tüm FAST ve EFT işlemlerini anlık davranışsal biyometri, cihaz lokasyonu ve yapay zeka risk algoritmaları ile tarar.
            </p>
          </div>
        </div>
      </div>

      {/* Fraud Verification Modal */}
      {showFraudModal && (
        <div className="modal-backdrop">
          <div className="modal-card fraud-alert-modal">
            <div className="modal-header warning">
              <span className="modal-icon">⚠️</span>
              <h3>AI Fraud Shield Güvenlik Uyarısı</h3>
            </div>
            <div className="modal-body">
              <div className="risk-score-badge high">
                Risk Skoru: %{fraudModalData.riskScore} (Şüpheli / Yüksek Tutar)
              </div>
              <p className="risk-reason">
                <strong>Sebep:</strong> {fraudModalData.reason}
              </p>

              <div className="transfer-summary-box">
                <div><strong>Alıcı:</strong> {fraudModalData.recipient}</div>
                <div><strong>IBAN:</strong> {fraudModalData.iban}</div>
                <div><strong>Tutar:</strong> ₺{fraudModalData.amount.toLocaleString('tr-TR')}</div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">SMS 6-Haneli Doğrulama Kodu</label>
                <input
                  type="text"
                  className="form-input otp-input"
                  placeholder="123456"
                  maxLength="6"
                  value={modalOtpInput}
                  onChange={(e) => setModalOtpInput(e.target.value)}
                />
                <span className="field-hint">Test Kodu: 123456</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFraudModal(false)}>
                İşlemi İptal Et
              </button>
              <button className="btn btn-primary" onClick={handleConfirmFraudOtp}>
                Güvenle Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferView;
