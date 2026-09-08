import apiClient from './config';

const AUTH_PREFIX = '/api/v1/auth';

export const checkEmail = async (email) => {
  return await apiClient.post(`${AUTH_PREFIX}/check-email`, { email });
};

export const login = async (email) => {
  return await apiClient.post(`${AUTH_PREFIX}/login`, { email });
};

export const register = async (email, firstName, lastName) => {
  return await apiClient.post(`${AUTH_PREFIX}/register`, { email, firstName, lastName });
};

export const verifyOtp = async (email, otp, mode) => {
  return await apiClient.post(`${AUTH_PREFIX}/verify-otp`, { email, otp, mode });
};
