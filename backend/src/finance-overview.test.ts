import assert from "node:assert/strict";
import test from "node:test";
import { isOverviewPeriod, overviewPeriodStart, summariseFinance } from "./finance-overview";

test("periods start at Hong Kong midnight, Monday, the first of the month and the first of the quarter", () => {
  // 2026-10-13 01:30 in Hong Kong is still 2026-10-12 17:30 UTC; it is a Tuesday.
  const now = new Date("2026-10-12T17:30:00Z");
  assert.equal(overviewPeriodStart("today", now).toISOString(), "2026-10-12T16:00:00.000Z");
  assert.equal(overviewPeriodStart("week", now).toISOString(), "2026-10-11T16:00:00.000Z");
  assert.equal(overviewPeriodStart("month", now).toISOString(), "2026-09-30T16:00:00.000Z");
  assert.equal(overviewPeriodStart("quarter", now).toISOString(), "2026-09-30T16:00:00.000Z");
  assert.equal(overviewPeriodStart("quarter", new Date("2026-12-01T00:00:00Z")).toISOString(), "2026-09-30T16:00:00.000Z");
  assert.equal(overviewPeriodStart("week", new Date("2026-10-11T03:00:00Z")).toISOString(), "2026-10-04T16:00:00.000Z");
});

test("only the four known periods are accepted", () => {
  assert.equal(isOverviewPeriod("month"), true);
  assert.equal(isOverviewPeriod("year"), false);
  assert.equal(isOverviewPeriod(undefined), false);
});

test("totals are kept per currency, refunds are reported alongside what was received, and amounts are rounded", () => {
  const payments = [
    { total: 100.1, currency: "RMB", fareAmount: 60.1, cashAmount: 40, externalAmount: 0, status: "PAID" },
    { total: 200.2, currency: "RMB", fareAmount: 0, cashAmount: 0.2, externalAmount: 200, status: "REFUNDED" },
    { total: 50, currency: "HKD", fareAmount: 0, cashAmount: 0, externalAmount: 50, status: "PAID" },
  ];
  const summary = summariseFinance(payments, [{ amount: 70.555, currency: "RMB" }, { amount: 10, currency: "RMB" }]);
  assert.deepEqual(summary, [
    { currency: "HKD", payments: 1, received: 50, fareBalance: 0, cashBalance: 0, external: 50, refunded: 0, refundedPayments: 0, driverPending: 0, driverPendingTrips: 0 },
    { currency: "RMB", payments: 2, received: 300.3, fareBalance: 60.1, cashBalance: 40.2, external: 200, refunded: 200.2, refundedPayments: 1, driverPending: 80.56, driverPendingTrips: 2 },
  ]);
});

test("a currency with only pending driver payouts still gets a row, and no data gives no rows", () => {
  assert.deepEqual(summariseFinance([], []), []);
  assert.deepEqual(summariseFinance([], [{ amount: 30, currency: "HKD" }]).map((row) => [row.currency, row.received, row.driverPending]), [["HKD", 0, 30]]);
});
