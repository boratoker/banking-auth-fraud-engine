// TokerBank Mobile API Configuration
import axios from 'axios';
import Constants from 'expo-constants';

const getHostIp = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return window.location.hostname;
  }
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    return hostUri.split(':')[0];
  }
  return 'localhost';
};

const hostIp = getHostIp();
export const BASE_URL = `http://${hostIp}:8080`;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'TokerBank-Mobile-iOS-Android',
  },
  timeout: 10000,
});

export default apiClient;

