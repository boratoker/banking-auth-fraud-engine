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
import { StatusBar } from 'react-native';

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

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(null); // { email, userName }
  const [activeTab, setActiveTab] = useState('overview');
  const [failedLoginInfo, setFailedLoginInfo] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    setUser(null);
    setActiveTab('overview');
    setFailedLoginInfo(null);
  };

  const handleAuthSuccess = ({ email, userName, failedLoginInfo: fli }) => {
    setUser({ email, userName });
    if (fli) setFailedLoginInfo(fli);
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
});
