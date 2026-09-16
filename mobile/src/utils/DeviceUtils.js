import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import 'react-native-get-random-values';

// Polyfill for base64 if needed, or simple string operations
export const getDeviceInfo = () => {
  return `${Device.modelName || 'Unknown Device'} (${Platform.OS} ${Device.osVersion})`;
};

export const getDeviceFingerprint = async () => {
  try {
    let fingerprint = null;
    if (Platform.OS === 'android') {
      fingerprint = Application.getAndroidId();
    } else if (Platform.OS === 'ios') {
      fingerprint = await Application.getIosIdForVendorAsync();
    }
    
    if (!fingerprint) {
      // Fallback
      fingerprint = `FP-${Platform.OS.toUpperCase()}-${Math.random().toString(36).substring(2, 10)}`;
    }
    return fingerprint;
  } catch (error) {
    return `FP-${Platform.OS.toUpperCase()}-FALLBACK`;
  }
};

export const getIpAddress = async () => {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip || '127.0.0.1';
  } catch (error) {
    return '127.0.0.1'; // Fallback
  }
};

export const getLocation = async () => {
  // Mock location for now, since expo-location requires permissions and physical device GPS
  return 'İstanbul, Türkiye (Mobile)';
};
