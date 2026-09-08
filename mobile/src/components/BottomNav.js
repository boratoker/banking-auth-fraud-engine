import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';

const tabs = [
  { key: 'overview', label: 'Özet', icon: '📊' },
  { key: 'accounts', label: 'Hesap/Kart', icon: '💳' },
  { key: 'transfer', label: 'Transfer', icon: '💸' },
  { key: 'transactions', label: 'İşlemler', icon: '📜' },
  { key: 'security', label: 'Güvenlik', isLogo: true },
];

const BottomNav = ({ activeTab, onSelectTab }) => {
  return (
    <View style={styles.navContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onSelectTab(tab.key)}
            activeOpacity={0.7}
          >
            {tab.isLogo ? (
              <Image
                source={require('../assets/tokerbank logo.png')}
                style={{ width: 18, height: 18, resizeMode: 'contain', marginBottom: 2 }}
              />
            ) : (
              <Text style={styles.tabIcon}>{tab.icon}</Text>
            )}
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingBottom: 16,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});

export default BottomNav;
