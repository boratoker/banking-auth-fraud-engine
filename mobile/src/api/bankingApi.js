import apiClient from './config';
import { getDeviceFingerprint, getIpAddress } from '../utils/DeviceUtils';
import { signPayload } from '../utils/CryptoService';

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

export const verifyPushChallenge = async (transactionId, email, otp) => {
  return await apiClient.post(`${BANKING_PREFIX}/verify-push`, { transactionId, email, otp });
};

export const getPushNotifications = async () => {
  return await apiClient.get(`${BANKING_PREFIX}/notifications/push`);
};

export const addDevBalance = async (amount) => {
  return await apiClient.post(`${BANKING_PREFIX}/dev/add-balance`, { amount });
};

export const submitTransfer = async (transferData) => {
  const payloadString = JSON.stringify(transferData);
  const signatureRes = await signPayload(payloadString);
  const fingerprint = await getDeviceFingerprint();
  const ipAddress = await getIpAddress();

  const dataWithSecurity = {
    ...transferData,
    signature: signatureRes.success ? signatureRes.signature : null,
    fingerprint,
    ipAddress
  };

  return await apiClient.post(`${BANKING_PREFIX}/transfers`, dataWithSecurity);
};

export const verifyTransferOtp = async (otpData) => {
  return await apiClient.post(`${BANKING_PREFIX}/transfers/verify-otp`, otpData);
};

export const getPendingPushChallenges = async () => {
  return await apiClient.get(`${BANKING_PREFIX}/transfers/pending-push`);
};

export const verifyPushApproval = async (data) => {
  return await apiClient.post(`${BANKING_PREFIX}/transfers/verify-push`, data);
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

export const getContacts = async () => {
  return await apiClient.get(`${BANKING_PREFIX}/contacts`);
};
