import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api/bankingApi';
import tokerbankLogo from '../assets/tokerbank-logo.png';
import { normalizeTurkish } from '../utils/textUtils';
import { RiskBadge, getRiskBadgeInfo, parseRiskScore } from '../utils/riskUtils';

const TransactionsView = ({ initialSearchTerm = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  const [allTransactions, setAllTransactions] = useState([]);

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
    
    const matchesCategory = selectedCategory === 'ALL' || tx.category === selectedCategory;
    
    const riskInfo = getRiskBadgeInfo(tx.risk, tx.riskScore);
    const matchesRisk = selectedRisk === 'ALL' || riskInfo.level === selectedRisk;

    return matchesSearch && matchesCategory && matchesRisk;
  });

  return (
    <div className="view-container transactions-view">
      <div className="view-header">
        <h2>Hesap Hareketleri & Raporlar</h2>
        <p>Gelen/giden tüm transferler, kart harcamaları ve AI Fraud Shield doğrulama durumları.</p>
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
              placeholder="İşlem adı veya kategori ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select 
              className="form-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">Tüm Kategoriler</option>
              <option value="Transfer">Transferler</option>
              <option value="Alışveriş">Alışveriş</option>
              <option value="Eğlence">Eğlence</option>
              <option value="Ulaşım">Ulaşım</option>
              <option value="Fatura">Fatura</option>
              <option value="Gelir">Gelir</option>
            </select>
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
                <th>Kategori</th>
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
                    <td><span className="tx-category">{tx.category}</span></td>
                    <td><span className="tx-date">{tx.date}</span></td>
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
                  <td colSpan="6" className="no-records">
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
