import axios from 'axios';

const API_BASE_URL = '/api/v1/banking';

export const getOverviewData = async () => {
  return await axios.get(`${API_BASE_URL}/overview`);
};

export const getAccounts = async () => {
  return await axios.get(`${API_BASE_URL}/accounts`);
};

export const getCardDetails = async () => {
  return await axios.get(`${API_BASE_URL}/cards`);
};

export const toggleCardFreeze = async (isFrozen) => {
  return await axios.post(`${API_BASE_URL}/cards/toggle-freeze`, { isFrozen });
};

export const toggleCardSetting = async (key, value) => {
  return await axios.post(`${API_BASE_URL}/cards/toggle-setting`, { key, value });
};

export const submitTransfer = async (transferData) => {
  return await axios.post(`${API_BASE_URL}/transfers`, transferData);
};

export const verifyTransferOtp = async (otpData) => {
  return await axios.post(`${API_BASE_URL}/transfers/verify-otp`, otpData);
};

export const getSecuritySessions = async () => {
  return await axios.get(`${API_BASE_URL}/security/sessions`);
};

export const terminateSession = async (id) => {
  return await axios.post(`${API_BASE_URL}/security/terminate-session`, { id });
};

export const getTransactions = async () => {
  return await axios.get(`${API_BASE_URL}/transactions`);
};

export const getContacts = async () => {
  return await axios.get(`${API_BASE_URL}/contacts`);
};
