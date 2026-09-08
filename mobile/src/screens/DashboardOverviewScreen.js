import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getOverviewData } from '../api/bankingApi';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const DashboardOverviewScreen = ({ onNavigate }) => {
  const [data, setData] = useState({
    totalBalance: 235051.25,
    currency: 'TRY',
    activeCards: 2,
    riskStatus: 'GÜVENLİ (%2 Risk)',
    recentTransactions: [
      { id: 1, title: 'Migros Sanal Market', type: 'EXPENSE', amount: -420.5, date: 'Bugün, 14:20' },
      { id: 2, title: 'Ahmet Yılmaz - FAST Transfer', type: 'TRANSFER', amount: -1500.0, date: 'Dün, 18:45' },
      { id: 3, title: 'Maaş Ödemesi (Tech Corp)', type: 'INCOME', amount: +48500.0, date: '01.09.2026' },
      { id: 4, title: 'Netflix Dijital Abonelik', type: 'EXPENSE', amount: -199.99, date: '28.08.2026' },
    ],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getOverviewData()
      .then((res) => {
        if (res.data) setData(res.data);
      })
      .catch(() => {
        // Fallback to initial local state if backend API proxy is offline
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Total Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>TOPLAM VARLIKLARIM</Text>
        <Text style={styles.balanceValue}>
          ₺{data.totalBalance?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        </Text>

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusDot}>🟢</Text>
            <Text style={styles.statusText}>AI Fraud Shield Aktif</Text>
          </View>
          <Text style={styles.riskBadgeText}>{data.riskStatus}</Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onNavigate('transfer')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>💸</Text>
          <Text style={styles.actionLabel}>FAST Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onNavigate('accounts')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>💳</Text>
          <Text style={styles.actionLabel}>Sanal Kart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onNavigate('security')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🛡️</Text>
          <Text style={styles.actionLabel}>Güvenlik</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions Widget */}
      <View style={globalStyles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>Son Hesap Hareketleri</Text>
          <TouchableOpacity onPress={() => onNavigate('transactions')}>
            <Text style={styles.seeAllText}>Tümünü Gör →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          data.recentTransactions.map((item) => (
            <View key={item.id} style={styles.txItem}>
              <View style={styles.txIconBox}>
                <Text style={{ fontSize: 16 }}>
                  {item.amount > 0 ? '🟢' : item.type === 'TRANSFER' ? '💸' : '🛒'}
                </Text>
              </View>
              <View style={styles.txDetails}>
                <Text style={styles.txTitle}>{item.title}</Text>
                <Text style={styles.txDate}>{item.date}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  item.amount > 0 ? styles.txAmountPositive : styles.txAmountNegative,
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
  balanceCard: {
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderColor: 'rgba(0, 242, 254, 0.25)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  balanceValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    fontSize: 10,
    marginRight: 6,
  },
  statusText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  riskBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionItem: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txAmountPositive: {
    color: colors.success,
  },
  txAmountNegative: {
    color: colors.text,
  },
});

export default DashboardOverviewScreen;
