import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { checkEmail, login, register, verifyOtp } from '../api/authApi';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const AuthScreen = ({ onAuthSuccess }) => {
  const [step, setStep] = useState('email'); // 'email' | 'login-otp' | 'register' | 'register-otp'
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [otpMode, setOtpMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 min countdown

  useEffect(() => {
    let timer;
    if ((step === 'login-otp' || step === 'register-otp') && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const maskEmail = (str) => {
    if (!str || !str.includes('@')) return str;
    const [user, domain] = str.split('@');
    const maskedUser = user.length > 2 ? user.slice(0, 2) + '***' : user + '***';
    return `${maskedUser}@${domain}`;
  };

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setFirstName('');
    setLastName('');
    setOtp('');
    setMessage('');
    setError('');
    setUserName('');
    setOtpMode('login');
    setTimeLeft(120);
  };

  const handleCheckEmail = async () => {
    if (!email || !email.includes('@')) {
      setError('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await checkEmail(email);
      const { exists } = response.data;

      if (exists) {
        const loginRes = await login(email);
        setMessage(loginRes.data.message);
        setUserName(loginRes.data.firstName || '');
        setOtpMode('login');
        setTimeLeft(120);
        setOtp('');
        setStep('login-otp');
      } else {
        setMessage(`${email} ile kayıtlı hesap bulunamadı. Lütfen yeni hesap oluşturun.`);
        setStep('register');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Çok fazla istek! Lütfen biraz bekleyin.');
      } else {
        setError(err.response?.data?.error || 'Sunucu bağlantı hatası.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName) {
      setError('Lütfen ad ve soyad alanlarını doldurunuz.');
      return;
    }
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await register(email, firstName, lastName);
      setMessage(response.data.message);
      setOtpMode('register');
      setTimeLeft(120);
      setOtp('');
      setStep('register-otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Kayıt talebi başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setMessage('');
    setError('');
    setLoading(true);

    try {
      if (otpMode === 'login') {
        const loginRes = await login(email);
        setMessage(loginRes.data.message || 'Yeni doğrulama kodu gönderildi.');
      } else {
        const regRes = await register(email, firstName, lastName);
        setMessage(regRes.data.message || 'Yeni doğrulama kodu gönderildi.');
      }
      setTimeLeft(120);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.error || 'Kod tekrar gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (timeLeft === 0) {
      setError('Kodun süresi doldu! Lütfen "Kodu Tekrar Gönder" butonuna tıklayınız.');
      return;
    }
    if (!otp || otp.length < 6) {
      setError('Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await verifyOtp(email, otp, otpMode);
      const name = response.data.firstName || userName || 'Değerli Müşterimiz';
      onAuthSuccess({ email, userName: name });
    } catch (err) {
      setError(err.response?.data?.error || 'Doğrulama başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.headerBox}>
          <Text style={styles.shieldIcon}>🛡️</Text>
          <Text style={styles.appTitle}>TokerBank Mobil</Text>
          <Text style={styles.appSubtitle}>Enterprise Auth & AI Fraud Shield</Text>
        </View>

        {message ? (
          <View style={globalStyles.alertSuccess}>
            <Text style={globalStyles.alertSuccessText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={globalStyles.alertError}>
            <Text style={globalStyles.alertErrorText}>{error}</Text>
          </View>
        ) : null}

        {/* Step 1: Check Email */}
        {step === 'email' && (
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>E-POSTA ADRESİ</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="ornek@gmail.com"
              placeholderTextColor={colors.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity
              style={[globalStyles.btnPrimary, { marginTop: 16 }]}
              onPress={handleCheckEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#090D16" />
              ) : (
                <Text style={globalStyles.btnPrimaryText}>Devam Et ➔</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2a: Login OTP */}
        {step === 'login-otp' && (
          <View style={globalStyles.inputGroup}>
            <Text style={styles.stepInfo}>
              Hoş geldiniz{userName ? `, ${userName}` : ''}!{'\n'}
              <Text style={{ fontWeight: 'bold', color: colors.text }}>{maskEmail(email)}</Text> adresine gönderilen 6 haneli kodu giriniz.
            </Text>

            <View style={[globalStyles.timerBadge, timeLeft === 0 && globalStyles.timerBadgeExpired]}>
              <Text style={[globalStyles.timerText, timeLeft === 0 && globalStyles.timerTextExpired]}>
                {timeLeft > 0 ? `⏱ Kalan Süre: ${formatTime(timeLeft)}` : '⚠️ Kodun süresi doldu (2 dk).'}
              </Text>
            </View>

            <Text style={globalStyles.label}>6 HANELİ DOĞRULAMA KODU</Text>
            <TextInput
              style={[globalStyles.input, styles.otpInput]}
              placeholder="••••••"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              editable={timeLeft > 0}
            />

            <TouchableOpacity
              style={[globalStyles.btnPrimary, { marginTop: 16 }]}
              onPress={handleOtpSubmit}
              disabled={loading || timeLeft === 0}
            >
              {loading ? <ActivityIndicator color="#090D16" /> : <Text style={globalStyles.btnPrimaryText}>Giriş Yap</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={globalStyles.btnSecondary} onPress={handleResendOtp} disabled={loading}>
              <Text style={globalStyles.btnSecondaryText}>Kodu Tekrar Gönder</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={resetForm}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Farklı E-posta Gir</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2b: Register Form */}
        {step === 'register' && (
          <View style={globalStyles.inputGroup}>
            <Text style={styles.stepInfo}>
              <Text style={{ color: colors.primary }}>{email}</Text> adresi ile yeni hesap oluşturun:
            </Text>

            <Text style={globalStyles.label}>AD</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="Adınız"
              placeholderTextColor={colors.textDim}
              value={firstName}
              onChangeText={setFirstName}
            />

            <Text style={[globalStyles.label, { marginTop: 12 }]}>SOYAD</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="Soyadınız"
              placeholderTextColor={colors.textDim}
              value={lastName}
              onChangeText={setLastName}
            />

            <TouchableOpacity
              style={[globalStyles.btnPrimary, { marginTop: 20 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#090D16" /> : <Text style={globalStyles.btnPrimaryText}>Kayıt Ol</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={resetForm}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Geri Dön</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Register OTP */}
        {step === 'register-otp' && (
          <View style={globalStyles.inputGroup}>
            <Text style={styles.stepInfo}>
              <Text style={{ fontWeight: 'bold', color: colors.text }}>{maskEmail(email)}</Text> adresine gönderilen kayıt doğrulama kodunu giriniz.
            </Text>

            <View style={[globalStyles.timerBadge, timeLeft === 0 && globalStyles.timerBadgeExpired]}>
              <Text style={[globalStyles.timerText, timeLeft === 0 && globalStyles.timerTextExpired]}>
                {timeLeft > 0 ? `⏱ Kalan Süre: ${formatTime(timeLeft)}` : '⚠️ Kodun süresi doldu.'}
              </Text>
            </View>

            <Text style={globalStyles.label}>6 HANELİ DOĞRULAMA KODU</Text>
            <TextInput
              style={[globalStyles.input, styles.otpInput]}
              placeholder="••••••"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              editable={timeLeft > 0}
            />

            <TouchableOpacity
              style={[globalStyles.btnPrimary, { marginTop: 16 }]}
              onPress={handleOtpSubmit}
              disabled={loading || timeLeft === 0}
            >
              {loading ? <ActivityIndicator color="#090D16" /> : <Text style={globalStyles.btnPrimaryText}>Doğrula ve Tamamla</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={globalStyles.btnSecondary} onPress={handleResendOtp} disabled={loading}>
              <Text style={globalStyles.btnSecondaryText}>Kodu Tekrar Gönder</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={resetForm}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Geri Dön</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  appTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  stepInfo: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  otpInput: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 6,
    color: colors.primary,
  },
});

export default AuthScreen;
