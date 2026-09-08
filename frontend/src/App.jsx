import React, { useState, useEffect, useRef } from 'react';
import { checkEmail, login, verifyPassword, register, verifyOtp } from './api/authApi';
import MainDashboardView from './view/MainDashboardView';
import tokerbankLogo from './assets/tokerbank-logo.png';
import './App.css';

// Şifre güç ölçer hesaplama
const calcPasswordStrength = (pwd) => {
  let score = 0;
  const rules = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };
  score = Object.values(rules).filter(Boolean).length;
  return { score, rules };
};

// Toast component
const FailedLoginToast = ({ info, onDismiss }) => {
  useEffect(() => {
    if (!info) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [info, onDismiss]);

  if (!info) return null;

  return (
    <div className="toast-popup toast-popup--visible">
      <span className="toast-icon">⚠️</span>
      <div>
        <strong>Başarısız giriş denemesi tespit edildi</strong>
        <p>Son başarısız deneme: <strong>{info}</strong></p>
      </div>
      <button className="toast-close" onClick={onDismiss}>✕</button>
    </div>
  );
};

function App() {
  // Steps: 'login' → 'login-otp' | 'register' → 'register-otp' → 'success'
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [otpMode, setOtpMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [failedLoginInfo, setFailedLoginInfo] = useState(null);
  const cardInnerRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(null);

  const { score: pwdScore, rules: pwdRules } = calcPasswordStrength(password);
  const pwdStrengthLabel = ['', 'Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü'][pwdScore] || '';
  const pwdStrengthColor = ['', '#ff4444', '#ff9100', '#ffcc00', '#00e676'][pwdScore] || '';
  const isPasswordValid = pwdRules.length && pwdRules.uppercase && pwdRules.number && pwdRules.special;

  useEffect(() => {
    if (!cardInnerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (cardInnerRef.current) {
        const innerHeight = cardInnerRef.current.getBoundingClientRect().height;
        const paddingY = step === 'register' ? 40 : 64;
        setCardHeight(innerHeight + paddingY);
      }
    });
    observer.observe(cardInnerRef.current);
    return () => observer.disconnect();
  }, [step]);

  useEffect(() => {
    let timer;
    if ((step === 'login-otp' || step === 'register-otp') && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [step, timeLeft]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setMessage(''); setError(''); setLoading(true);
    try {
      const res = await checkEmail(email);
      if (res.data.exists) {
        const loginRes = await login(email);
        if (loginRes.data.requiresPassword) {
          setMessage('Şifrenizi tekrar girerek OTP isteyin.');
          setStep('login');
        }
      } else {
        setMessage(`${email} adresi ile kayıtlı hesap bulunamadı. Yeni hesap oluşturun.`);
        setStep('register');
      }
    } catch (err) {
      setError(err.response?.status === 429
        ? 'Çok fazla istek! Lütfen bekleyin.'
        : err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  // Step 1: Şifre doğrulama (İlk Giriş Ekranı - Asenkron Anında Geçiş)
  const handleVerifyPassword = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) return;

    setError('');
    setMessage('Şifre doğrulanıyor ve doğrulama kodu gönderiliyor...');
    setOtpMode('login');
    setTimeLeft(120);
    setOtp('');
    setStep('login-otp');

    try {
      const res = await verifyPassword(email, password);
      setMessage(res.data.message || 'Şifre doğrulandı. OTP kodunuz e-posta adresinize gönderildi.');
      setUserName(res.data.firstName || '');
      if (res.data.lastFailedLoginAt) {
        setFailedLoginInfo(res.data.lastFailedLoginAt);
      } else {
        setFailedLoginInfo(null);
      }
      setPassword('');
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.userNotFound) {
        setMessage(`${email} adresi ile kayıtlı kullanıcı bulunamadı. Lütfen yeni hesap oluşturun.`);
        setStep('register');
      } else {
        setError(err.response?.data?.error || 'Şifre yanlış veya doğrulanamadı.');
        setStep('login');
      }
    }
  };

  // Step 2b: Register (Asenkron Anında Geçiş)
  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!isPasswordValid) { setError('Şifre tüm güvenlik kurallarını karşılamalıdır.'); return; }
    if (password !== confirmPassword) { setError('Şifreler eşleşmiyor.'); return; }

    setError('');
    setMessage('Hesap oluşturuluyor ve doğrulama kodu gönderiliyor...');
    setOtpMode('register');
    setTimeLeft(120);
    setOtp('');
    setStep('register-otp');

    try {
      const res = await register(email, firstName, lastName, password);
      setMessage(res.data.message || 'Kayıt başarılı! Doğrulama kodu e-postanıza gönderildi.');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Kayıt talebi başarısız.');
      setStep('register');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setMessage(''); setError(''); setLoading(true);
    try {
      if (otpMode === 'login') {
        const res = await verifyPassword(email, ''); // Will fail — use direct login resend
        setMessage(res.data.message || 'Yeni kod gönderildi.');
      } else {
        const res = await register(email, firstName, lastName, password);
        setMessage(res.data.message || 'Yeni kod gönderildi.');
      }
      setTimeLeft(120); setOtp('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  // Step 3: OTP doğrulama
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (timeLeft === 0) { setError('Kodun süresi doldu! Lütfen yeni kod isteyin.'); return; }
    setMessage(''); setError(''); setLoading(true);
    try {
      const res = await verifyOtp(email, otp, otpMode);
      setMessage(res.data.message);
      setUserName(res.data.firstName || '');
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  if (step === 'success') {
    return (
      <>
        <MainDashboardView userName={userName} email={email} onLogout={resetForm} />
        <FailedLoginToast info={failedLoginInfo} onDismiss={() => setFailedLoginInfo(null)} />
      </>
    );
  }

  return (
    <div className="login-container">
      <div 
        className={`login-card ${step === 'register' ? 'compact' : ''}`}
        style={{
          height: cardHeight ? `${cardHeight}px` : 'auto',
          transition: 'height 0.45s cubic-bezier(0.16, 1, 0.3, 1), padding 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        <div ref={cardInnerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="login-brand" style={step === 'register' ? { marginBottom: '10px' } : {}}>
            <img src={tokerbankLogo} alt="TokerBank Logo" style={{ width: step === 'register' ? '42px' : '60px', height: 'auto', marginBottom: '6px' }} />
            <h2 className="login-title" style={step === 'register' ? { fontSize: '20px', marginBottom: '8px' } : {}}>TokerBank Digital</h2>
            {step !== 'register' && <p className="login-subtitle">Enterprise Auth &amp; AI Fraud Shield</p>}
          </div>

        {message && <div className="alert-message success">{message}</div>}
        {error && <div className="alert-message error">{error}</div>}

        {/* Step 1: Giriş Ekranı (E-Posta + Şifre) */}
        {step === 'login' && (
          <form className="login-form" onSubmit={handleVerifyPassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">E-POSTA ADRESİ</label>
              <input id="email" type="email" className="form-input"
                placeholder="ornek@gmail.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="login-pwd">ŞİFRE</label>
              <div className="password-input-wrapper">
                <input id="login-pwd"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required />
                <button type="button" className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading || !password || !email}>
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap →'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button 
                type="button" 
                style={{ 
                  background: '#db002b', border: 'none', color: '#FFFFFF', 
                  fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', 
                  padding: '12px 24px', borderRadius: '8px'
                }}
                onClick={() => { resetForm(); setStep('register'); }}
              >
                Kayıt Ol
              </button>
            </div>
          </form>
        )}

        {/* Step 2b: Kayıt Formu */}
        {step === 'register' && (
          <form className="login-form" style={{ gap: '10px' }} onSubmit={handleRegister}>
            <p className="step-info" style={{ marginBottom: '4px' }}>
              <strong>{email}</strong> ile yeni hesap oluşturun:
            </p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">AD</label>
                <input id="firstName" type="text" className="form-input"
                  placeholder="Adınız" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">SOYAD</label>
                <input id="lastName" type="text" className="form-input"
                  placeholder="Soyadınız" value={lastName}
                  onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-pwd">ŞİFRE OLUŞTUR</label>
              <div className="password-input-wrapper">
                <input id="reg-pwd"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input" placeholder="En az 8 karakter"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Güç Ölçer */}
              {password.length > 0 && (
                <div className="password-strength">
                  <div className="strength-bar-track">
                    <div className="strength-bar-fill"
                      style={{ width: `${(pwdScore / 4) * 100}%`, background: pwdStrengthColor }} />
                  </div>
                  <span className="strength-label" style={{ color: pwdStrengthColor }}>
                    {pwdStrengthLabel}
                  </span>
                  <ul className="password-rules">
                    <li className={pwdRules.length ? 'rule-ok' : 'rule-fail'}>
                      {pwdRules.length ? '✓' : '✗'} En az 8 karakter
                    </li>
                    <li className={pwdRules.uppercase ? 'rule-ok' : 'rule-fail'}>
                      {pwdRules.uppercase ? '✓' : '✗'} En az 1 büyük harf
                    </li>
                    <li className={pwdRules.number ? 'rule-ok' : 'rule-fail'}>
                      {pwdRules.number ? '✓' : '✗'} En az 1 rakam
                    </li>
                    <li className={pwdRules.special ? 'rule-ok' : 'rule-fail'}>
                      {pwdRules.special ? '✓' : '✗'} En az 1 özel karakter
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-pwd">ŞİFRE TEKRAR</label>
              <div className="password-input-wrapper">
                <input id="confirm-pwd"
                  type={showConfirm ? 'text' : 'password'}
                  className={`form-input ${confirmPassword && password !== confirmPassword ? 'input-error' : ''}`}
                  placeholder="Şifrenizi tekrar girin"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <button type="button" className="password-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span className="field-error">Şifreler eşleşmiyor</span>
              )}
            </div>
            <button type="submit" className="btn btn-primary"
              disabled={loading || !isPasswordValid || password !== confirmPassword || !firstName || !lastName}>
              {loading ? 'Kaydediliyor...' : 'Kayıt Ol →'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>← Geri Dön</button>
          </form>
        )}

        {/* Step 3a: Login OTP */}
        {step === 'login-otp' && (
          <form className="login-form" onSubmit={handleOtpSubmit}>
            <p className="step-info">
              Hoş geldiniz{userName ? `, ${userName}` : ''}!<br />
              <span className="email-display">{maskEmail(email)}</span> adresine gönderilen 6 haneli kodu girin.
            </p>
            <div className={`timer-badge ${timeLeft === 0 ? 'expired' : ''}`}>
              {timeLeft > 0
                ? <><span>⏱</span> Kalan Süre: <strong>{formatTime(timeLeft)}</strong></>
                : <><span>⚠️</span> Kodun süresi doldu (2 dk). Yeni kod isteyin.</>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="otp">6 HANELİ DOĞRULAMA KODU</label>
              <input id="otp" type="text" className="form-input otp-input"
                placeholder="••••••" value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required maxLength="6" disabled={timeLeft === 0} autoFocus />
            </div>
            <button type="submit" className="btn btn-success" disabled={loading || timeLeft === 0}>
              {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>
            <button type="button" className="btn btn-outline" onClick={handleResendOtp} disabled={loading}>
              Kodu Tekrar Gönder
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>← Geri Dön</button>
          </form>
        )}

        {/* Step 3b: Register OTP */}
        {step === 'register-otp' && (
          <form className="login-form" onSubmit={handleOtpSubmit}>
            <p className="step-info">
              <span className="email-display">{maskEmail(email)}</span> adresine gönderilen kayıt doğrulama kodunu girin.
            </p>
            <div className={`timer-badge ${timeLeft === 0 ? 'expired' : ''}`}>
              {timeLeft > 0
                ? <><span>⏱</span> Kalan Süre: <strong>{formatTime(timeLeft)}</strong></>
                : <><span>⚠️</span> Kodun süresi doldu. Yeni kod isteyin.</>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-register">6 HANELİ DOĞRULAMA KODU</label>
              <input id="otp-register" type="text" className="form-input otp-input"
                placeholder="••••••" value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required maxLength="6" disabled={timeLeft === 0} autoFocus />
            </div>
            <button type="submit" className="btn btn-success" disabled={loading || timeLeft === 0}>
              {loading ? 'Doğrulanıyor...' : 'Doğrula ve Kayıt Tamamla'}
            </button>
            <button type="button" className="btn btn-outline" onClick={handleResendOtp} disabled={loading}>
              Kodu Tekrar Gönder
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>← Geri Dön</button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}

export default App;