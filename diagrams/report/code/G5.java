/**
 * Canonical signed transfer payload. The client signs the same format; the server
 * rebuilds this text from the request fields itself. If the IBAN, amount or description
 * is changed even by 1 cent after signing, the signature no longer matches.
 */
public static String canonicalTransferPayload(String recipientIban, Object amount, Object description) {
    String amountStr = new BigDecimal(String.valueOf(amount)).stripTrailingZeros().toPlainString();
    String desc = description == null ? "" : description.toString();
    return "IBAN:" + recipientIban + ",AMOUNT:" + amountStr + ",DESC:" + desc;
}
