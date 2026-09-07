import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api/bankingApi';

const TransactionsView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  const [allTransactions, setAllTransactions] = useState([
    { id: 1, title: 'Migros Sanal Market', date: '07 Eyl 2026, 14:22', amount: -482.50, category: 'Alışveriş', risk: 'Safe', riskScore: '1%', status: 'Başarılı' },
    { id: 2, title: 'Gelen Transfer - Ahmet Yıl.', date: '07 Eyl 2026, 11:05', amount: 3500.00, category: 'Transfer', risk: 'Safe', riskScore: '0%', status: 'Başarılı' },
    { id: 3, title: 'Netflix Abonelik', date: '06 Eyl 2026, 22:15', amount: -199.99, category: 'Eğlence', risk: 'Safe', riskScore: '2%', status: 'Başarılı' },
    { id: 4, title: 'Shell Yakıt Alımı', date: '05 Eyl 2026, 18:40', amount: -1250.00, category: 'Ulaşım', risk: 'Safe', riskScore: '3%', status: 'Başarılı' },
    { id: 5, title: 'Maaş Ödemesi - Tech Corp', date: '01 Eyl 2026, 09:00', amount: 95000.00, category: 'Gelir', risk: 'Safe', riskScore: '0%', status: 'Başarılı' },
    { id: 6, title: 'Amazon TR Sipariş', date: '30 Ağu 2026, 16:10', amount: -2450.00, category: 'Alışveriş', risk: 'Safe', riskScore: '1%', status: 'Başarılı' },
    { id: 7, title: 'Elektrik Faturası - CK Enerji', date: '28 Ağu 2026, 10:30', amount: -820.00, category: 'Fatura', risk: 'Safe', riskScore: '0%', status: 'Başarılı' },
    { id: 8, title: 'Yabancı E-Ticaret Denemesi', date: '25 Ağu 2026, 03:14', amount: -12500.00, category: 'Alışveriş', risk: 'Flagged', riskScore: '74%', status: 'Fraud İncelemesinde' },
  ]);

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
          <div className="card-value text-success">+₺98,500.00</div>
          <span className="card-sub">2 İşlem</span>
        </div>
        <div className="metric-card">
          <span className="card-title">Toplam Aylık Gider</span>
          <div className="card-value text-danger">-₺17,702.49</div>
          <span className="card-sub">6 İşlem</span>
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
                        {tx.risk === 'Safe' ? `🛡️ %${tx.riskScore} Risk` : `⚠️ %${tx.riskScore} Yüksek Risk`}
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
