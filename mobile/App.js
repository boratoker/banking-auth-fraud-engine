import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AuthScreen from './src/screens/AuthScreen';
import DashboardOverviewScreen from './src/screens/DashboardOverviewScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import TransferScreen from './src/screens/TransferScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import { colors } from './src/theme/colors';
import { StatusBar, Platform, Vibration, ActivityIndicator } from 'react-native';
import { getPendingPushChallenges, verifyPushApproval, getPushNotifications } from './src/api/bankingApi';

// Başarısız giriş uyarı Toast bileşeni
const FailedLoginToast = ({ info, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [currentInfo, setCurrentInfo] = useState(null);

  useEffect(() => {
    if (info) {
      setCurrentInfo(info);
      slideAnim.setValue(120);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.9);

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 8 }),
      ]).start();

      const t = setTimeout(() => dismiss(), 5000);
      return () => clearTimeout(t);
    }
  }, [info]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onDismiss();
      setCurrentInfo(null);
    });
  };

  if (!currentInfo && !info) return null;

  return (
    <Animated.View style={[
      styles.toast,
      {
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        opacity: opacityAnim,
      }
    ]}>
      <Text style={styles.toastIcon}>⚠️</Text>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>Başarısız giriş denemesi tespit edildi</Text>
        <Text style={styles.toastBody}>Son başarısız deneme: <Text style={{ fontWeight: 'bold' }}>{currentInfo || info}</Text></Text>
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.toastClose}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// İşlem Onayı Banner Bileşeni
const TransactionPushBanner = ({ transaction, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      Vibration.vibrate([0, 250, 100, 250]);
      Animated.spring(slideAnim, {
        toValue: Platform.OS === 'ios' ? 40 : 20,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [transaction]);

  const dismiss = (callback) => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
      if (callback) callback();
    });
  };

  const handleAction = async (action) => {
    if (loading) return;
    setLoading(true);
    try {
      await verifyPushApproval({
        transactionId: transaction.transactionId,
        action: action,
      });
      if (action === 'REJECT') {
        Vibration.vibrate([0, 100, 100, 100]);
      } else {
        Vibration.vibrate(200);
      }
      dismiss();
    } catch (err) {
      console.log('Action error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Animated.View style={[styles.inAppPushContainer, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.inAppPushContent}>
        <Image source={require('./src/assets/tokerbank logo.png')} style={styles.inAppPushIcon} />
        <View style={styles.inAppPushTextContainer}>
          <Text style={styles.inAppPushTitle}>
            {transaction.status === 'CRITICAL_PUSH_CHALLENGED' ? '🔴 Kritik İşlem Onayı' : 'İşlem Onayı'}
          </Text>
          <Text style={styles.inAppPushBody}>
            {transaction.recipient} kişisine ₺{Number(transaction.amount).toLocaleString('tr-TR')} transfer edilecek.
          </Text>
        </View>
      </View>
      
      <View style={styles.inAppPushActions}>
        <TouchableOpacity style={styles.inAppPushBtnApprove} onPress={() => handleAction('APPROVE')}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.inAppPushBtnText}>ONAYLA</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.inAppPushBtnReject} onPress={() => handleAction('REJECT')}>
          <Text style={[styles.inAppPushBtnText, { color: '#f87171' }]}>REDDET</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const AlertPushBanner = ({ alert, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (alert) {
      Vibration.vibrate([0, 250, 100, 250]);
      Animated.spring(slideAnim, {
        toValue: Platform.OS === 'ios' ? 40 : 20,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      const t = setTimeout(() => dismiss(), 8000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!alert) return null;

  return (
    <Animated.View style={[styles.inAppPushContainer, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.inAppPushContent}>
        <Image source={require('./src/assets/tokerbank logo.png')} style={styles.inAppPushIcon} />
        <View style={styles.inAppPushTextContainer}>
          <Text style={styles.inAppPushTitle}>🚨 Sistem Bildirimi</Text>
          <Text style={styles.inAppPushBody}>{alert}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.inAppPushBtnReject} onPress={dismiss}>
        <Text style={[styles.inAppPushBtnText, { color: '#333' }]}>KAPAT</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(null); // { email, userName }
  const [activeTab, setActiveTab] = useState('overview');
  const [failedLoginInfo, setFailedLoginInfo] = useState(null);
  const [pendingTxn, setPendingTxn] = useState(null);
  const [pendingAlert, setPendingAlert] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let pollInterval;
    if (user) {
      const checkForPending = async () => {
        if (!pendingTxn) {
          try {
            const res = await getPendingPushChallenges();
            if (res.data && res.data.length > 0) {
              setPendingTxn(res.data[0]);
            }
          } catch (err) {}
        }
        if (!pendingAlert) {
          try {
            const res = await getPushNotifications();
            if (res.data && res.data.hasNotification) {
              setPendingAlert(res.data.message);
            }
          } catch (err) {}
        }
      };
      
      checkForPending();
      pollInterval = setInterval(checkForPending, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user, pendingTxn]);

  const handleLogout = () => {
    setUser(null);
    setActiveTab('overview');
    setFailedLoginInfo(null);
    import('./src/api/config').then(m => m.setAuthEmail(null));
  };

  const handleAuthSuccess = ({ email, userName, failedLoginInfo: fli }) => {
    setUser({ email, userName });
    if (fli) setFailedLoginInfo(fli);
    import('./src/api/config').then(m => m.setAuthEmail(email));
  };


  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <Image
          source={require('./src/assets/tokerbank android loading screen.png')}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <Header userName={user.userName} email={user.email} onLogout={handleLogout} />

        <View style={styles.screenContainer}>
          {activeTab === 'overview' && <DashboardOverviewScreen onNavigate={setActiveTab} />}
          {activeTab === 'accounts' && <AccountsScreen />}
          {activeTab === 'transfer' && <TransferScreen />}
          {activeTab === 'transactions' && <TransactionsScreen />}
          {activeTab === 'security' && <SecurityScreen />}
        </View>

        <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Başarısız giriş toast popup */}
        <FailedLoginToast
          info={failedLoginInfo}
          onDismiss={() => setFailedLoginInfo(null)}
        />
        
        {/* İşlem Onayı Banner */}
        <TransactionPushBanner 
          transaction={pendingTxn} 
          onDismiss={() => setPendingTxn(null)} 
        />
        
        {/* Sistem Uyarı / Transfer Bildirim Banner */}
        <AlertPushBanner 
          alert={pendingAlert} 
          onDismiss={() => setPendingAlert(null)} 
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(30, 16, 0, 0.97)',
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  toastIcon: {
    fontSize: 22,
    marginTop: 1,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  toastBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  toastClose: {
    padding: 4,
  },
  inAppPushContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  inAppPushContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inAppPushIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    marginRight: 12,
  },
  inAppPushTextContainer: {
    flex: 1,
  },
  inAppPushTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  inAppPushBody: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  inAppPushActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inAppPushBtnApprove: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inAppPushBtnReject: {
    flex: 1,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inAppPushBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
});
