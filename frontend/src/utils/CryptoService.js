/**
 * Utility for WebCrypto API
 * Handles generating key pairs and signing transactions for Transaction Signing
 *
 * Özel anahtar "non-extractable" olarak üretilir ve CryptoKey nesnesi olarak IndexedDB'de saklanır:
 * JavaScript dahil hiçbir kod anahtarın ham baytlarını dışarı aktaramaz, yalnızca imza attırabilir.
 */

import { enrollDevicePublicKey } from '../api/bankingApi';

const DB_NAME = 'tokerbank-keystore';
const STORE_NAME = 'keys';
const KEY_ID = 'transaction-signing-key';

const openKeyStore = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const idbRequest = async (mode, fn) => {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const req = fn(tx.objectStore(STORE_NAME));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const loadKeyRecord = () => idbRequest('readonly', (store) => store.get(KEY_ID));
const saveKeyRecord = (record) => idbRequest('readwrite', (store) => store.put(record, KEY_ID));

/**
 * İmzalanan kanonik transfer verisi. Backend (SigningClient.canonicalTransferPayload) aynı metni
 * istek alanlarından yeniden üretir; bu iki format birebir aynı olmalıdır.
 */
export const buildTransferPayload = (recipientIban, amount, description) =>
  `IBAN:${recipientIban},AMOUNT:${String(Number(amount))},DESC:${description ?? ''}`;

export const generateAndEnrollKeyPair = async () => {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      false, // non-extractable: özel anahtar dışarı aktarılamaz
      ["sign", "verify"]
    );

    // Export public key as SPKI (PEM format-ish) — açık anahtar her zaman dışa aktarılabilir
    const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const pubKeyBase64 = arrayBufferToBase64(spki);
    const publicKey = `-----BEGIN PUBLIC KEY-----\n${pubKeyBase64}\n-----END PUBLIC KEY-----`;

    await saveKeyRecord({ privateKey: keyPair.privateKey, publicKey });

    return {
      publicKey,
      success: true
    };
  } catch (err) {
    console.error("Key generation failed:", err);
    return { success: false, error: err.message };
  }
};

export const hasEnrolledKey = async () => {
  try {
    return !!(await loadKeyRecord());
  } catch {
    return false;
  }
};

/** Kayıtlı açık anahtarı döner; yoksa yeni anahtar çifti üretir. */
export const getOrCreatePublicKey = async () => {
  const record = await loadKeyRecord().catch(() => null);
  if (record?.publicKey) {
    return { publicKey: record.publicKey, success: true };
  }
  return generateAndEnrollKeyPair();
};

/**
 * Cihazın açık anahtarını oturumdaki kullanıcı adına backend'e kaydeder (idempotent).
 * Girişten hemen sonra ve imza öncesinde çağrılır.
 */
export const ensureDeviceEnrolled = async (deviceName = 'Web Tarayıcı') => {
  const keyRes = await getOrCreatePublicKey();
  if (!keyRes.success) throw new Error(keyRes.error);
  await enrollDevicePublicKey(keyRes.publicKey, deviceName);
};

export const signPayload = async (payloadString) => {
  try {
    const record = await loadKeyRecord();
    if (!record) throw new Error("No private key found. Please enroll device.");

    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);

    const signature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" }
      },
      record.privateKey,
      data
    );

    return {
      signature: arrayBufferToBase64(signature),
      success: true
    };
  } catch (err) {
    console.error("Signing failed:", err);
    return { success: false, error: err.message };
  }
};

// Helper
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
