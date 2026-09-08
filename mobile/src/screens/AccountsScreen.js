import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { getAccounts, getCardDetails, toggleCardFreeze, toggleCardSetting } from '../api/bankingApi';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const AccountsScreen = () => {
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  const [internetAllowed, setInternetAllowed] = useState(true);
  const [overseasAllowed, setOverseasAllowed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [accounts, setAccounts] = useState([
    { id: 1, name: 'Ana Vadesiz TL Hesabı', iban: 'TR32 0006 1000 0000 1234 5678 90', balance: 148250.75, currency: 'TRY', type: 'Vadesiz' },
    { id: 2, name: 'Büyüyen Vadeli Birikim', iban: 'TR32 0006 1000 0000 9876 5432 11', balance: 85000.0, currency: 'TRY', type: 'Vadeli (%48.5)' },
    { id: 3, name: 'USD Döviz Hesabı', iban: 'TR32 0006 1000 0000 4455 6677 88', balance: 4250.0, currency: 'USD', type: 'Döviz' },
    { id: 4, name: 'EUR Döviz Hesabı', iban: 'TR32 0006 1000 0000 1122 3344 55', balance: 1800.5, currency: 'EUR', type: 'Döviz' },
  ]);

  useEffect(() => {
    getAccounts()
      .then((res) => {
        if (Array.isArray(res.data)) setAccounts(res.data);
      })
      .catch(() => {});

    getCardDetails()
      .then((res) => {
        if (res.data) {
          setIsCardFrozen(!!res.data.isFrozen);
          setInternetAllowed(res.data.internetAllowed !== false);
          setOverseasAllowed(!!res.data.overseasAllowed);
        }
      })
      .catch(() => {});
  }, []);

  const handleFreezeToggle = async (val) => {
    setIsCardFrozen(val);
    try {
      await toggleCardFreeze(val);
    } catch (e) {
      // Local state fallback
    }
  };

  const handleSettingToggle = async (key, val, setter) => {
    setter(val);
    try {
      await toggleCardSetting(key, val);
    } catch (e) {
      // Local state fallback
    }
  };

  const handleCopyIban = (iban, idx) => {
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={globalStyles.title}>Hesaplar & Sanal Kart</Text>
      <Text style={globalStyles.subtitle}>Sanal kart izinlerinizi yönetin ve bakiyelerinizi izleyin.</Text>

      {/* Credit Card Interactive Visual */}
      <View style={[styles.creditCard, isCardFrozen && styles.creditCardFrozen]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardBrand}>TokerBank</Text>
          <Text style={styles.cardTag}>PLATINUM VIRTUAL</Text>
        </View>

        <Text style={styles.cardChip}>💳</Text>

        <Text style={styles.cardNumber}>
          {showCardDetails ? '4543 8912 0012 8819' : '4543 •••• •••• 8819'}
        </Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardLabel}>KART SAHİBİ</Text>
            <Text style={styles.cardVal}>BORA TOKER</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>SON KULLANMA</Text>
            <Text style={styles.cardVal}>{showCardDetails ? '09/29' : '••/••'}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>CVV</Text>
            <Text style={styles.cardVal}>{showCardDetails ? '492' : '•••'}</Text>
          </View>
        </View>

        {isCardFrozen && (
          <View style={styles.frozenOverlay}>
            <Text style={styles.frozenText}>🔒 KART DONDURULDU</Text>
          </View>
        )}
      </View>

      {/* Card Controls Panel */}
      <View style={globalStyles.card}>
        <Text style={styles.sectionTitle}>Sanal Kart Güvenlik Ayarları</Text>

        <View style={styles.controlRow}>
          <View style={styles.controlInfo}>
            <Text style={styles.controlTitle}>Kart Bilgilerini Göster</Text>
            <Text style={styles.controlDesc}>Kart no ve CVV kodunu göster/gizle.</Text>
          </View>
          <TouchableOpacity
            style={styles.smBtn}
            onPress={() => setShowCardDetails(!showCardDetails)}
          >
            <Text style={styles.smBtnText}>{showCardDetails ? 'Gizle' : 'Göster'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlRow}>
          <View style={styles.controlInfo}>
            <Text style={styles.controlTitle}>Kartı Geçici Dondur</Text>
            <Text style={styles.controlDesc}>Tüm harcamaları anında engeller.</Text>
          </View>
          <Switch
            value={isCardFrozen}
            onValueChange={handleFreezeToggle}
            trackColor={{ false: '#334155', true: colors.danger }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.controlRow}>
          <View style={styles.controlInfo}>
            <Text style={styles.controlTitle}>İnternet Alışverişi</Text>
            <Text style={styles.controlDesc}>E-ticaret harcamalarına izin ver.</Text>
          </View>
          <Switch
            value={internetAllowed}
            disabled={isCardFrozen}
            onValueChange={(val) => handleSettingToggle('internetAllowed', val, setInternetAllowed)}
            trackColor={{ false: '#334155', true: colors.primary }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.controlRow}>
          <View style={styles.controlInfo}>
            <Text style={styles.controlTitle}>Yurt Dışı İşlemler</Text>
            <Text style={styles.controlDesc}>Yurt dışı harcamaları yönet.</Text>
          </View>
          <Switch
            value={overseasAllowed}
            disabled={isCardFrozen}
            onValueChange={(val) => handleSettingToggle('overseasAllowed', val, setOverseasAllowed)}
            trackColor={{ false: '#334155', true: colors.primary }}
            thumbColor="#FFF"
          />
        </View>
      </View>

      {/* Accounts List */}
      <Text style={[styles.sectionTitle, { marginHorizontal: 4, marginBottom: 10 }]}>
        Banka Hesaplarım ({accounts.length})
      </Text>

      {accounts.map((acc, idx) => (
        <View key={acc.id} style={globalStyles.card}>
          <View style={styles.accHeader}>
            <Text style={styles.accTypeBadge}>{acc.type}</Text>
            <Text style={styles.accCurrency}>{acc.currency}</Text>
          </View>

          <Text style={styles.accName}>{acc.name}</Text>
          <Text style={styles.accBalance}>
            {acc.currency === 'TRY' ? '₺' : acc.currency === 'USD' ? '$' : '€'}
            {acc.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </Text>

          <View style={styles.ibanRow}>
            <Text style={styles.ibanText}>{acc.iban}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopyIban(acc.iban, idx)}>
              <Text style={styles.copyBtnText}>
                {copiedIndex === idx ? '✓ Kopyalandı' : 'Kopyala'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  creditCard: {
    height: 190,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    padding: 20,
    justifyContent: 'space-between',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  creditCardFrozen: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  cardTag: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  cardChip: {
    fontSize: 26,
    marginVertical: 4,
  },
  cardNumber: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '600',
  },
  cardVal: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  frozenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frozenText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  controlInfo: {
    flex: 1,
    marginRight: 10,
  },
  controlTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  controlDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  smBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  smBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  accHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  accTypeBadge: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  accCurrency: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  accName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  accBalance: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 4,
  },
  ibanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  ibanText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  copyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
  },
  copyBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default AccountsScreen;
