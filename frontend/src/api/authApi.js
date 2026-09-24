import axios from 'axios';

// İstekler Vite proxy üzerinden API Gateway'e (8080) iletilir
const API_BASE_URL = '/api/v1/auth';

export const checkEmail = async (email) => {
    return await axios.post(`${API_BASE_URL}/check-email`, { email });
};

export const login = async (email) => {
    return await axios.post(`${API_BASE_URL}/login`, { email });
};

export const verifyPassword = async (email, password) => {
    return await axios.post(`${API_BASE_URL}/verify-password`, { email, password });
};

export const register = async (email, firstName, lastName, password) => {
    return await axios.post(`${API_BASE_URL}/register`, { email, firstName, lastName, password });
};

export const getWebFingerprint = () => {
  let fp = localStorage.getItem('device_fingerprint');
  if (!fp) {
    fp = 'FP-WEB-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('device_fingerprint', fp);
  }
  return fp;
};

export const verifyOtp = async (email, otp, mode = 'login') => {
  let deviceInfo = 'Bilgisayar';
  if (navigator.userAgent.includes('Mac')) deviceInfo = 'Apple Mac';
  else if (navigator.userAgent.includes('Win')) deviceInfo = 'Windows PC';
  else if (navigator.userAgent.includes('Linux')) deviceInfo = 'Linux PC';
  
  const browser = navigator.userAgent.substring(0, 50); // limit to 50 chars
  const deviceType = 'WEB';
  const fingerprint = getWebFingerprint();
  
  return await axios.post(`${API_BASE_URL}/verify-otp`, { 
    email, 
    otp, 
    mode,
    deviceInfo,
    browser,
    deviceType,
    fingerprint,
    location: 'İstanbul, Türkiye (Web)', // Eklendi: Yerel IP'de GeoIP çalışmayacağı için şimdilik Mock
    ipAddress: '127.0.0.1' // Web proxy dev environment
  });
};

export const forgotPasswordInit = async (email) => {
  return await axios.post(`${API_BASE_URL}/forgot-password/init`, { email });
};

export const forgotPasswordVerifyOtp = async (email, otp) => {
  return await axios.post(`${API_BASE_URL}/forgot-password/verify-otp`, { email, otp });
};

export const forgotPasswordReset = async (email, otp, newPassword) => {
  return await axios.post(`${API_BASE_URL}/forgot-password/reset`, { email, otp, newPassword });
};