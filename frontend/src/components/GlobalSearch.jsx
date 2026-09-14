import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAccounts, getTransactions, getContacts, getCardDetails } from '../api/bankingApi';
import { normalizeTurkish } from '../utils/textUtils';

// Sidebar Menu items for direct navigation
const SIDEBAR_MENUS = [
  {
    id: 'menu-overview',
    type: 'menu',
    title: 'Genel Özet',
    subtitle: 'Ana sayfa, toplam varlıklar ve finansal durum paneli',
    icon: '📊',
    badge: 'Menü',
    tab: 'overview',
    keywords: ['ozet', 'genel', 'dashboard', 'ana sayfa', 'bakiye', 'varlik', 'durum', 'finans', 'menu']
  },
  {
    id: 'menu-accounts',
    type: 'menu',
    title: 'Hesaplarım & Kartlar',
    subtitle: 'Vadesiz/vadeli hesaplar, IBAN listesi ve sanal kart yönetimi',
    icon: '💳',
    badge: 'Menü',
    tab: 'accounts',
    keywords: ['hesap', 'kart', 'hesaplarim', 'kartlar', 'sanal', 'iban', 'bakiye', 'limit', 'vadeli', 'vadesiz', 'dondur', 'menu']
  },
  {
    id: 'menu-transfer',
    type: 'menu',
    title: 'Para Transferi (FAST)',
    subtitle: '7/24 anında FAST/EFT transferi, IBAN ve rehbere para gönderme',
    icon: '💸',
    badge: 'FAST 7/24',
    tab: 'transfer',
    keywords: ['transfer', 'para', 'fast', 'havale', 'eft', 'gonder', 'yolla', 'iban', 'alici', 'rehber', 'odeme', 'menu']
  },
  {
    id: 'menu-security',
    type: 'menu',
    title: 'Güvenlik & Risk Merkezi',
    subtitle: 'Aktif bağlı cihaz oturumları, IP analizi ve AI Fraud Shield koruması',
    icon: '🔒',
    badge: 'AI Active',
    tab: 'security',
    keywords: ['guvenlik', 'risk', 'merkez', 'cihaz', 'oturum', 'ip', 'ai', 'fraud', 'shield', 'koruma', 'bloke', 'sifre', 'menu']
  },
  {
    id: 'menu-transactions',
    type: 'menu',
    title: 'İşlem Geçmişi',
    subtitle: 'Tüm gelen/giden transferler, ekstre dökümü ve harcama filtreleme',
    icon: '🧾',
    badge: 'Menü',
    tab: 'transactions',
    keywords: ['islem', 'gecmisi', 'gecmis', 'hareket', 'ekstre', 'rapor', 'harcama', 'gelir', 'gider', 'fatura', 'dekont', 'menu']
  }
];

const POPULAR_SEARCH_CHIPS = [
  'Maaş',
  'Netflix',
  'FAST Transfer',
  'Ayşe',
  'Trendyol',
  'Sanal Kart'
];

