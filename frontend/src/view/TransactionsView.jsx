import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api/bankingApi';
import tokerbankLogo from '../assets/tokerbank-logo.png';

const TransactionsView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  const [allTransactions, setAllTransactions] = useState([]);

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
    const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || tx.category === selectedCategory;
    
    const matchesRisk = selectedRisk === 'ALL' || 
                        (selectedRisk === 'SAFE' && tx.risk === 'Safe') ||
                        (selectedRisk === 'FLAGGED' && tx.risk === 'Flagged');

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
          <span className="card-title">AI Fraud Shield Doğrulaması</span>
          <div className="card-value">%100 Güvenli</div>
          <span className="card-sub">1 İşlem Risk İncelemesinde</span>
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
              <option value="SAFE">Güvenli (%0-5 Risk)</option>
              <option value="FLAGGED">Fraud İncelemesinde</option>
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
                      <span className={`risk-tag ${tx.risk === 'Safe' ? 'safe' : 'flagged'}`}>
                        {tx.risk === 'Safe' ? (
                          <>
                            <img src={tokerbankLogo} alt="Logo" style={{ width: 14, height: 14, objectFit: 'contain', verticalAlign: 'middle', marginRight: 4 }} />
                            %{tx.riskScore} Risk
                          </>
                        ) : `⚠️ %${tx.riskScore} Yüksek Risk`}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${tx.status === 'Başarılı' ? 'success' : 'warning'}`}>
                        {tx.status}
                      </span>
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
