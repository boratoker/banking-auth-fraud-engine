import apiClient from './config';

const BANKING_PREFIX = '/api/v1/banking';

export const getOverviewData = async () => {
  return await apiClient.get(`${BANKING_PREFIX}/overview`);
};

export const getAccounts = async () => {
  return await apiClient.get(`${BANKING_PREFIX}/accounts`);
};

export const getCardDetails = async () => {
  return await apiClient.get(`${BANKING_PREFIX}/cards`);
};

export const toggleCardFreeze = async (isFrozen) => {
  return await apiClient.post(`${BANKING_PREFIX}/cards/toggle-freeze`, { isFrozen });
};

export const toggleCardSetting = async (key, value) => {
  return await apiClient.post(`${BANKING_PREFIX}/cards/toggle-setting`, { key, value });
};

export const submitTransfer = async (transferData) => {
  return await apiClient.post(`${BANKING_PREFIX}/transfers`, transferData);
};

export const verifyTransferOtp = async (otpData) => {
  return await apiClient.post(`${BANKING_PREFIX}/transfers/verify-otp`, otpData);
};

export const getSecuritySessions = async () => {
  return await apiClient.get(`${BANKING_PREFIX}/security/sessions`);
};

export const terminateSession = async (id) => {
  return await apiClient.post(`${BANKING_PREFIX}/security/terminate-session`, { id });
};

export const getTransactions = async () => {
  return await apiClient.get(`${BANKING_PREFIX}/transactions`);
};
