import axios from 'axios';

// Tüm istekler API Gateway (8080) üzerinden geçer
const API_BASE_URL = 'http://localhost:8080/api/v1/auth';

export const login = async (username) => {
    return await axios.post(`${API_BASE_URL}/login?username=${encodeURIComponent(username)}`);
};

export const verifyOtp = async (username, otp) => {
    return await axios.post(`${API_BASE_URL}/verify-otp?username=${encodeURIComponent(username)}&otp=${encodeURIComponent(otp)}`);
};