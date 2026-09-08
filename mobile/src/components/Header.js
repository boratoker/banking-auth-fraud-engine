import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const Header = ({ userName, email, onLogout }) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.branding}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>🛡️ TB</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>TokerBank</Text>
          <Text style={styles.userSub}>
            {userName ? `Hoş geldin, ${userName}` : email || 'Mobil Dijital Kanal'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Çıkış</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  brandTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  userSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Header;
