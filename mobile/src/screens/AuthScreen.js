import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Vibration,
} from 'react-native';
import { checkEmail, login, verifyPassword, register, verifyOtp, enrollDevice } from '../api/authApi';
import { generateAndEnrollKeyPair, hasEnrolledKey } from '../utils/CryptoService';
import { getDeviceInfo } from '../utils/DeviceUtils';
import { colors } from '../theme/colors';
import { globalStyles } from '../theme/styles';

const animateLayout = () => {
  try {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  } catch (e) {}
};

// Şifre güç hesaplama
const calcPasswordStrength = (pwd) => {
  const rules = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(pwd),
  };
  const score = Object.values(rules).filter(Boolean).length;
  return { score, rules };
};

const STRENGTH_COLORS = ['', '#ff4444', '#ff9100', '#ffcc00', '#00e676'];
const STRENGTH_LABELS = ['', 'Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü'];

const AuthScreen = ({ onAuthSuccess }) => {
  const [step, setStepState] = useState('login');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPasswordState] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessageState] = useState('');
  const [error, setErrorState] = useState('');
  const [userName, setUserName] = useState('');
  const [otpMode, setOtpMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [failedLoginInfo, setFailedLoginInfo] = useState(null);

  const [pushNotification, setPushNotification] = useState(null);
  const pushAnim = useRef(new Animated.Value(-150)).current;

  const showInAppPush = (title, body) => {
    setPushNotification({ title, body });
    Vibration.vibrate([0, 250, 100, 250]); // Titreşim (SMS/Push hissi)
    Animated.spring(pushAnim, {
      toValue: 20,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // 10 saniye sonra gizle
    setTimeout(() => {
      dismissInAppPush();
    }, 10000);
  };

  const dismissInAppPush = () => {
    Animated.timing(pushAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setPushNotification(null));
  };

  const setStep = (newStep) => { animateLayout(); setStepState(newStep); };
  const setPassword = (val) => { animateLayout(); setPasswordState(val); };
  const setMessage = (msg) => { animateLayout(); setMessageState(msg); };
  const setError = (err) => { animateLayout(); setErrorState(err); };

  const { score: pwdScore, rules: pwdRules } = calcPasswordStrength(password);
  const isPasswordValid = pwdRules.length && pwdRules.uppercase && pwdRules.number && pwdRules.special;

  // OTP countdown
  useEffect(() => {
    let timer;
    if ((step === 'login-otp' || step === 'register-otp') && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [step, timeLeft]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const maskEmail = (str) => {
    if (!str?.includes('@')) return str;
    const [u, d] = str.split('@');
    return `${u.length > 2 ? u.slice(0, 2) + '***' : u + '***'}@${d}`;
  };

  const resetForm = () => {
    setStep('login'); setEmail(''); setFirstName(''); setLastName('');
    setPassword(''); setConfirmPassword(''); setOtp('');
    setMessage(''); setError(''); setUserName(''); setOtpMode('login'); setTimeLeft(120);
  };

  // Step 1: E-posta kontrol
  const handleCheckEmail = async () => {
    if (!email || !email.includes('@')) { setError('Lütfen geçerli bir e-posta giriniz.'); return; }
    setMessage(''); setError(''); setLoading(true);
    try {
      const res = await checkEmail(email);
      if (res.data.exists) {
        const loginRes = await login(email);
        if (loginRes.data.requiresPassword) {
          setUserName(loginRes.data.firstName || '');
          setStep('login-password');
        }
      } else {
        setMessage(`${email} adresi ile hesap bulunamadı. Yeni hesap oluşturun.`);
        setStep('register');
      }
    } catch (err) {
      setError(err.response?.status === 429
        ? 'Çok fazla istek! Bekleyin.'
        : err.response?.data?.error || 'Sunucu bağlantı hatası.');
    } finally { setLoading(false); }
  };

  // Step 2a: Şifre doğrulama
  const handleVerifyPassword = async () => {
    if (!password || !email) { setError('Lütfen e-posta ve şifrenizi giriniz.'); return; }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await verifyPassword(email, password);
      // Başarılıysa OTP ekranına geç
      setMessage(res.data.message || 'Şifre doğrulandı.');
      
      if (res.data.isPushOtp && res.data.devPushOtpCode) {
        showInAppPush("TokerBank Mobil Onay", `Giriş Kodunuz: ${res.data.devPushOtpCode}`);
      }
      
      setUserName(res.data.firstName || '');
      if (res.data.lastFailedLoginAt) {
        setFailedLoginInfo(res.data.lastFailedLoginAt);
      } else {
        setFailedLoginInfo(null);
      }

      setOtpMode('login');
      setTimeLeft(120);
      setOtp('');
      setStep('login-otp');
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.userNotFound) {
        setMessage(`${email} adresi ile kayıtlı kullanıcı bulunamadı. Lütfen yeni hesap oluşturun.`);
        setStep('register');
      } else {
        setError(err.response?.data?.error || 'Şifre yanlış lütfen tekrar deneyiniz.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: Kayıt
  const handleRegister = async () => {
    if (!email || !email.includes('@')) { setError('Lütfen geçerli bir e-posta giriniz.'); return; }
    if (!firstName || !lastName) { setError('Ad ve soyadı doldurunuz.'); return; }
    if (!isPasswordValid) { setError('Şifre tüm güvenlik kurallarını karşılamalıdır.'); return; }
    if (password !== confirmPassword) { setError('Şifreler eşleşmiyor.'); return; }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await register(email, firstName, lastName, password);
      setMessage(res.data.message || 'Kayıt başarılı!');
      
      if (res.data.isPushOtp && res.data.devPushOtpCode) {
        showInAppPush("TokerBank Mobil Onay", `Kayıt Doğrulama Kodunuz: ${res.data.devPushOtpCode}`);
      }
      
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

  // Resend OTP
  const handleResendOtp = async () => {
    setMessage(''); setError(''); setLoading(true);
    try {
      if (otpMode === 'register') {
        const res = await register(email, firstName, lastName, password);
        setMessage(res.data.message || 'Yeni kod gönderildi.');
        if (res.data.isPushOtp && res.data.devPushOtpCode) {
          showInAppPush("TokerBank Mobil Onay", `Kayıt Doğrulama Kodunuz: ${res.data.devPushOtpCode}`);
        }
      } else {
        const res = await verifyPassword(email, password);
        setMessage(res.data.message || 'Yeni kod gönderildi.');
        if (res.data.isPushOtp && res.data.devPushOtpCode) {
          showInAppPush("TokerBank Mobil Onay", `Giriş Kodunuz: ${res.data.devPushOtpCode}`);
        }
      }
      setTimeLeft(120); setOtp('');
    } catch (err) {
      setError(err.response?.data?.error || 'Kod gönderilemedi.');
    } finally { setLoading(false); }
  };

  // Step 3: OTP doğrulama
  const handleOtpSubmit = async () => {
    if (timeLeft === 0) { setError('Kodun süresi doldu! Yeni kod isteyin.'); return; }
    if (!otp || otp.length < 6) { setError('6 haneli kodu giriniz.'); return; }
    setMessage(''); setError('Cihaz kaydediliyor, lütfen bekleyin...'); setLoading(true);
    try {
      const res = await verifyOtp(email, otp, otpMode);
      
      // Kriptografik anahtar üretimi ve kaydı
      const isEnrolled = await hasEnrolledKey();
      if (!isEnrolled) {
        const keyRes = await generateAndEnrollKeyPair();
        if (keyRes.success) {
          const deviceName = getDeviceInfo();
          const userId = res.data.userId || email; // fallback to email if userId not returned
          await enrollDevice(userId, keyRes.publicKey, deviceName);
        }
      }

      const name = res.data.firstName || userName || 'Değerli Müşterimiz';
      setPassword(''); // Başarılı olunca şifreyi temizle
      onAuthSuccess({ email, userName: name, failedLoginInfo });
    } catch (err) {
      setError(err.response?.data?.error || 'Doğrulama başarısız.');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Özel In-App Push Notification (Üstten Düşen Banner) */}
      <Animated.View style={[styles.inAppPushContainer, { transform: [{ translateY: pushAnim }] }]}>
        <TouchableOpacity style={styles.inAppPushContent} activeOpacity={0.8} onPress={dismissInAppPush}>
          <Image source={require('../assets/tokerbank logo.png')} style={styles.inAppPushIcon} />
          <View style={styles.inAppPushTextContainer}>
            <Text style={styles.inAppPushTitle}>{pushNotification?.title}</Text>
            <Text style={styles.inAppPushBody}>{pushNotification?.body}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
        {/* Header */}
        <View style={[styles.headerBox, step === 'register' && { marginBottom: 10 }]}>
          <Image
            source={require('../assets/tokerbank logo.png')}
            style={{ width: step === 'register' ? 44 : 64, height: step === 'register' ? 44 : 64, resizeMode: 'contain', marginBottom: 6 }}
          />
          <Text style={[styles.appTitle, step === 'register' && { fontSize: 20 }]}>TokerBank Mobil</Text>
          {step !== 'register' && <Text style={styles.appSubtitle}>Enterprise Auth & AI Fraud Shield</Text>}
        </View>

        {message ? (
          <View style={globalStyles.alertSuccess}><Text style={globalStyles.alertSuccessText}>{message}</Text></View>
        ) : null}
        {error ? (
          <View style={globalStyles.alertError}><Text style={globalStyles.alertErrorText}>{error}</Text></View>
        ) : null}

        {/* Step 1: Giriş Ekranı (E-Posta + Şifre) */}
        {step === 'login' && (
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

            <Text style={globalStyles.label}>ŞİFRE</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[globalStyles.input, { paddingRight: 44 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textDim}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[globalStyles.btnPrimary, { marginTop: 16 }]}
              onPress={handleVerifyPassword}
              disabled={loading || !password || !email}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={globalStyles.btnPrimaryText}>Giriş Yap ➔</Text>}
            </TouchableOpacity>
            
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={() => { resetForm(); setStep('register'); }} 
                style={{ backgroundColor: '#db002b', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8, width: '100%', alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2b: Kayıt */}
        {step === 'register' && (
          <View style={globalStyles.inputGroup}>
            <Text style={[styles.stepInfo, { marginBottom: 10 }]}>
              Yeni hesap oluşturun:
            </Text>

            <Text style={globalStyles.label}>E-POSTA ADRESİ</Text>
            <TextInput 
              style={[globalStyles.input, { marginBottom: 15 }]} 
              placeholder="ornek@gmail.com"
              placeholderTextColor={colors.textDim} 
              value={email} 
              onChangeText={setEmail} 
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={globalStyles.label}>AD</Text>
                <TextInput style={globalStyles.input} placeholder="Adınız"
                  placeholderTextColor={colors.textDim} value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={globalStyles.label}>SOYAD</Text>
                <TextInput style={globalStyles.input} placeholder="Soyadınız"
                  placeholderTextColor={colors.textDim} value={lastName} onChangeText={setLastName} />
              </View>
            </View>

            <Text style={[globalStyles.label, { marginTop: 10 }]}>ŞİFRE OLUŞTUR</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[globalStyles.input, { paddingRight: 44 }]}
                placeholder="En az 8 karakter"
                placeholderTextColor={colors.textDim}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Şifre Güç Ölçer */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthTrack}>
                  <View style={[styles.strengthFill, {
                    width: `${(pwdScore / 4) * 100}%`,
                    backgroundColor: STRENGTH_COLORS[pwdScore] || '#333',
                  }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[pwdScore] }]}>
                  {STRENGTH_LABELS[pwdScore]}
                </Text>
                <View style={[styles.rulesBox, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                  {[
                    [pwdRules.length, 'En az 8 kr.'],
                    [pwdRules.uppercase, '1 Büyük harf'],
                    [pwdRules.number, '1 Rakam'],
                    [pwdRules.special, '1 Özel kar. (!@#$)'],
                  ].map(([ok, label]) => (
                    <Text key={label} style={[styles.ruleItem, { width: '48%', color: ok ? colors.success : colors.textDim, fontSize: 11 }]}>
                      {ok ? '✓' : '✗'} {label}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            <Text style={[globalStyles.label, { marginTop: 10 }]}>ŞİFRE TEKRAR</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[globalStyles.input, { paddingRight: 44 },
                  confirmPassword && password !== confirmPassword ? styles.inputError : null]}
                placeholder="Şifrenizi tekrar girin"
                placeholderTextColor={colors.textDim}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {confirmPassword && password !== confirmPassword && (
              <Text style={styles.fieldError}>Şifreler eşleşmiyor</Text>
            )}

            <TouchableOpacity
              style={[globalStyles.btnPrimary, { marginTop: 14 },
                (!isPasswordValid || password !== confirmPassword || !firstName || !lastName)
                  ? { opacity: 0.5 } : null]}
              onPress={handleRegister}
              disabled={loading || !isPasswordValid || password !== confirmPassword || !firstName || !lastName}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={globalStyles.btnPrimaryText}>Kayıt Ol ➔</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={resetForm}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Geri Dön</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3a: Login OTP */}
        {step === 'login-otp' && (
          <View style={globalStyles.inputGroup}>
            <Text style={styles.stepInfo}>
              Hoş geldiniz{userName ? `, ${userName}` : ''}!{'\n'}
              <Text style={{ fontWeight: 'bold', color: colors.text }}>Mobil cihazınıza</Text> gönderilen 6 haneli kodu giriniz.
            </Text>
            <View style={[globalStyles.timerBadge, timeLeft === 0 && globalStyles.timerBadgeExpired]}>
              <Text style={[globalStyles.timerText, timeLeft === 0 && globalStyles.timerTextExpired]}>
                {timeLeft > 0 ? `⏱ Kalan: ${formatTime(timeLeft)}` : '⚠️ Kodun süresi doldu.'}
              </Text>
            </View>
            <Text style={globalStyles.label}>6 HANELİ KOD</Text>
            <TextInput
              style={[globalStyles.input, styles.otpInput]}
              placeholder="••••••" placeholderTextColor={colors.textDim}
              keyboardType="number-pad" maxLength={6}
              value={otp} onChangeText={setOtp} editable={timeLeft > 0}
            />
            <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 16 }]}
              onPress={handleOtpSubmit} disabled={loading || timeLeft === 0}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={globalStyles.btnPrimaryText}>Giriş Yap</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={globalStyles.btnSecondary} onPress={handleResendOtp} disabled={loading}>
              <Text style={globalStyles.btnSecondaryText}>Kodu Tekrar Gönder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={resetForm}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Farklı E-posta Gir</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3b: Register OTP */}
        {step === 'register-otp' && (
          <View style={globalStyles.inputGroup}>
            <Text style={styles.stepInfo}>
              <Text style={{ fontWeight: 'bold', color: colors.text }}>Mobil cihazınıza</Text> gönderilen kayıt doğrulama kodunu giriniz.
            </Text>
            <View style={[globalStyles.timerBadge, timeLeft === 0 && globalStyles.timerBadgeExpired]}>
              <Text style={[globalStyles.timerText, timeLeft === 0 && globalStyles.timerTextExpired]}>
                {timeLeft > 0 ? `⏱ Kalan: ${formatTime(timeLeft)}` : '⚠️ Süresi doldu.'}
              </Text>
            </View>
            <Text style={globalStyles.label}>6 HANELİ KOD</Text>
            <TextInput
              style={[globalStyles.input, styles.otpInput]}
              placeholder="••••••" placeholderTextColor={colors.textDim}
              keyboardType="number-pad" maxLength={6}
              value={otp} onChangeText={setOtp} editable={timeLeft > 0}
            />
            <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 16 }]}
              onPress={handleOtpSubmit} disabled={loading || timeLeft === 0}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={globalStyles.btnPrimaryText}>Doğrula ve Tamamla</Text>}
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
    </View>
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
  shieldIcon: { fontSize: 40, marginBottom: 8 },
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
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  strengthContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  strengthTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  rulesBox: {
    gap: 3,
  },
  ruleItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  inputError: {
    borderColor: colors.danger,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  otpInput: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 6,
    color: colors.primary,
  },
  inAppPushContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  inAppPushContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inAppPushIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginRight: 12,
  },
  inAppPushTextContainer: {
    flex: 1,
  },
  inAppPushTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  inAppPushBody: {
    fontSize: 13,
    color: '#666666',
  },
});

export default AuthScreen;
