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
      const userStr = localStorage.getItem('user');
      if (!userStr) { alert("Kullanıcı bilgisi bulunamadı."); return; }
      const user = JSON.parse(userStr);

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
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

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
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isEnrolled ? (
            <button className="btn btn-secondary" onClick={handleEnrollDevice}>
              🛡️ Cihazı Güvenilir Olarak Kaydet (Enroll)
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}>
              💸 Yeni Transfer Yap
            </button>
          )}
        </div>
      </div>

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <h3>Kriptografik İşlem İmzalama (Demo)</h3>
            <p className="text-muted" style={{fontSize: '14px', marginBottom: '1rem'}}>
              PSD2 SCA (Strong Customer Authentication) kapsamında, bu transfer tarayıcınızın WebCrypto donanımı tarafından <strong>asimetrik şifreleme (ECDSA P-256)</strong> ile imzalanacaktır.
            </p>
            
            <div className="form-group">
              <label>Alıcı IBAN</label>
              <input type="text" className="form-input" placeholder="TR..." value={transferIban} onChange={e => setTransferIban(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tutar (₺)</label>
              <input type="number" className="form-input" placeholder="1000" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} />
            </div>


            <button className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}} onClick={handleSignTransaction}>
              İmzala ve Gönder
            </button>

            {signingLog.length > 0 && (
              <div style={{ marginTop: '1rem', background: '#1e1e1e', color: '#00ff00', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                {signingLog.map((log, i) => (
                  <div key={i} style={{ color: log.includes('❌') || log.includes('🚨') ? '#ff4444' : '#00ff00' }}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
