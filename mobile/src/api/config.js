// TokerBank Mobile API Configuration
import axios from 'axios';

// Default Spring Cloud Gateway URL
// Emülatör / Cihaz ip adresi ortam değişkeni veya varsayılan localhost (8080)
const API_HOST = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? `http://${window.location.hostname}:8080`
  : 'http://localhost:8080';

export const BASE_URL = API_HOST;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'TokerBank-Mobile-iOS-Android',
  },
  timeout: 10000,
});

export default apiClient;
