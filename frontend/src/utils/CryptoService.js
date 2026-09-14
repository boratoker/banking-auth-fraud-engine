/**
 * Utility for WebCrypto API
 * Handles generating key pairs and signing transactions for Transaction Signing
 */

const KEY_NAME = 'tokerbank-private-key';

export const generateAndEnrollKeyPair = async () => {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      true, // extractable
      ["sign", "verify"]
    );

    // Export private key as JWK and save to localStorage (In real world, use IndexedDB/non-extractable keys)
    const privateJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    localStorage.setItem(KEY_NAME, JSON.stringify(privateJwk));

    // Export public key as SPKI (PEM format-ish)
    const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const pubKeyBase64 = arrayBufferToBase64(spki);
    
    return {
      publicKey: `-----BEGIN PUBLIC KEY-----\n${pubKeyBase64}\n-----END PUBLIC KEY-----`,
      success: true
    };
  } catch (err) {
    console.error("Key generation failed:", err);
    return { success: false, error: err.message };
  }
};

export const hasEnrolledKey = () => {
  return !!localStorage.getItem(KEY_NAME);
};

export const signPayload = async (payloadString) => {
  try {
    const privateJwkStr = localStorage.getItem(KEY_NAME);
    if (!privateJwkStr) throw new Error("No private key found. Please enroll device.");

    const privateJwk = JSON.parse(privateJwkStr);
    
    // Import the JWK back into a CryptoKey
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      privateJwk,
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      false, // non-extractable after import
      ["sign"]
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);

    const signature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" }
      },
      privateKey,
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
