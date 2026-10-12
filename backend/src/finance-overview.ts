/** Read-only summaries for the finance centre, computed from payments and trips that already exist. */

export const OVERVIEW_PERIODS = ["today", "week", "month", "quarter"] as const;
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];

export function isOverviewPeriod(value: unknown): value is OverviewPeriod {
  return typeof value === "string" && (OVERVIEW_PERIODS as readonly string[]).includes(value);
}

/** The business runs on Hong Kong / Beijing time (UTC+8, no daylight saving), so periods start at local midnight. */
const LOCAL_OFFSET_MS = 8 * 3_600_000;

export function overviewPeriodStart(period: OverviewPeriod, now = new Date()): Date {
  const local = new Date(now.getTime() + LOCAL_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const startLocal =
    period === "today" ? Date.UTC(year, month, day)
    : period === "week" ? Date.UTC(year, month, day - ((local.getUTCDay() + 6) % 7))
    : period === "month" ? Date.UTC(year, month, 1)
    : Date.UTC(year, month - (month % 3), 1);
  return new Date(startLocal - LOCAL_OFFSET_MS);
}

export type PaymentFacts = { total: number; currency: string; fareAmount: number; cashAmount: number; externalAmount: number; status: string };
export type PendingPayoutFacts = { amount: number; currency: string };
export type CurrencySummary = { currency: string; payments: number; received: number; fareBalance: number; cashBalance: number; external: number; refunded: number; refundedPayments: number; driverPending: number; driverPendingTrips: number };

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Totals per payment currency. `total` and `externalAmount` are in the payment currency; `fareAmount` and `cashAmount` are
 * what was actually deducted from the wallets, which are kept in RMB. A refunded payment still counts as received (the money did come in) and is reported again
 * under refunds. No net income is derived: fees and the split with drivers are not defined as a single rule yet.
 */
export function summariseFinance(payments: PaymentFacts[], pendingPayouts: PendingPayoutFacts[]): CurrencySummary[] {
  const rows = new Map<string, CurrencySummary>();
  const row = (currency: string) => {
    if (!rows.has(currency)) rows.set(currency, { currency, payments: 0, received: 0, fareBalance: 0, cashBalance: 0, external: 0, refunded: 0, refundedPayments: 0, driverPending: 0, driverPendingTrips: 0 });
    return rows.get(currency)!;
  };
  for (const payment of payments) {
    const target = row(payment.currency);
    target.payments += 1;
    target.received += payment.total;
    target.fareBalance += payment.fareAmount;
    target.cashBalance += payment.cashAmount;
    target.external += payment.externalAmount;
    if (payment.status === "REFUNDED") {
      target.refunded += payment.total;
      target.refundedPayments += 1;
    }
  }
  for (const payout of pendingPayouts) {
    const target = row(payout.currency);
    target.driverPending += payout.amount;
    target.driverPendingTrips += 1;
  }
  return [...rows.values()]
    .map((item) => ({ ...item, received: round(item.received), fareBalance: round(item.fareBalance), cashBalance: round(item.cashBalance), external: round(item.external), refunded: round(item.refunded), driverPending: round(item.driverPending) }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
