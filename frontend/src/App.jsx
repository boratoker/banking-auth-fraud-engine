import React, { useState } from 'react';
import { login, verifyOtp } from './api/authApi';
import './App.css';

function App() {
  const [step, setStep] = useState(1); // Step 1: Login (Email), Step 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const maskEmail = (str) => {
    if (!str || !str.includes('@')) return str;
    const [user, domain] = str.split('@');
    const maskedUser = user.length > 2 ? user.slice(0, 2) + '***' : user + '***';
    return `${maskedUser}@${domain}`;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await login(email);
      setMessage(response.data);
      setStep(2);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setError('Çok fazla istek atıldı! API Gateway Rate Limit devreye girdi.');
      } else {
        setError('Giriş isteği başarısız: ' + (err.response?.data || err.message));
      }
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await verifyOtp(email, otp);
      setMessage(response.data);
    } catch (err) {
      setError('OTP Doğrulama Başarısız: ' + (err.response?.data || err.message));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Banking Digital Login</h2>

        {message && <div className="alert-message success">{message}</div>}
        {error && <div className="alert-message error">{error}</div>}

        {step === 1 ? (
          <form className="login-form" onSubmit={handleLoginSubmit}>
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
            <button type="submit" className="btn btn-primary">
              E-postaya OTP Gönder
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleOtpSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp">
                6 Haneli E-posta Kodu
              </label>
              <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 10px 0' }}>
                <strong>{maskEmail(email)}</strong> adresine gönderilen doğrulama kodunu giriniz.
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
            <button type="submit" className="btn btn-success">
              Doğrula ve Giriş Yap
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
                setMessage('');
              }}
            >
              Geri Dön
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;