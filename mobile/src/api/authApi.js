import apiClient from './config';
import { getDeviceInfo, getDeviceFingerprint, getIpAddress, getLocation } from '../utils/DeviceUtils';

const AUTH_PREFIX = '/api/v1/auth';

export const checkEmail = async (email) => {
  return await apiClient.post(`${AUTH_PREFIX}/check-email`, { email });
};

export const login = async (email) => {
  return await apiClient.post(`${AUTH_PREFIX}/login`, { email });
};

export const verifyPassword = async (email, password) => {
  return await apiClient.post(`${AUTH_PREFIX}/verify-password`, { email, password, channel: 'MOBILE' });
};

export const register = async (email, firstName, lastName, password) => {
  return await apiClient.post(`${AUTH_PREFIX}/register`, { email, firstName, lastName, password, channel: 'MOBILE' });
};

export const verifyOtp = async (email, otp, mode) => {
  const deviceInfo = getDeviceInfo();
  const fingerprint = await getDeviceFingerprint();
  const ipAddress = await getIpAddress();
  const location = await getLocation();
  
  return await apiClient.post(`${AUTH_PREFIX}/verify-otp`, { 
    email, 
    otp, 
    mode,
    deviceInfo,
    fingerprint,
    ipAddress,
    location
  });
};

export const enrollDevice = async (userId, publicKey, deviceName) => {
  return await apiClient.post(`/api/v1/signing/enroll`, { userId, publicKey, deviceName });
};
