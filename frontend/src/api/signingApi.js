import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1/signing';

export const enrollDevice = async (userId, publicKey, deviceName) => {
  return await axios.post(`${API_BASE_URL}/enroll`, { userId, publicKey, deviceName });
};

export const verifySignature = async (userId, payload, signature) => {
  return await axios.post(`${API_BASE_URL}/verify`, { userId, payload, signature });
};
