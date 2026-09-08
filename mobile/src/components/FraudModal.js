import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const FraudModal = ({ visible, fraudData, otpInput, setOtpInput, onClose, onConfirm, loading }) => {
  if (!fraudData) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>AI Fraud Shield Uyarısı</Text>
          </View>

          <View style={styles.riskBadge}>
            <Text style={styles.riskBadgeText}>
              Risk Skoru: %{fraudData.riskScore || 68} (Şüpheli / Yüksek Tutar)
            </Text>
          </View>

          <Text style={styles.reasonText}>
            <Text style={{ fontWeight: 'bold' }}>Sebep: </Text>
            {fraudData.reason || 'Yüksek tutarlı FAST transferi (₺10,000+).'}
          </Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLine}>
              <Text style={{ color: colors.textMuted }}>Alıcı: </Text>
              {fraudData.recipient}
            </Text>
            <Text style={styles.summaryLine}>
              <Text style={{ color: colors.textMuted }}>IBAN: </Text>
              {fraudData.iban}
            </Text>
            <Text style={styles.summaryLine}>
              <Text style={{ color: colors.textMuted }}>Tutar: </Text>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                ₺{fraudData.amount?.toLocaleString('tr-TR')}
              </Text>
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>SMS 6-Haneli Doğrulama Kodu</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="123456"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              maxLength={6}
              value={otpInput}
              onChangeText={setOtpInput}
            />
            <Text style={styles.hint}>💡 Test OTP Kodu: 123456</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>İptal Et</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} disabled={loading}>
              <Text style={styles.confirmBtnText}>
                {loading ? 'Doğrulanıyor...' : 'Güvenle Onayla'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#111827',
    borderColor: 'rgba(255, 145, 0, 0.4)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  riskBadge: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderColor: 'rgba(255, 82, 82, 0.4)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  riskBadgeText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  reasonText: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 14,
  },
  summaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  summaryLine: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 4,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  otpInput: {
    backgroundColor: colors.inputBg,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
  },
  hint: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmBtnText: {
    color: '#090D16',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default FraudModal;
