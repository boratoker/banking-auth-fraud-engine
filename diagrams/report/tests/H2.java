@ExtendWith(MockitoExtension.class)
class SigningControllerTamperTest {

    private static final String ORIGINAL = "IBAN:TR330006100519786457841326,AMOUNT:100,DESC:Rent";

    // ... setup: a P-256 key pair is generated and enrolled for the user (mocked repository) ...

    @Test
    void originalPayload_isAccepted() throws Exception {
        String signature = sign(deviceKey, ORIGINAL);
        assertEquals(200, verify(ORIGINAL, signature).getStatusCode().value());
    }

    @Test
    void amountChangedByOneCent_isRejected() throws Exception {
        String signature = sign(deviceKey, ORIGINAL);
        String tampered = "IBAN:TR330006100519786457841326,AMOUNT:100.01,DESC:Rent";
        assertEquals(400, verify(tampered, signature).getStatusCode().value());
    }

    @Test
    void destinationIbanChanged_isRejected() throws Exception {
        String signature = sign(deviceKey, ORIGINAL);
        String tampered = "IBAN:TR990006100519786457849999,AMOUNT:100,DESC:Rent";
        assertEquals(400, verify(tampered, signature).getStatusCode().value());
    }

    @Test
    void descriptionChanged_isRejected() throws Exception {
        String signature = sign(deviceKey, ORIGINAL);
        String tampered = "IBAN:TR330006100519786457841326,AMOUNT:100,DESC:Gift";
        assertEquals(400, verify(tampered, signature).getStatusCode().value());
    }

    @Test
    void signatureFromUnenrolledDevice_isRejected() throws Exception {
        String attackerSignature = sign(newP256KeyPair(), ORIGINAL);
        assertEquals(400, verify(ORIGINAL, attackerSignature).getStatusCode().value());
    }

    // Same signature format as WebCrypto (raw r||s, P1363)
    private static String sign(KeyPair keyPair, String payload) throws Exception {
        Signature signer = Signature.getInstance("SHA256withECDSAinP1363Format");
        signer.initSign(keyPair.getPrivate());
        signer.update(payload.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signer.sign());
    }
}
