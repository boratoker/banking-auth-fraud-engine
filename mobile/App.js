import React, { useState } from 'react';
import { View, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import AuthScreen from './src/screens/AuthScreen';
import DashboardOverviewScreen from './src/screens/DashboardOverviewScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import TransferScreen from './src/screens/TransferScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import { colors } from './src/theme/colors';

export default function App() {
  const [user, setUser] = useState(null); // { email, userName }
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'accounts' | 'transfer' | 'transactions' | 'security'

  const handleLogout = () => {
    setUser(null);
    setActiveTab('overview');
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AuthScreen onAuthSuccess={setUser} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Header userName={user.userName} email={user.email} onLogout={handleLogout} />

      <View style={styles.screenContainer}>
        {activeTab === 'overview' && (
          <DashboardOverviewScreen onNavigate={setActiveTab} />
        )}
        {activeTab === 'accounts' && <AccountsScreen />}
        {activeTab === 'transfer' && <TransferScreen />}
        {activeTab === 'transactions' && <TransactionsScreen />}
        {activeTab === 'security' && <SecurityScreen />}
      </View>

      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
    </SafeAreaView>
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
});
