import React, { useState, useEffect, useRef } from 'react';
import { submitTransfer, verifyTransferOtp, getContacts, getTransferStatus, getAccounts } from '../api/bankingApi';
import tokerbankLogo from '../assets/tokerbank-logo.png';
import { RiskBadge } from '../utils/riskUtils';
import { hasEnrolledKey, signPayload } from '../utils/CryptoService';

const TransferView = ({ initialRecipient = '', initialIban = '' }) => {
  const [recipientIban, setRecipientIban] = useState(initialIban || '');
  const [recipientName, setRecipientName] = useState(initialRecipient || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('TR320006100000001234567890');

  useEffect(() => {
    if (initialIban) setRecipientIban(initialIban);
    if (initialRecipient) setRecipientName(initialRecipient);
  }, [initialRecipient, initialIban]);

  const [myAccounts, setMyAccounts] = useState([]);

  useEffect(() => {
    getAccounts()
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setMyAccounts(res.data);
          setSelectedAccount(res.data[0].id);
        }
      })
      .catch(err => console.error('Failed to fetch accounts', err));
  }, []);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Push Challenge State
  const [pushWaiting, setPushWaiting] = useState(false);
  const [pushData, setPushData] = useState(null);
  const pollRef = useRef(null);

  // Fraud Modal State (Critical 2nd step: OTP)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpModalData, setOtpModalData] = useState(null);
  const [modalOtpInput, setModalOtpInput] = useState('');

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Start polling for transaction status after push challenge
  const startPolling = (transactionId, isCritical) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await getTransferStatus(transactionId);
        const status = res.data.status;

        if (status === 'COMPLETED') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPushWaiting(false);
          setPushData(null);
          setSuccessMsg('📱 Mobil cihaz onayı doğrulandı! İşleminiz güvenle alıcıya iletildi.');
          clearForm();
        } else if (status === 'REJECTED') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPushWaiting(false);
          setPushData(null);
          setErrorMsg('📱 İşlem mobil cihazınızdan reddedildi.');
        } else if (status === 'OTP_CHALLENGED' && isCritical) {
          // Critical flow: Push approved, now need OTP
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPushWaiting(false);
          setPushData(null);
          setOtpModalData({ transactionId, riskLevel: 'CRITICAL' });
          setShowOtpModal(true);
        }
      } catch (err) {
        // Keep polling on network errors
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    const numericAmount = parseFloat(amount);

    try {
      let signature = null;

      // Kriptografik İmza (Transaction Signing) Akışı
      if (hasEnrolledKey()) {
        const rawPayload = `IBAN:${recipientIban},AMOUNT:${numericAmount},DESC:${description}`;
        const signRes = await signPayload(rawPayload);
        if (signRes.success) {
          signature = signRes.signature;
          console.log("İşlem WebCrypto ile imzalandı!");
        } else {
          setErrorMsg("İmzalama hatası: " + signRes.error);
          setLoading(false);
          return;
        }
      }

      const res = await submitTransfer({
        selectedAccount,
        recipientIban,
        recipientName,
        amount: numericAmount,
        description,
        signature // Kriptografik imzayı (varsa) gönder
      });

      setLoading(false);
      const data = res.data;

      if (data.requiresPush) {
        // Push Challenge: Show waiting screen and start polling
        const isCritical = data.status === 'CRITICAL_PUSH_CHALLENGED';
        setPushData({
          transactionId: data.transactionId,
          riskLevel: data.riskLevel,
          riskScore: data.riskScore,
          reason: data.reason,
          amount: numericAmount,
          recipient: recipientName || 'Alıcı',
          iban: recipientIban,
          isCritical
        });
        setPushWaiting(true);
        startPolling(data.transactionId, isCritical);
      } else {
        // Standard safe transfer
        setSuccessMsg(data.message || `✅ ₺${numericAmount.toLocaleString('tr-TR')} tutarındaki FAST transferiniz AI Fraud Shield tarafından onaylandı.`);
        clearForm();
      }
    } catch (err) {
      setLoading(false);

      if (err.response && err.response.status === 403) {
        const msg = err.response.data.error || 'İşleminiz güvenlik nedeniyle bloke edildi.';
        setErrorMsg(msg);
        window.alert('Güvenlik Uyarısı: ' + msg);
        return;
      }

      if (err.response && err.response.status === 400) {
        const msg = err.response.data.error || 'İşlem gerçekleştirilemedi.';
        setErrorMsg(msg);
        window.alert('İşlem Hatası: ' + msg);
        return;
      }

      setErrorMsg('Sunucu ile bağlantı kurulamadı. Lütfen tekrar deneyin.');
      window.alert('Hata: Sunucu ile bağlantı kurulamadı. Lütfen tekrar deneyin.');
    }
  };

  const handleConfirmOtp = async () => {
    if (!modalOtpInput || modalOtpInput.trim().length !== 6) {
      alert('Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }

    try {
      const res = await verifyTransferOtp({
        otp: modalOtpInput,
        transactionId: otpModalData.transactionId
      });

      setShowOtpModal(false);
      setModalOtpInput('');
      setOtpModalData(null);
      setSuccessMsg(res.data.message || '✅ Güvenlik OTP doğrulandı! İşleminiz güvenle alıcıya iletildi.');
      clearForm();
    } catch (err) {
      alert(err.response?.data?.error || 'Geçersiz OTP Kodu.');
    }
  };

  const handleCancelPush = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPushWaiting(false);
    setPushData(null);
    setErrorMsg('İşlem iptal edildi.');
  };

  const clearForm = () => {
    setAmount('');
    setRecipientIban('');
    setRecipientName('');
    setDescription('');
  };

  const [savedContacts, setSavedContacts] = useState([]);

  useEffect(() => {
    getContacts()
      .then(res => {
        if (Array.isArray(res.data)) {
          setSavedContacts(res.data);
        }
      })
      .catch(err => console.error('Failed to fetch contacts', err));
  }, []);

  // =================== PUSH WAITING SCREEN ===================
  if (pushWaiting && pushData) {
    return (
      <div className="view-container transfer-view">
        <div className="push-waiting-screen">
          <div className="push-waiting-card">
            <div className="push-phone-animation">
              <div className="phone-icon-wrapper">
                <span className="phone-icon">📱</span>
                <span className="phone-pulse"></span>
                <span className="phone-pulse delay"></span>
              </div>
            </div>

            <h2 className="push-title">Mobil Cihaz Onayı Bekleniyor</h2>
            <p className="push-subtitle">
              {pushData.isCritical
                ? 'Kritik risk seviyesi! Önce mobil cihazınızdan onaylayın, ardından e-posta OTP doğrulaması istenecektir.'
                : 'Lütfen telefonunuzdaki TokerBank uygulamasından işlemi onaylayın.'
              }
            </p>

            <div className="push-transfer-details">
              <div className="push-detail-row">
                <span className="push-detail-label">Alıcı</span>
                <span className="push-detail-value">{pushData.recipient}</span>
              </div>
              <div className="push-detail-row">
                <span className="push-detail-label">IBAN</span>
                <span className="push-detail-value">{pushData.iban}</span>
              </div>
              <div className="push-detail-row">
                <span className="push-detail-label">Tutar</span>
                <span className="push-detail-value push-amount">₺{pushData.amount.toLocaleString('tr-TR')}</span>
              </div>
              <div className="push-detail-row">
                <span className="push-detail-label">Risk</span>
                <span className="push-detail-value">
                  <RiskBadge riskLevel={pushData.riskLevel} riskScore={pushData.riskScore} />
                </span>
              </div>
            </div>

            {pushData.isCritical && (
              <div className="push-critical-badge">
                🔴 2 Aşamalı Doğrulama: Mobil Onay + E-Posta OTP
              </div>
            )}

            <div className="push-loading-dots">
              <span></span><span></span><span></span>
            </div>

            <button className="btn btn-secondary push-cancel-btn" onClick={handleCancelPush}>
              İşlemi İptal Et
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =================== MAIN TRANSFER FORM ===================
  return (
    <div className="view-container transfer-view">
      <div className="view-header">
        <h2>Para Transferi & FAST (7/24)</h2>
        <p>IBAN veya Kolay Adres ile anında para gönderin. Tüm işlemler yapay zeka fraud motoru ile taranır.</p>
      </div>

      {successMsg && (
        <div className="modal-backdrop">
          <div className="modal-card success-modal" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '72px' }}>✅</span>
            </div>
            <h3 style={{ color: '#10b981', marginBottom: '16px', fontSize: '24px' }}>Transfer Başarılı</h3>
            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5', fontSize: '15px' }}>
              {successMsg}
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSuccessMsg('')}>
              Tamam
            </button>
          </div>
        </div>
      )}
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
                {myAccounts.length > 0 ? (
                  myAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Bakiye: ₺{acc.balance.toLocaleString('tr-TR')}) - {acc.iban}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="TR320006100000001234567890">
                      Ana Vadesiz TL Hesabı (Bakiye: ₺148,250.75)
                    </option>
                    <option value="TR320006100000009876543211">
                      Büyüyen Vadeli Birikim (Bakiye: ₺85,000.00)
                    </option>
                  </>
                )}
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
                💡 AI Fraud Engine risk skoru yüksek bulursa mobil cihaz onayı istenecektir.
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
              <img src={tokerbankLogo} alt="Logo" style={{ width: 22, height: 22, objectFit: 'contain', marginRight: 8 }} />
              <h4>Toker AI Fraud Protection</h4>
            </div>
            <p>
              TokerBank, tüm FAST ve EFT işlemlerini anlık davranışsal biyometri, cihaz lokasyonu ve yapay zeka risk algoritmaları ile tarar.
            </p>
          </div>
        </div>
      </div>

      {/* Critical OTP Modal (2nd step after Push approval) */}
      {showOtpModal && (
        <div className="modal-backdrop">
          <div className="modal-card fraud-alert-modal">
            <div className="modal-header warning">
              <span className="modal-icon">🔴</span>
              <h3>Critical: E-Posta OTP Doğrulama (2. Aşama)</h3>
            </div>
            <div className="modal-body">
              <p className="risk-reason">
                Mobil cihaz onayınız alınmıştır. Kritik risk seviyesi nedeniyle ek olarak e-posta adresinize gönderilen 6 haneli doğrulama kodunu giriniz.
              </p>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">E-posta 6-Haneli Doğrulama Kodu</label>
                <input
                  type="text"
                  className="form-input otp-input"
                  placeholder="123456"
                  maxLength="6"
                  value={modalOtpInput}
                  onChange={(e) => setModalOtpInput(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowOtpModal(false); setModalOtpInput(''); }}>
                İşlemi İptal Et
              </button>
              <button className="btn btn-primary" onClick={handleConfirmOtp}>
                OTP Doğrula & Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferView;
