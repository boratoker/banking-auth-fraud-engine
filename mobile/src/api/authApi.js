import apiClient from './config';

const AUTH_PREFIX = '/api/v1/auth';

export const checkEmail = async (email) => {
  return await apiClient.post(`${AUTH_PREFIX}/check-email`, { email });
};

export const login = async (email) => {
  return await apiClient.post(`${AUTH_PREFIX}/login`, { email });
};

export const verifyPassword = async (email, password) => {
  return await apiClient.post(`${AUTH_PREFIX}/verify-password`, { email, password });
};

export const register = async (email, firstName, lastName, password) => {
  return await apiClient.post(`${AUTH_PREFIX}/register`, { email, firstName, lastName, password });
};

export const verifyOtp = async (email, otp, mode) => {
  return await apiClient.post(`${AUTH_PREFIX}/verify-otp`, { email, otp, mode });
};
