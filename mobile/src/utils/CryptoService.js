import * as SecureStore from 'expo-secure-store';
import { ec as EC } from 'elliptic';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

const ec = new EC('p256');
const KEY_NAME = 'tokerbank-private-key';

export const generateAndEnrollKeyPair = async () => {
  try {
    const keyPair = ec.genKeyPair();
    
    // Private key as hex string
    const privKeyHex = keyPair.getPrivate('hex');
    await SecureStore.setItemAsync(KEY_NAME, privKeyHex);

    // Public key as hex string, then convert to base64 to match SPKI roughly,
    // Actually the backend expects SPKI X509. 
    // To keep it simple, we can send the raw uncompressed hex, BUT backend expects SPKI.
    // Let's create a minimal SPKI prefix for P-256: 
    // 3059 3013 0607 2a8648ce3d0201 0608 2a8648ce3d030107 0342 00
    const spkiPrefixHex = '3059301306072a8648ce3d020106082a8648ce3d030107034200';
    const pubKeyHex = keyPair.getPublic('hex'); // 04 + X + Y
    const fullSpkiHex = spkiPrefixHex + pubKeyHex;
    
    const pubKeyBase64 = Buffer.from(fullSpkiHex, 'hex').toString('base64');
    
    return {
      publicKey: `-----BEGIN PUBLIC KEY-----\n${pubKeyBase64}\n-----END PUBLIC KEY-----`,
      success: true
    };
  } catch (err) {
    console.error("Key generation failed:", err);
    return { success: false, error: err.message };
  }
};

export const hasEnrolledKey = async () => {
  const key = await SecureStore.getItemAsync(KEY_NAME);
  return !!key;
};

export const signPayload = async (payloadString) => {
  try {
    const privKeyHex = await SecureStore.getItemAsync(KEY_NAME);
    if (!privKeyHex) throw new Error("No private key found. Please enroll device.");

    const keyPair = ec.keyFromPrivate(privKeyHex, 'hex');
    
    // Hash payload first with SHA-256. Elliptic does not hash it for you.
    // We can use a pure JS SHA-256 or just rely on elliptic's internal hash if available.
    // Let's import a crypto hash or just use elliptic's hash
    const hash = ec.hash().update(payloadString).digest();
    
    const signature = keyPair.sign(hash);
    const signatureDer = signature.toDER('hex');
    const signatureBase64 = Buffer.from(signatureDer, 'hex').toString('base64');

    return {
      signature: signatureBase64,
      success: true
    };
  } catch (err) {
    console.error("Signing failed:", err);
    return { success: false, error: err.message };
  }
};
