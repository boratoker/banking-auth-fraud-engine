import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { getSecuritySessions, terminateSession } from '../api/bankingApi';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const SecurityScreen = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [fraudAlertsEnabled, setFraudAlertsEnabled] = useState(true);

  const [activeSessions, setActiveSessions] = useState([
    { id: 1, device: 'iPhone 15 Pro (TokerBank Mobile)', ip: '185.12.94.102', location: 'İstanbul, TR', browser: 'Mobile App v1.0', isCurrent: true, time: 'Aktif Oturum' },
    { id: 2, device: 'MacBook Pro (macOS 15.1)', ip: '185.12.94.102', location: 'İstanbul, TR', browser: 'Chrome Web', isCurrent: false, time: '2 saat önce' },
    { id: 3, device: 'Windows Desktop', ip: '88.241.12.50', location: 'Ankara, TR', browser: 'Edge 126.0', isCurrent: false, time: 'Dün, 19:40' },
  ]);

  useEffect(() => {
    getSecuritySessions()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setActiveSessions(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleTerminate = async (id) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await terminateSession(id);
    } catch (e) {
      // Local fallback
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={globalStyles.title}>Güvenlik & Risk Yönetimi</Text>
      <Text style={globalStyles.subtitle}>Cihaz biyometrisi, 2FA güvenlik tercihleri ve aktif oturumlar.</Text>

      {/* Risk Assessment Box */}
      <View style={styles.riskCard}>
        <View style={styles.riskHeader}>
          <Text style={styles.riskCardTitle}>Cihaz & Oturum Risk Değerlendirmesi</Text>
          <View style={styles.safeBadge}>
            <Text style={styles.safeBadgeText}>GÜVENLİ (%2 Risk)</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Cihaz Parmak İzi</Text>
            <Text style={styles.metricValSuccess}>Eşleşti (Güvenilir)</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Cihaz İstemcisi</Text>
            <Text style={styles.metricVal}>iOS / Android Mobile</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Giriş Yöntemi</Text>
            <Text style={styles.metricVal}>2-Min OTP + Push</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Anomali Skoru</Text>
            <Text style={styles.metricValSuccess}>0.02 (Çok Düşük)</Text>
          </View>
        </View>
      </View>

      {/* Security Preferences */}
      <View style={globalStyles.card}>
        <Text style={styles.sectionTitle}>Güvenlik Tercihleri & İzinler</Text>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.rowTitle}>2FA / OTP Doğrulama</Text>
            <Text style={styles.rowDesc}>Her girişte e-posta veya SMS ile 6 haneli kod iste.</Text>
          </View>
          <Switch
            value={twoFactorEnabled}
            onValueChange={setTwoFactorEnabled}
            trackColor={{ false: '#334155', true: colors.primary }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.rowTitle}>Biyometrik / FaceID Girişi</Text>
            <Text style={styles.rowDesc}>TouchID veya FaceID ile hızlı güvenli oturum aç.</Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{ false: '#334155', true: colors.primary }}
            thumbColor="#FFF"
          />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.rowTitle}>Anlık Fraud Bildirimleri</Text>
            <Text style={styles.rowDesc}>Şüpheli işlem veya yüksek tutarlı transfer uyarısı.</Text>
          </View>
          <Switch
            value={fraudAlertsEnabled}
            onValueChange={setFraudAlertsEnabled}
            trackColor={{ false: '#334155', true: colors.primary }}
            thumbColor="#FFF"
          />
        </View>
      </View>

      {/* Active Sessions */}
      <View style={globalStyles.card}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sectionTitle}>Aktif Oturumlar ({activeSessions.length})</Text>
        </View>

        {activeSessions.map((session) => (
          <View key={session.id} style={styles.sessionItem}>
            <Text style={styles.deviceIcon}>
              {session.device.includes('iPhone') ? '📱' : session.device.includes('MacBook') ? '💻' : '🖥️'}
            </Text>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.deviceName}>{session.device}</Text>
                {session.isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Bu Cihaz</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sessionMeta}>
                IP: {session.ip} • {session.location}
              </Text>
            </View>

            {!session.isCurrent && (
              <TouchableOpacity
                style={styles.terminateBtn}
                onPress={() => handleTerminate(session.id)}
              >
                <Text style={styles.terminateText}>Kapat</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  riskCard: {
    backgroundColor: 'rgba(0, 242, 254, 0.06)',
    borderColor: 'rgba(0, 242, 254, 0.2)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  riskCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  safeBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  safeBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  metricLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
  },
  metricVal: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  metricValSuccess: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  sessionHeader: {
    marginBottom: 6,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  deviceIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  deviceName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  currentBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  sessionMeta: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  terminateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  terminateText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default SecurityScreen;
