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

export const verifyOtp = async (email, otp, mode) => {
    return await axios.post(`${API_BASE_URL}/verify-otp`, { email, otp, mode });
};