@DataJpaTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:concurrency;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
    // ... H2 test database settings ...
})
@Import(BankingService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ConcurrentTransferIntegrationTest {

    private static final int THREADS = 20;
    private static final BigDecimal INITIAL_BALANCE = new BigDecimal("1000.00");
    private static final BigDecimal TRANSFER_AMOUNT = new BigDecimal("100.00");

    @Test
    void concurrentTransfers_neverOverdraw_andBalanceStaysConsistent() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch startGate = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();

        for (int i = 0; i < THREADS; i++) {
            Callable<Boolean> task = () -> {
                startGate.await();
                try {
                    Transaction txn = bankingService.processTransfer(userId, accountId, "TR999999999999999999999999",
                            "Alıcı", TRANSFER_AMOUNT, "Eşzamanlılık testi", "FP-TEST", "127.0.0.1");
                    return "COMPLETED".equals(txn.getStatus());
                } catch (IllegalArgumentException insufficientBalance) {
                    return false;
                }
            };
            results.add(pool.submit(task));
        }

        startGate.countDown(); // all threads start at the same moment
        int succeeded = 0;
        for (Future<Boolean> f : results) {
            if (f.get()) succeeded++;
        }
        pool.shutdown();

        BigDecimal finalBalance = accountRepository.findById(accountId).orElseThrow().getBalance();
        int expectedSuccesses = INITIAL_BALANCE.divide(TRANSFER_AMOUNT).intValue(); // 10

        assertEquals(expectedSuccesses, succeeded, "Bakiye kadar transfer başarılı olmalı");
        assertEquals(0, finalBalance.compareTo(BigDecimal.ZERO), "Son bakiye 0 olmalı (eksiye düşmemeli)");
        assertEquals(0, INITIAL_BALANCE.subtract(TRANSFER_AMOUNT.multiply(BigDecimal.valueOf(succeeded)))
                .compareTo(finalBalance), "Başlangıç - başarılı transferler = son bakiye");
    }
}
