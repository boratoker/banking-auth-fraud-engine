import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1/signing';

// Not: Cihaz kaydı oturum doğrulaması gerektirdiği için bankingApi.enrollDevicePublicKey üzerinden yapılır.
export const verifySignature = async (userId, payload, signature) => {
  return await axios.post(`${API_BASE_URL}/verify`, { userId, payload, signature });
};
