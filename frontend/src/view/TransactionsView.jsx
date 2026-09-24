import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api/bankingApi';
import tokerbankLogo from '../assets/tokerbank-logo.png';
import { normalizeTurkish } from '../utils/textUtils';
import { RiskBadge, getRiskBadgeInfo, parseRiskScore } from '../utils/riskUtils';
import { enrollDevice, verifySignature } from '../api/signingApi';
import { generateAndEnrollKeyPair, hasEnrolledKey, signPayload } from '../utils/CryptoService';

const TransactionsView = ({ initialSearchTerm = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  const [allTransactions, setAllTransactions] = useState([]);
  
  // Transaction Signing State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferIban, setTransferIban] = useState('');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [signingLog, setSigningLog] = useState([]);

  useEffect(() => {
    setIsEnrolled(hasEnrolledKey());
  }, []);

  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm || '');
    }
  }, [initialSearchTerm]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);
  };

  useEffect(() => {
    getTransactions()
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) setAllTransactions(res.data);
      })
      .catch(() => {});
  }, []);

  const filteredTransactions = allTransactions.filter((tx) => {
    const q = normalizeTurkish(searchTerm);
    const matchesSearch = !q || 
                          normalizeTurkish(tx.title).includes(q) || 
                          normalizeTurkish(tx.category).includes(q);
    
    const riskInfo = getRiskBadgeInfo(tx.risk, tx.riskScore);
    const matchesRisk = selectedRisk === 'ALL' || riskInfo.level === selectedRisk;

    return matchesSearch && matchesRisk;
  });

  const handleEnrollDevice = async () => {
    try {
      let user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Fallback to demo user UUID
      const userStr = localStorage.getItem('user');
      if (userStr) {
         user = JSON.parse(userStr);
      }

      const result = await generateAndEnrollKeyPair();
      if (result.success) {
        await enrollDevice(user.id, result.publicKey, "Web Tarayıcı");
        setIsEnrolled(true);
        alert("Cihazınız kriptografik işlem imzalama (WebCrypto) için başarıyla kaydedildi!");
      } else {
        alert("Hata: " + result.error);
      }
    } catch (err) {
      alert("Sunucu hatası: " + err.message);
    }
  };

  const handleSignTransaction = async () => {
    try {
      setSigningLog([]);
      let user = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const userStr = localStorage.getItem('user');
      if (userStr) user = JSON.parse(userStr);

      if (!transferAmount || !transferIban) {
        alert("Lütfen IBAN ve Tutar giriniz."); return;
      }

      // Payload oluştur
      const rawPayload = `IBAN:${transferIban},AMOUNT:${transferAmount}`;
      
      setSigningLog(prev => [...prev, `[SİSTEM] Orijinal Veri: ${rawPayload}`]);
      setSigningLog(prev => [...prev, `[SİSTEM] WebCrypto (ECDSA P-256) ile imzalanıyor...`]);

      const signRes = await signPayload(rawPayload);
      if (!signRes.success) { alert("İmzalama hatası."); return; }

      const signature = signRes.signature;
      setSigningLog(prev => [...prev, `[İMZA] ${signature.substring(0, 40)}...`]);

      setSigningLog(prev => [...prev, `[SUNUCU] İmzalanan veri sunucuya doğrulanmak üzere gönderiliyor...`]);
      
      try {
        const verifyRes = await verifySignature(user.id, rawPayload, signature);
        setSigningLog(prev => [...prev, `✅ [BAŞARILI] ${verifyRes.data.message}`]);
      } catch (err) {
        const errMsg = err.response?.data?.error || err.message;
        setSigningLog(prev => [...prev, `❌ [REDDEDİLDİ] ${errMsg}`]);
      }

    } catch (err) {
      setSigningLog(prev => [...prev, `[HATA] ${err.message}`]);
    }
  };

  return (
    <div className="view-container transactions-view">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Hesap Hareketleri & Raporlar</h2>
          <p>Gelen/giden tüm transferler, kart harcamaları ve AI Fraud Shield doğrulama durumları.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isEnrolled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '20px', color: '#047857', fontWeight: '600', fontSize: '14px' }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Cihaz Kayıtlı
            </div>
          )}
          <button 
            onClick={handleEnrollDevice}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
              backgroundColor: isEnrolled ? '#f1f5f9' : '#0f172a', 
              color: isEnrolled ? '#475569' : '#ffffff', 
              border: 'none', 
              borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: isEnrolled ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            onMouseOver={(e) => {
              if(!isEnrolled) e.currentTarget.style.backgroundColor = '#1e293b';
              else e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseOut={(e) => {
              if(!isEnrolled) e.currentTarget.style.backgroundColor = '#0f172a';
              else e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            {isEnrolled ? 'Anahtarı Yenile' : 'Cihazı Güvenilir Olarak Kaydet'}
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="card-title">Toplam Aylık Gelir</span>
          <div className="card-value text-success">
            {formatCurrency(allTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0))}
          </div>
          <span className="card-sub">{allTransactions.filter(t => t.amount > 0).length} İşlem</span>
        </div>
        <div className="metric-card">
          <span className="card-title">Toplam Aylık Gider</span>
          <div className="card-value text-danger">
            {formatCurrency(allTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0))}
          </div>
          <span className="card-sub">{allTransactions.filter(t => t.amount < 0).length} İşlem</span>
        </div>
        <div className="metric-card">
          <span className="card-title">Genel Güvenlik Skoru</span>
          <div className="card-value">
            %{allTransactions.length > 0 
                ? 100 - Math.round(allTransactions.reduce((acc, t) => acc + parseRiskScore(t.riskScore), 0) / allTransactions.length) 
                : 100} Güvenli
          </div>
          <span className="card-sub">{allTransactions.length} İşlem AI Tarafından Tarandı</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="widget-card filter-bar-card">
        <div className="filters-grid">
          <div className="filter-input-group">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              className="form-input" 
              placeholder="İşlem adı veya alıcı ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select 
              className="form-input"
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
            >
              <option value="ALL">Tüm Risk Seviyeleri</option>
              <option value="SAFE">Güvenli (%0-25)</option>
              <option value="MEDIUM">Orta Risk (%26-55)</option>
              <option value="HIGH">Yüksek Risk (%56-80)</option>
              <option value="CRITICAL">Kritik Risk (%81-100)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="widget-card full-width">
        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>İşlem Detayı</th>
                <th>Tarih</th>
                <th>AI Fraud Durumu</th>
                <th>İşlem Statüsü</th>
                <th className="text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div className="tx-title-wrapper">
                        <span className="tx-icon">{tx.amount < 0 ? '↗️' : '↙️'}</span>
                        <span className="tx-title">{tx.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tx-date">
                        {tx.date ? new Intl.DateTimeFormat('tr-TR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        }).format(new Date(tx.date)) : ''}
                      </span>
                    </td>
                    <td>
                      <RiskBadge riskLevel={tx.risk} riskScore={tx.riskScore} />
                    </td>
                    <td>
                      {tx.status === 'COMPLETED' && <span className="status-pill success">Approved</span>}
                      {tx.status === 'OTP_CHALLENGED' && <span className="status-pill warning">OTP Challenged</span>}
                      {tx.status === 'REJECTED' && <span className="status-pill danger">Rejected</span>}
                      {!['COMPLETED', 'OTP_CHALLENGED', 'REJECTED'].includes(tx.status) && (
                        <span className="status-pill">{tx.status}</span>
                      )}
                    </td>
                    <td className={`text-right tx-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                      {tx.amount > 0 ? `+${tx.amount.toFixed(2)} ₺` : `${tx.amount.toFixed(2)} ₺`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-records">
                    Arama kriterlerinize uyan işlem bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionsView;
