# Order cancellation and refund reservations

When an order is cancelled, rejected or returned, stock now goes back to the exact inventory source used at checkout: the selected variant, or the base product when no variant was selected. The restoration movement includes its variant ID. Previously variant orders incorrectly increased base product stock and left variant stock depleted.

The transaction locks the order, then all affected products in primary-key order, then all affected variants in primary-key order. This matches checkout's inventory lock order. A repeated cancellation fails the status transition and cannot restore stock again. Existing historical stock/movement records are not rewritten; reconcile any earlier variant cancellations against actual inventory before correcting balances.

Refund endpoints create **requested refund records**, not gateway payouts. The order lock serializes reservations, and all non-rejected refund amounts are counted against the verified paid total. Concurrent full refund requests therefore cannot reserve the total twice; concurrent partial requests cannot exceed that total. Partial requests within the remaining balance can still create separate records; this is not general request-key deduplication. No online payment/refund execution or provider certification is established by these tests.

Run PostgreSQL transaction tests with:

```powershell
./scripts/run-local-postgres.ps1 -Mode test -TestLabels apps.operations.test_order_reversal_concurrency
```

The tests use independent connections and bounded SQL timeouts in a disposable database. They cover base/variant cancellation races and full/partial refund reservation limits. SQLite cannot verify row locks and skips these concurrency tests.

Verification: full PostgreSQL suite **157 passed** after the stock correction; afterward the final reversal module **5 passed**, including newly added rejection/return checks. Ruff passed and the restarted PostgreSQL backend returned HTTP 200. No frontend changes were made; no new frontend build or browser result is claimed for this milestone.
