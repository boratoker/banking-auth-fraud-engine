import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getTransactions } from '../api/bankingApi';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const initialTxList = [
  { id: 1, title: 'Migros Sanal Market', type: 'EXPENSE', amount: -420.5, category: 'Alışveriş', date: 'Bugün, 14:20' },
  { id: 2, title: 'Ahmet Yılmaz - FAST Transfer', type: 'TRANSFER', amount: -1500.0, category: 'Transfer', date: 'Dün, 18:45' },
  { id: 3, title: 'Maaş Ödemesi (Tech Corp)', type: 'INCOME', amount: +48500.0, category: 'Maaş/Gelir', date: '01.09.2026' },
  { id: 4, title: 'Netflix Dijital Abonelik', type: 'EXPENSE', amount: -199.99, category: 'Abonelik', date: '28.08.2026' },
  { id: 5, title: 'Bora Toker - Vadeli Birikim', type: 'TRANSFER', amount: +12500.0, category: 'Yatırım', date: '25.08.2026' },
  { id: 6, title: 'Shell Petrol A.Ş.', type: 'EXPENSE', amount: -850.0, category: 'Akaryakıt', date: '22.08.2026' },
];

const TransactionsScreen = () => {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'
  const [transactions, setTransactions] = useState(initialTxList);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getTransactions()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setTransactions(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = transactions.filter((t) => {
    if (filter === 'ALL') return true;
    if (filter === 'INCOME') return t.amount > 0;
    if (filter === 'EXPENSE') return t.amount < 0 && t.type !== 'TRANSFER';
    if (filter === 'TRANSFER') return t.type === 'TRANSFER';
    return true;
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={globalStyles.title}>Hesap Hareketleri</Text>
      <Text style={globalStyles.subtitle}>Tüm harcama, gelen transfer ve birikim hareketleriniz.</Text>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'ALL', label: 'Tümü' },
          { key: 'INCOME', label: 'Gelen' },
          { key: 'EXPENSE', label: 'Harcamalar' },
          { key: 'TRANSFER', label: 'Transferler' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterChip, filter === tab.key && styles.filterChipActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterLabel, filter === tab.key && styles.filterLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      <View style={globalStyles.card}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : filteredItems.length === 0 ? (
          <Text style={styles.emptyText}>Bu filtreye ait işlem bulunamadı.</Text>
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={styles.txRow}>
              <View style={styles.iconCircle}>
                <Text style={{ fontSize: 16 }}>
                  {item.amount > 0 ? '🟢' : item.type === 'TRANSFER' ? '💸' : '🛒'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>{item.title}</Text>
                <Text style={styles.txSub}>
                  {item.category} • {item.date}
                </Text>
              </View>

              <Text
                style={[
                  styles.txAmount,
                  item.amount > 0 ? styles.positive : styles.negative,
                ]}
              >
                {item.amount > 0 ? '+' : ''}₺
                {Math.abs(item.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  txSub: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.text,
  },
});

export default TransactionsScreen;
