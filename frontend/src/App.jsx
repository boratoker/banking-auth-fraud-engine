import React, { useState } from 'react';
import { login, verifyOtp } from './api/authApi';

function App() {
  const [step, setStep] = useState(1); // Step 1: Login, Step 2: OTP
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await login(username);
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
      const response = await verifyOtp(username, otp);
      setMessage(response.data);
    } catch (err) {
      setError('OTP Doğrulama Başarısız: ' + (err.response?.data || err.message));
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2>Banking Digital Login</h2>

      {message && <div style={{ color: 'green', marginBottom: '10px' }}>{message}</div>}
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {step === 1 ? (
        <form onSubmit={handleLoginSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label>Kullanıcı Adı: </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#007bff', color: '#fff', border: 'none' }}>
            OTP Gönder
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label>6 Haneli OTP Kodu: </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength="6"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#28a745', color: '#fff', border: 'none' }}>
            Doğrula ve Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{ width: '100%', padding: '10px', marginTop: '5px', background: '#6c757d', color: '#fff', border: 'none' }}
          >
            Geri Dön
          </button>
        </form>
      )}
    </div>
  );
}

export default App;