/**
 * Canonical transfer payload. The backend (SigningClient.canonicalTransferPayload)
 * rebuilds exactly the same text from the request fields.
 */
export const buildTransferPayload = (recipientIban, amount, description) =>
  `IBAN:${recipientIban},AMOUNT:${String(Number(amount))},DESC:${description ?? ''}`;

export const signPayload = async (payloadString) => {
  try {
    const record = await loadKeyRecord();
    if (!record) throw new Error("No private key found. Please enroll device.");

    const data = new TextEncoder().encode(payloadString);

    const signature = await window.crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      record.privateKey,
      data
    );

    return { signature: arrayBufferToBase64(signature), success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
