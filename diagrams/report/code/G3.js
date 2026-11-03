export const generateAndEnrollKeyPair = async () => {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      false, // non-extractable: the private key can never be exported
      ["sign", "verify"]
    );

    // Export only the public key in SPKI (PEM) format
    const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const pubKeyBase64 = arrayBufferToBase64(spki);
    const publicKey = `-----BEGIN PUBLIC KEY-----\n${pubKeyBase64}\n-----END PUBLIC KEY-----`;

    // The private CryptoKey object is stored in IndexedDB
    await saveKeyRecord({ privateKey: keyPair.privateKey, publicKey });

    return { publicKey, success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
