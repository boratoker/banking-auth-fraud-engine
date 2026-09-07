import React, { useState, useEffect } from 'react';
import { checkEmail, login, register, verifyOtp } from './api/authApi';
import MainDashboardView from './view/MainDashboardView';
import './App.css';

function App() {
  // Steps: 'email' → 'login-otp' | 'register' → 'register-otp' → 'success'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [otpMode, setOtpMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 dakika (120 saniye)

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

  // Step 1: E-posta kontrol
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const response = await checkEmail(email);
      const { exists } = response.data;

      if (exists) {
        // Kullanıcı var → login OTP gönder
        const loginRes = await login(email);
        setMessage(loginRes.data.message);
        setUserName(loginRes.data.firstName || '');
        setOtpMode('login');
        setTimeLeft(120);
        setOtp('');
        setStep('login-otp');
      } else {
        // Kullanıcı yok → register formu
        setMessage(`${email} adresi ile kayıtlı hesap bulunamadı. Lütfen ad ve soyadınızı girerek yeni hesap oluşturun.`);
        setStep('register');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Çok fazla istek! Lütfen biraz bekleyin.');
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: Register → OTP gönder
  const handleRegister = async (e) => {
    e.preventDefault();
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
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
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
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: OTP Doğrulama
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (timeLeft === 0) {
      setError('Kodun süresi doldu! Lütfen "Kodu Tekrar Gönder" butonuna tıklayarak yeni bir kod isteyiniz.');
      return;
    }
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const response = await verifyOtp(email, otp, otpMode);
      setMessage(response.data.message);
      setUserName(response.data.firstName || '');
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <MainDashboardView
        userName={userName}
        email={email}
        onLogout={resetForm}
      />
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Tokerbank Digital Login</h2>

        {message && <div className="alert-message success">{message}</div>}
        {error && <div className="alert-message error">{error}</div>}

        {/* Step 1: E-posta Giriş */}
        {step === 'email' && (
          <form className="login-form" onSubmit={handleCheckEmail}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                E-posta Adresi
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="ornek@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Kontrol ediliyor...' : 'Devam Et'}
            </button>
          </form>
        )}

        {/* Step 2a: Login OTP */}
        {step === 'login-otp' && (
          <form className="login-form" onSubmit={handleOtpSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp">
                6 Haneli Giriş Doğrulama Kodu
              </label>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 10px 0' }}>
                Hoş geldiniz{userName ? `, ${userName}` : ''}!<br />
                <strong>{maskEmail(email)}</strong> adresine gönderilen kodu giriniz.
              </p>
              
              <div className={`timer-badge ${timeLeft === 0 ? 'expired' : ''}`}>
                {timeLeft > 0 ? (
                  <>⏱ Kalan Süre: <strong>{formatTime(timeLeft)}</strong></>
                ) : (
                  <>⚠️ Kodun süresi doldu (2 dk). Lütfen yeni kod isteyin.</>
                )}
              </div>

              <input
                id="otp"
                type="text"
                className="form-input otp-input"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength="6"
                disabled={timeLeft === 0}
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-success" disabled={loading || timeLeft === 0}>
              {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>

            <button type="button" className="btn btn-outline" onClick={handleResendOtp} disabled={loading}>
              Kodu Tekrar Gönder
            </button>

            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Geri Dön
            </button>
          </form>
        )}

        {/* Step 2b: Register Form */}
        {step === 'register' && (
          <form className="login-form" onSubmit={handleRegister}>
            <div className="form-group">
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 6px 0' }}>
                <strong>{email}</strong> adresi ile kayıtlı hesap bulunamadı. Yeni hesap oluşturun:
              </p>
              <label className="form-label" htmlFor="firstName">Ad</label>
              <input
                id="firstName"
                type="text"
                className="form-input"
                placeholder="Adınız"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lastName">Soyad</label>
              <input
                id="lastName"
                type="text"
                className="form-input"
                placeholder="Soyadınız"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Geri Dön
            </button>
          </form>
        )}

        {/* Step 3: Register OTP */}
        {step === 'register-otp' && (
          <form className="login-form" onSubmit={handleOtpSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-register">
                6 Haneli Kayıt Doğrulama Kodu
              </label>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 10px 0' }}>
                <strong>{maskEmail(email)}</strong> adresine gönderilen doğrulama kodunu giriniz.
              </p>

              <div className={`timer-badge ${timeLeft === 0 ? 'expired' : ''}`}>
                {timeLeft > 0 ? (
                  <>⏱ Kalan Süre: <strong>{formatTime(timeLeft)}</strong></>
                ) : (
                  <>⚠️ Kodun süresi doldu (2 dk). Lütfen yeni kod isteyin.</>
                )}
              </div>

              <input
                id="otp-register"
                type="text"
                className="form-input otp-input"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength="6"
                disabled={timeLeft === 0}
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-success" disabled={loading || timeLeft === 0}>
              {loading ? 'Doğrulanıyor...' : 'Doğrula ve Kayıt Tamamla'}
            </button>

            <button type="button" className="btn btn-outline" onClick={handleResendOtp} disabled={loading}>
              Kodu Tekrar Gönder
            </button>

            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Geri Dön
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;