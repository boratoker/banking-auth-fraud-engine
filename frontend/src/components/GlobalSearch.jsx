import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAccounts, getTransactions, getContacts, getCardDetails } from '../api/bankingApi';

const STATIC_ACTIONS = [
  {
    id: 'action-transfer',
    type: 'action',
    title: 'Yeni FAST Para Transferi',
    subtitle: '7/24 anında IBAN veya kayıtlı alıcıya para gönder',
    icon: '💸',
    badge: 'FAST 7/24',
    keywords: ['transfer', 'para', 'gönder', 'fast', 'havale', 'eft', 'iban', 'yolla', 'ödeme'],
    tab: 'transfer'
  },
  {
    id: 'action-card',
    type: 'action',
    title: 'Sanal Kart & Güvenlik Ayarları',
    subtitle: 'Kartı anında dondur, e-ticaret ve yurt dışı izinlerini yönet',
    icon: '💳',
    badge: 'Güvenlik',
    keywords: ['kart', 'sanal', 'dondur', 'limit', 'cvv', 'kredi', 'güvenlik', 'harcama'],
    tab: 'accounts'
  },
  {
    id: 'action-transactions',
    type: 'action',
    title: 'Hesap Hareketleri & Raporlar',
    subtitle: 'Tüm harcama, gelir ve AI Fraud Shield doğrulama kayıtları',
    icon: '🧾',
    badge: 'Ekstre',
    keywords: ['işlem', 'hareket', 'geçmiş', 'ekstre', 'rapor', 'dekont', 'harcama', 'gelir', 'gider'],
    tab: 'transactions'
  },
  {
    id: 'action-security',
    type: 'action',
    title: 'Güvenlik & Risk Yönetim Merkezi',
    subtitle: 'Aktif bağlı cihaz oturumları, IP analizi ve AI risk skoru',
    icon: '🔒',
    badge: 'AI Shield',
    keywords: ['güvenlik', 'cihaz', 'oturum', 'ip', 'risk', 'skor', 'ai', 'şifre', 'bloke', 'challenge'],
    tab: 'security'
  },
  {
    id: 'action-overview',
    type: 'action',
    title: 'Genel Varlık & Finansal Özet',
    subtitle: 'Tüm banka varlıkları, birikim faiz oranları ve bakiye durumu',
    icon: '📊',
    badge: 'Özet',
    keywords: ['özet', 'dashboard', 'genel', 'bakiye', 'varlık', 'toplam', 'ana sayfa'],
    tab: 'overview'
  }
];

const POPULAR_SEARCH_CHIPS = [
  'Maaş',
  'Netflix',
  'FAST Transfer',
  'Ahmet Yılmaz',
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

  const normalizeStr = (str) => {
    if (!str) return '';
    return str
      .toString()
      .trim()
      .toLocaleLowerCase('tr-TR');
  };

  // Filtered Results
  const results = useMemo(() => {
    const q = normalizeStr(query);

    if (!q) {
      // Empty query: Show quick actions & suggestions
      return {
        actions: STATIC_ACTIONS,
        accounts: [],
        contacts: [],
        transactions: [],
        totalCount: STATIC_ACTIONS.length
      };
    }

    // 1. Actions Filter
    const matchedActions = STATIC_ACTIONS.filter(act => {
      const matchTitle = normalizeStr(act.title).includes(q);
      const matchSub = normalizeStr(act.subtitle).includes(q);
      const matchKey = act.keywords.some(k => normalizeStr(k).includes(q) || q.includes(normalizeStr(k)));
      return matchTitle || matchSub || matchKey;
    });

    // 2. Accounts & Card Filter
    const matchedAccounts = accounts.filter(acc => {
      const matchName = normalizeStr(acc.name).includes(q);
      const matchIban = normalizeStr(acc.iban).replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
      const matchType = normalizeStr(acc.type).includes(q);
      const matchCurrency = normalizeStr(acc.currency).includes(q);
      return matchName || matchIban || matchType || matchCurrency;
    });

    // If query matches card terms, include the virtual card
    const cardMatches = card && (
      q.includes('kart') ||
      q.includes('sanal') ||
      q.includes('platinum') ||
      q.includes('8819') ||
      q.includes('limit')
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

    // 3. Contacts Filter
    const matchedContacts = contacts.filter(con => {
      const matchName = normalizeStr(con.name).includes(q);
      const matchAlias = normalizeStr(con.alias).includes(q);
      const matchIban = normalizeStr(con.iban).replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
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
      const matchTitle = normalizeStr(tx.title).includes(q);
      const matchCategory = normalizeStr(tx.category).includes(q);
      const matchStatus = normalizeStr(tx.status).includes(q);
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
      matchedActions.length +
      accountItems.length +
      matchedContacts.length +
      matchedTransactions.length;

    return {
      actions: matchedActions,
      accounts: accountItems,
      contacts: matchedContacts,
      transactions: matchedTransactions,
      totalCount
    };
  }, [query, accounts, transactions, contacts, card]);

  // Flattened items for arrow navigation
  const flatItems = useMemo(() => {
    const items = [];
    results.actions.forEach(a => items.push({ ...a, section: 'actions' }));
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

    if (item.type === 'action') {
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
          placeholder="Hesap, transfer, kişi veya işlem ara..."
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
          {/* If query is empty: Show Quick Actions & Popular Search Chips */}
          {!query.trim() && (
            <div className="search-empty-state-content">
              <div className="search-category-header">
                <span>⚡ HIZLI İŞLEMLER & KISAYOLLAR</span>
              </div>
              <div className="search-results-group">
                {STATIC_ACTIONS.map((action) => {
                  const idx = getItemIndex(action.id);
                  const isHighlighted = selectedIndex === idx;
                  return (
                    <div
                      key={action.id}
                      data-index={idx}
                      className={`search-result-item ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={() => handleSelect(action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="item-icon-box action-icon">{action.icon}</div>
                      <div className="item-info">
                        <div className="item-title">{action.title}</div>
                        <div className="item-sub">{action.subtitle}</div>
                      </div>
                      <span className="item-badge">{action.badge}</span>
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
              {/* Quick Actions */}
              {results.actions.length > 0 && (
                <div className="search-section">
                  <div className="search-category-header">
                    <span>⚡ HIZLI İŞLEMLER ({results.actions.length})</span>
                  </div>
                  {results.actions.map((act) => {
                    const idx = getItemIndex(act.id);
                    const isHighlighted = selectedIndex === idx;
                    return (
                      <div
                        key={act.id}
                        data-index={idx}
                        className={`search-result-item ${isHighlighted ? 'highlighted' : ''}`}
                        onClick={() => handleSelect(act)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="item-icon-box action-icon">{act.icon}</div>
                        <div className="item-info">
                          <div className="item-title">{act.title}</div>
                          <div className="item-sub">{act.subtitle}</div>
                        </div>
                        <span className="item-badge">{act.badge}</span>
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
                Hesap adı, alıcı ismi, IBAN, harcama kategorisi veya anahtar kelimelerle arama yapabilirsiniz.
              </p>
              <div className="no-results-chips">
                <span>Örnekler:</span>
                <button type="button" onClick={() => handleChipClick('Netflix')}>Netflix</button>
                <button type="button" onClick={() => handleChipClick('Maaş')}>Maaş</button>
                <button type="button" onClick={() => handleChipClick('Ahmet')}>Ahmet</button>
                <button type="button" onClick={() => handleChipClick('Vadesiz')}>Vadesiz</button>
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
                <span><strong>↵</strong> Seç</span>
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
