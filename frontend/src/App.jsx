import React, { useState } from 'react';
import { checkEmail, login, register, verifyOtp } from './api/authApi';
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
        setStep('login-otp');
      } else {
        // Kullanıcı yok → register formu
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
      setStep('register-otp');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: OTP Doğrulama
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
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

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Banking Digital Login</h2>

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
                6 Haneli Doğrulama Kodu
              </label>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 10px 0' }}>
                Hoş geldiniz{userName ? `, ${userName}` : ''}!<br />
                <strong>{maskEmail(email)}</strong> adresine gönderilen kodu giriniz.
              </p>
              <input
                id="otp"
                type="text"
                className="form-input otp-input"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength="6"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
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
                E-posta Doğrulama Kodu
              </label>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 10px 0' }}>
                <strong>{maskEmail(email)}</strong> adresine gönderilen 6 haneli doğrulama kodunu giriniz.
              </p>
              <input
                id="otp-register"
                type="text"
                className="form-input otp-input"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength="6"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Doğrulanıyor...' : 'Doğrula ve Kayıt Tamamla'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Geri Dön
            </button>
          </form>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="login-form">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p style={{ fontSize: '15px', color: 'var(--text)', margin: '0 0 20px 0' }}>
              {userName && <strong>Hoş geldiniz, {userName}!</strong>}
            </p>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;