const GlobalSearch = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Cached API Data
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [card, setCard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Initial Data Fetch
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([
      getAccounts(),
      getTransactions(),
      getContacts(),
      getCardDetails()
    ]).then(([accRes, txRes, conRes, cardRes]) => {
      if (!isMounted) return;
      if (accRes.status === 'fulfilled' && Array.isArray(accRes.value?.data)) {
        setAccounts(accRes.value.data);
      }
      if (txRes.status === 'fulfilled' && Array.isArray(txRes.value?.data)) {
        setTransactions(txRes.value.data);
      }
      if (conRes.status === 'fulfilled' && Array.isArray(conRes.value?.data)) {
        setContacts(conRes.value.data);
      }
      if (cardRes.status === 'fulfilled' && cardRes.value?.data) {
        setCard(cardRes.value.data);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format Currency
  const formatTRY = (val) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);
  };

  // Filtered Results with Turkish character-insensitive matching
  const results = useMemo(() => {
    const q = normalizeTurkish(query);

    if (!q) {
      // Empty query: Show sidebar menus & popular chips
      return {
        menus: SIDEBAR_MENUS,
        accounts: [],
        contacts: [],
        transactions: [],
        totalCount: SIDEBAR_MENUS.length
      };
    }

    // 1. Sidebar Menus Filter
    const matchedMenus = SIDEBAR_MENUS.filter(menu => {
      const matchTitle = normalizeTurkish(menu.title).includes(q);
      const matchSub = normalizeTurkish(menu.subtitle).includes(q);
      const matchKey = menu.keywords.some(k => normalizeTurkish(k).includes(q) || q.includes(normalizeTurkish(k)));
      return matchTitle || matchSub || matchKey;
    });

    // 2. Accounts & Card Filter
    const matchedAccounts = accounts.filter(acc => {
      const matchName = normalizeTurkish(acc.name).includes(q);
      const matchIban = normalizeTurkish(acc.iban).replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
      const matchType = normalizeTurkish(acc.type).includes(q);
      const matchCurrency = normalizeTurkish(acc.currency).includes(q);
      return matchName || matchIban || matchType || matchCurrency;
    });

    // If query matches card terms (e.g. limit, kart, sanal, etc.)
    const cardMatches = card && (
      q.includes('kart') ||
      q.includes('sanal') ||
      q.includes('platinum') ||
      q.includes('8819') ||
      q.includes('limit') ||
      q.includes('harcama')
    );

    const accountItems = [
      ...matchedAccounts.map(a => ({
        id: `acc-${a.id}`,
        type: 'account',
        title: a.name,
        subtitle: `${a.iban} • ${a.type || 'Hesap'}`,
        icon: a.currency === 'TRY' ? '₺' : (a.currency === 'USD' ? '$' : '🪙'),
        meta: formatTRY(a.balance),
        badge: a.currency,
        raw: a
      })),
      ...(cardMatches ? [{
        id: `card-${card.id || 'virtual'}`,
        type: 'card',
        title: 'Toker Platinum Sanal Kart',
        subtitle: `${card.cardNumber || '**** 8819'} • ${card.isFrozen ? 'Donduruldu' : 'Aktif'}`,
        icon: '💳',
        meta: '₺50,000.00 Limit',
        badge: card.isFrozen ? 'Donduruldu' : 'Aktif',
        raw: card
      }] : [])
    ];

    // 3. Contacts Filter (e.g. Ayse matches Ayşe, Celik matches Çelik)
    const matchedContacts = contacts.filter(con => {
      const matchName = normalizeTurkish(con.name).includes(q);
      const matchAlias = normalizeTurkish(con.alias).includes(q);
      const matchIban = normalizeTurkish(con.iban).replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
      return matchName || matchAlias || matchIban;
    }).map(con => ({
      id: `con-${con.id}`,
      type: 'contact',
      title: con.name,
      subtitle: `${con.iban} ${con.alias ? `(${con.alias})` : ''}`,
      icon: '👤',
      meta: 'Para Gönder',
      badge: 'Rehber',
      raw: con
    }));

    // 4. Transactions Filter
    const matchedTransactions = transactions.filter(tx => {
      const matchTitle = normalizeTurkish(tx.title).includes(q);
      const matchCategory = normalizeTurkish(tx.category).includes(q);
      const matchStatus = normalizeTurkish(tx.status).includes(q);
      const matchAmount = (tx.amount?.toString() || '').includes(q);
      return matchTitle || matchCategory || matchStatus || matchAmount;
    }).map(tx => ({
      id: `tx-${tx.id}`,
      type: 'transaction',
      title: tx.title,
      subtitle: `${tx.category} • ${tx.date ? tx.date.slice(0, 10) : ''}`,
      icon: tx.amount < 0 ? '↗️' : '↙️',
      meta: tx.amount > 0 ? `+${formatTRY(tx.amount)}` : formatTRY(tx.amount),
      isPositive: tx.amount > 0,
      risk: tx.risk,
      badge: tx.status,
      raw: tx
    }));

    const totalCount =
      matchedMenus.length +
      accountItems.length +
      matchedContacts.length +
      matchedTransactions.length;

    return {
      menus: matchedMenus,
      accounts: accountItems,
      contacts: matchedContacts,
      transactions: matchedTransactions,
      totalCount
    };
  }, [query, accounts, transactions, contacts, card]);

  // Flattened items for arrow navigation
  const flatItems = useMemo(() => {
    const items = [];
    results.menus.forEach(m => items.push({ ...m, section: 'menus' }));
    results.accounts.forEach(a => items.push({ ...a, section: 'accounts' }));
    results.contacts.forEach(c => items.push({ ...c, section: 'contacts' }));
    results.transactions.slice(0, 5).forEach(t => items.push({ ...t, section: 'transactions' }));
    return items;
  }, [results]);

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Execute selection
  const handleSelect = (item) => {
    if (!item) return;

    if (item.type === 'menu') {
      if (onNavigate) onNavigate(item.tab);
    } else if (item.type === 'account' || item.type === 'card') {
      if (onNavigate) onNavigate('accounts');
    } else if (item.type === 'contact') {
      if (onNavigate) {
        onNavigate('transfer', {
          transferPrefill: {
            recipientName: item.raw?.name || item.title,
            recipientIban: item.raw?.iban || ''
          }
        });
      }
    } else if (item.type === 'transaction') {
      if (onNavigate) {
        onNavigate('transactions', {
          transactionsFilter: item.title
        });
      }
    }

    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Keyboard navigation inside input
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 >= flatItems.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 < 0 ? flatItems.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
        handleSelect(flatItems[selectedIndex]);
      } else if (query.trim()) {
        // Pressing Enter on arbitrary query -> open transactions view filtered
        if (onNavigate) {
          onNavigate('transactions', {
            transactionsFilter: query.trim()
          });
        }
        setIsOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleChipClick = (chipText) => {
    setQuery(chipText);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery('');
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Helper to check index in flatItems
  const getItemIndex = (itemId) => {
    return flatItems.findIndex(i => i.id === itemId);
  };

  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '');

  return (
    <div className="navbar-search-wrapper" ref={containerRef}>
      <div className={`navbar-search ${isOpen ? 'is-active' : ''}`}>
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Menü, hesap, transfer, kişi veya işlem ara..."
          className="search-input"
          autoComplete="off"
          spellCheck="false"
        />

        {query ? (
          <button 
            type="button" 
            className="search-clear-btn" 
            onClick={handleClear} 
            title="Temizle"
          >
            ✕
          </button>
        ) : (
          <span className="search-shortcut-badge" title="Aramayı başlat">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="search-dropdown-menu" ref={dropdownRef}>
          {/* If query is empty: Show Sidebar Menus & Popular Search Chips */}
          {!query.trim() && (
            <div className="search-empty-state-content">
              <div className="search-category-header">
                <span>🧭 SİDEBAR MENÜLERİ & SAYFALAR</span>
              </div>
              <div className="search-results-group">
                {SIDEBAR_MENUS.map((menu) => {
                  const idx = getItemIndex(menu.id);
                  const isHighlighted = selectedIndex === idx;
                  return (
                    <div
                      key={menu.id}
                      data-index={idx}
                      className={`search-result-item ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={() => handleSelect(menu)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="item-icon-box menu-icon">{menu.icon}</div>
                      <div className="item-info">
                        <div className="item-title">{menu.title}</div>
                        <div className="item-sub">{menu.subtitle}</div>
                      </div>
                      <span className="item-badge">{menu.badge}</span>
                    </div>
                  );
                })}
              </div>

              <div className="search-popular-tags">
                <span className="popular-tags-label">Önerilen Aramalar:</span>
                <div className="chips-row">
                  {POPULAR_SEARCH_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="search-chip-btn"
                      onClick={() => handleChipClick(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* If query has text and matches exist */}
          {query.trim() && results.totalCount > 0 && (
            <div className="search-results-scrollable">
              {/* Sidebar Menus */}
              {results.menus.length > 0 && (
                <div className="search-section">
                  <div className="search-category-header">
                    <span>🧭 SİDEBAR MENÜLERİ ({results.menus.length})</span>
                  </div>
                  {results.menus.map((menu) => {
                    const idx = getItemIndex(menu.id);
                    const isHighlighted = selectedIndex === idx;
                    return (
                      <div
                        key={menu.id}
                        data-index={idx}
                        className={`search-result-item ${isHighlighted ? 'highlighted' : ''}`}
                        onClick={() => handleSelect(menu)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="item-icon-box menu-icon">{menu.icon}</div>
                        <div className="item-info">
                          <div className="item-title">{menu.title}</div>
                          <div className="item-sub">{menu.subtitle}</div>
                        </div>
                        <span className="item-badge">{menu.badge}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Accounts & Card */}
              {results.accounts.length > 0 && (
                <div className="search-section">
                  <div className="search-category-header">
                    <span>💳 HESAPLAR & KARTLAR ({results.accounts.length})</span>
                  </div>
                  {results.accounts.map((acc) => {
                    const idx = getItemIndex(acc.id);
                    const isHighlighted = selectedIndex === idx;
                    return (
                      <div
                        key={acc.id}
                        data-index={idx}
                        className={`search-result-item ${isHighlighted ? 'highlighted' : ''}`}
                        onClick={() => handleSelect(acc)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="item-icon-box account-icon">{acc.icon}</div>
                        <div className="item-info">
                          <div className="item-title">{acc.title}</div>
                          <div className="item-sub">{acc.subtitle}</div>
                        </div>
                        <div className="item-right-meta">
                          <span className="item-amount">{acc.meta}</span>
                          <span className="item-badge outline">{acc.badge}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Contacts */}
              {results.contacts.length > 0 && (
                <div className="search-section">
                  <div className="search-category-header">
                    <span>👤 KAYITLI ALICILAR & KİŞİLER ({results.contacts.length})</span>
                  </div>
                  {results.contacts.map((con) => {
                    const idx = getItemIndex(con.id);
                    const isHighlighted = selectedIndex === idx;
                    return (
                      <div
                        key={con.id}
                        data-index={idx}
                        className={`search-result-item ${isHighlighted ? 'highlighted' : ''}`}
                        onClick={() => handleSelect(con)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="item-icon-box contact-icon">{con.icon}</div>
                        <div className="item-info">
                          <div className="item-title">{con.title}</div>
                          <div className="item-sub">{con.subtitle}</div>
                        </div>
                        <div className="item-right-meta">
                          <span className="item-action-pill">Para Gönder ↗</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Transactions */}
              {results.transactions.length > 0 && (
                <div className="search-section">
                  <div className="search-category-header">
                    <span>🧾 İŞLEM GEÇMİŞİ & TRANSFERLER ({results.transactions.length})</span>
                  </div>
                  {results.transactions.slice(0, 5).map((tx) => {
                    const idx = getItemIndex(tx.id);
                    const isHighlighted = selectedIndex === idx;
                    return (
                      <div
                        key={tx.id}
                        data-index={idx}
                        className={`search-result-item ${isHighlighted ? 'highlighted' : ''}`}
                        onClick={() => handleSelect(tx)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className={`item-icon-box tx-icon ${tx.isPositive ? 'income' : 'expense'}`}>
                          {tx.icon}
                        </div>
                        <div className="item-info">
                          <div className="item-title">{tx.title}</div>
                          <div className="item-sub">{tx.subtitle}</div>
                        </div>
                        <div className="item-right-meta">
                          <span className={`item-amount ${tx.isPositive ? 'text-success' : ''}`}>
                            {tx.meta}
                          </span>
                          {tx.risk === 'HIGH' || tx.risk === 'CRITICAL' ? (
                            <span className="item-badge danger">Riskli</span>
                          ) : (
                            <span className="item-badge safe">Güvenli</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Zero Results State */}
          {query.trim() && results.totalCount === 0 && (
            <div className="search-no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-title">"{query}" ile eşleşen sonuç bulunamadı</div>
              <p className="no-results-desc">
                Menü adı (Özet, Hesap, Transfer, Güvenlik), alıcı ismi, IBAN veya harcama arayabilirsiniz.
              </p>
              <div className="no-results-chips">
                <span>Örnekler:</span>
                <button type="button" onClick={() => handleChipClick('Transfer')}>Transfer</button>
                <button type="button" onClick={() => handleChipClick('Limit')}>Limit</button>
                <button type="button" onClick={() => handleChipClick('Ayşe')}>Ayşe</button>
                <button type="button" onClick={() => handleChipClick('Netflix')}>Netflix</button>
              </div>
            </div>
          )}

          {/* Dropdown Footer CTA */}
          <div className="search-dropdown-footer">
            {query.trim() ? (
              <div
                className="footer-action-link"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('transactions', { transactionsFilter: query.trim() });
                  }
                  setIsOpen(false);
                }}
              >
                <span>🔎 Tüm işlemlerde <strong>"{query}"</strong> ara ({results.transactions.length} sonuç)</span>
                <span className="footer-enter-hint">↵ Seç</span>
              </div>
            ) : (
              <div className="footer-keys-hint">
                <span><strong>↑↓</strong> Gezin</span>
                <span><strong>↵</strong> Menüye Git</span>
                <span><strong>ESC</strong> Kapat</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
