import axios from 'axios';

// İstekler Vite proxy üzerinden API Gateway'e (8080) iletilir
const API_BASE_URL = '/api/v1/auth';

export const login = async (email) => {
    return await axios.post(`${API_BASE_URL}/login?email=${encodeURIComponent(email)}`);
};

export const verifyOtp = async (email, otp) => {
    return await axios.post(`${API_BASE_URL}/verify-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
};