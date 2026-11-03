@Transactional
public Transaction processTransfer(UUID userId, UUID sourceAccountId, String destIban, String recipientName,
                                   BigDecimal amount, String description,
                                   String deviceFingerprint, String ipAddress) {

    User user = userRepository.findById(userId)
        .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı."));

    // Lock the source account row (SELECT ... FOR UPDATE) for an atomic balance update
    Account sourceAccount = accountRepository.findByIdForUpdate(sourceAccountId)
        .orElseThrow(() -> new IllegalArgumentException("Kaynak hesap bulunamadı."));

    if (!sourceAccount.getUser().getId().equals(userId)) {
        throw new SecurityException("Hesap yetkisi yok.");
    }
    if (amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("Transfer tutarı sıfırdan büyük olmalıdır.");
    }
    if (sourceAccount.getBalance().compareTo(amount) < 0) {
        throw new IllegalArgumentException("Yetersiz bakiye.");
    }

    // ... daily transfer limit check and transaction record creation ...
}

private void executeTransfer(Transaction txn, Account sourceAccount, BigDecimal amountToSubtract) {
    sourceAccount.setBalance(sourceAccount.getBalance().subtract(amountToSubtract));
    accountRepository.save(sourceAccount);

    txn.setStatus("COMPLETED");
    txn.setCompletedAt(java.time.LocalDateTime.now());
    transactionRepository.save(txn);
    // ... the lock is released when the transaction commits ...
}
