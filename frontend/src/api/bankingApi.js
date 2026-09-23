import axios from 'axios';
import { getWebFingerprint } from './authApi';

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

export const toggleCardFreeze = async (cardId, isFrozen) => {
  return await axios.post(`${API_BASE_URL}/cards/toggle-freeze`, { cardId, isFrozen });
};

export const toggleCardSetting = async (cardId, key, value) => {
  return await axios.post(`${API_BASE_URL}/cards/toggle-setting`, { cardId, key, value });
};

export const submitTransfer = async (transferData) => {
  return await axios.post(`${API_BASE_URL}/transfers`, transferData);
};

export const verifyTransferOtp = async (otpData) => {
  return await axios.post(`${API_BASE_URL}/transfers/verify-otp`, otpData);
};

export const getPendingPushChallenges = async () => {
  return await axios.get(`${API_BASE_URL}/transfers/pending-push`);
};

export const verifyPushApproval = async (data) => {
  return await axios.post(`${API_BASE_URL}/transfers/verify-push`, data);
};

export const getTransferStatus = async (transactionId) => {
  return await axios.get(`${API_BASE_URL}/transfers/status/${transactionId}`);
};

export const getSecuritySessions = async () => {
  return await axios.get(`${API_BASE_URL}/security/sessions`, {
    headers: {
      'X-Device-Fingerprint': getWebFingerprint(),
      'X-Device-Type': 'WEB'
    }
  });
};

export const terminateSession = async (id) => {
  return await axios.post(`${API_BASE_URL}/security/terminate-session`, { id });
};

export const getSecuritySettings = async () => {
  return await axios.get(`${API_BASE_URL}/security/settings`);
};

export const updateSecuritySettings = async (updates) => {
  return await axios.put(`${API_BASE_URL}/security/settings`, updates);
};

export const requestLimitIncrease = async (newLimit) => {
  return await axios.post(`${API_BASE_URL}/security/settings/limit-request`, { newLimit });
};

export const verifyLimitIncrease = async (otp) => {
  return await axios.post(`${API_BASE_URL}/security/settings/limit-verify`, { otp });
};

export const getTransactions = async () => {
  return await axios.get(`${API_BASE_URL}/transactions`);
};

export const getContacts = async () => {
  return await axios.get(`${API_BASE_URL}/contacts`);
};

export const setAuthEmail = (email) => {
  if (email) {
    axios.defaults.headers.common['X-User-Email'] = email;
  } else {
    delete axios.defaults.headers.common['X-User-Email'];
  }
};
