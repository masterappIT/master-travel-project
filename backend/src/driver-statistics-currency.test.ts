import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(join(__dirname, "main.ts"), "utf8");
const helpers = source.slice(source.indexOf("function currencyCode("), source.indexOf("function parseQuoteExtras("));
const displayHelper = source.slice(source.indexOf("function driverTripDisplayResponse("), source.indexOf("function invitationTripResponse("));
const historyHandler = source.slice(source.indexOf('  @Get("trips")'), source.indexOf('  @Post("trips/:id/arrive")'));
const handler = source.slice(source.indexOf('  @Get("statistics")'), source.indexOf('  @Get("trips/active")'));
function fixture(trips: any[] = [], rate = 0.92) {
  const context = {
    Get: () => () => {}, Req: () => () => {}, Query: () => () => {},
    driverSessionFrom: async () => ({ sub: "test-driver" }),
    reviewedDriverFrom: async () => ({ session: { sub: "test-driver" } }),
    driverTripResponse: (trip: any) => ({ price: trip.driverPayoutAmount, currency: trip.driverPayoutCurrency, completedAt: trip.completedAt?.toISOString() }),
    appSettingsDefaults: { id: "default" }, currencyLabels: { RMB: "人民幣", HKD: "港幣" },
    HttpException: Error, HttpStatus: { BAD_REQUEST: 400, CONFLICT: 409 },
    roundMoney: (amount: number) => Math.round(amount * 100) / 100,
    prisma: {
      appSetting: { findUniqueOrThrow: async () => ({ exchangeRate: rate }) },
      trip: { findMany: async () => trips },
      driverTripCancellation: { findMany: async () => [] },
      driverOnlineSession: { findMany: async () => [] },
      driverRating: { findMany: async () => [] },
    },
  };
  const compiled = ts.transpileModule(`${helpers}\n${displayHelper}\nclass Controller { display(trip, currency, rate) { return driverTripDisplayResponse(trip, false, currency, rate); } ${handler}${historyHandler}}\nnew Controller()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText;
  return runInNewContext(compiled, context);
}
function trip(amount: number, currency: string, settled: boolean) {
  return { id: currency, completedAt: new Date(), driverPayoutAmount: amount,
    driverPayoutCurrency: currency, user: {}, settlement: settled ? { settledAt: new Date() } : null };
}
test("statistics convert each mixed-currency payout before aggregation", async () => {
  const controller = fixture([trip(100, "HKD", true), trip(100, "CNY", false)]);
  const cny = await controller.statistics({}, "CNY");
  assert.equal(cny.today.currency, "RMB");
  assert.equal(cny.today.earnings, 192);
  assert.equal(cny.month.earnings, 192);
  assert.equal(cny.settlement.settledEarnings, 92);
  assert.equal(cny.settlement.unsettledEarnings, 100);
  assert.equal(cny.recentOrders[0].price, 92);
  assert.equal(cny.recentOrders[0].currency, "RMB");
  assert.equal(cny.recentOrders[1].price, 100);
  assert.equal(cny.recentOrders[1].currency, "RMB");
  const hkd = await controller.statistics({}, "HKD");
  assert.equal(hkd.today.currency, "HKD");
  assert.equal(hkd.today.earnings, 208.7);
  assert.equal(hkd.recentOrders[0].price, 100);
  assert.equal(hkd.recentOrders[0].currency, "HKD");
  assert.equal(hkd.recentOrders[1].price, 108.7);
  assert.equal(hkd.recentOrders[1].currency, "HKD");
});
test("recent orders follow repeated currency changes without mutating payouts", async () => {
  const items = [trip(2360.83, "HKD", false)];
  const controller = fixture(items, 0.85);
  for (const currency of ["CNY", "HKD", "CNY"]) {
    const result = await controller.statistics({}, currency);
    assert.equal(result.recentOrders[0].price, currency === "HKD" ? 2360.83 : 2006.71);
    assert.equal(result.recentOrders[0].currency, currency === "HKD" ? "HKD" : "RMB");
  }
  assert.equal(items[0].driverPayoutAmount, 2360.83);
  assert.equal(items[0].driverPayoutCurrency, "HKD");
});
test("empty income uses selected currency and invalid conversion fails explicitly", async () => {
  const empty = await fixture().statistics({}, "CNY");
  assert.equal(empty.today.earnings, 0);
  assert.equal(empty.today.currency, "RMB");
  await assert.rejects(fixture().statistics({}, "USD"));
  await assert.rejects(fixture([trip(100, "HKD", false)], 0).statistics({}, "CNY"));
  await assert.rejects(fixture([trip(100, "", false)]).statistics({}, "CNY"));
});

test("history converts amounts to selected currency without modifying source trips", async () => {
  const items = [trip(720, "HKD", false), trip(100, "RMB", true)];
  const controller = fixture(items);
  const result = await controller.history({}, "CNY");
  assert.equal(result[0].price, 662.4);
  assert.equal(result[0].currency, "RMB");
  assert.equal(result[1].price, 100);
  const hkd = await controller.history({}, "HKD");
  assert.equal(hkd[0].price, 720);
  assert.equal(hkd[0].currency, "HKD");
  assert.equal(hkd[1].price, 108.7);
  const cnyAgain = await controller.history({}, "CNY");
  assert.equal(cnyAgain[0].price, 662.4);
  assert.equal(items[0].driverPayoutAmount, 720);
  assert.equal(items[0].driverPayoutCurrency, "HKD");
});

test("new trip display converts HKD to CNY and preserves HKD source", () => {
  const controller = fixture();
  const item = trip(1239.72, "HKD", false);
  assert.equal(controller.display(item, "CNY", 0.85).price, 1053.76);
  assert.equal(controller.display(item, "CNY", 0.85).currency, "RMB");
  assert.equal(controller.display(item, "HKD", 0.85).price, 1239.72);
  assert.equal(controller.display(item, "HKD", 0.85).currency, "HKD");
  assert.equal(item.driverPayoutAmount, 1239.72);
});
