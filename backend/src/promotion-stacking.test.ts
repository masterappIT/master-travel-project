import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Runs the quote handler's own discount selection, lifted from main.ts, without starting the server.
const source = readFileSync(join(__dirname, "main.ts"), "utf8");
const start = source.indexOf("      const promotionDiscounts = eligiblePromotions.map((promotion) => {");
const end = source.indexOf("      const quotedLines =", start);
assert.ok(start > 0 && end > start, "discount selection block not found in main.ts");
const compiled = ts.transpileModule(
  `(function (eligiblePromotions, subtotal, couponCode) {\n${source.slice(start, end)}\nreturn applied;\n})`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText;

type Promotion = {
  id: string; name: string; kind: "CAMPAIGN" | "COUPON" | "MEMBER";
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "TOTAL_PRICE"; discountValue: number;
  stackingMode: "NONE" | "PERCENTAGE_AND_VOUCHER" | "ALL"; maximumDiscount: number | null;
  currency: string; priority: number;
};
const promotion = (id: string, overrides: Partial<Promotion>): Promotion => ({
  id, name: id, kind: "CAMPAIGN", discountType: "FIXED_AMOUNT", discountValue: 0,
  stackingMode: "ALL", maximumDiscount: null, currency: "RMB", priority: 0, ...overrides,
});
const applied = (eligible: Promotion[], subtotal: number, couponCode = "") => {
  const select = runInNewContext(compiled, {
    currency: "RMB",
    exchangeRate: 1,
    convertCurrency: (amount: number) => amount,
    roundMoney: (amount: number) => Math.round(amount * 100) / 100,
  });
  const result = select(eligible, subtotal, couponCode);
  return result && { discount: result.discount, promotions: [...result.discountItems].map((item: { promotion: Promotion }) => item.promotion.id) };
};

const tenPercent = promotion("ten-percent", { discountType: "PERCENTAGE", discountValue: 10 });
const route100 = promotion("route-100", { discountValue: 100 });
const voucher50 = promotion("voucher-50", { kind: "COUPON", discountValue: 50 });

test("two stackable promotions combine without a coupon code", () => {
  // 10% of 1000, then 100 off the remaining 900.
  assert.deepEqual(applied([tenPercent, route100], 1000), { discount: 200, promotions: ["ten-percent", "route-100"] });
});

test("the result no longer depends on whether a coupon code was sent", () => {
  assert.deepEqual(applied([tenPercent, route100], 1000, "ANYTHING"), applied([tenPercent, route100], 1000));
});

test("at most two promotions apply, and the best pair wins", () => {
  assert.deepEqual(applied([tenPercent, route100, voucher50], 1000, "V50"), { discount: 200, promotions: ["ten-percent", "route-100"] });
  assert.deepEqual(applied([tenPercent, voucher50], 1000, "V50"), { discount: 150, promotions: ["ten-percent", "voucher-50"] });
});

test("promotions that are not stackable still apply one at a time", () => {
  const soloPercent = { ...tenPercent, stackingMode: "NONE" as const };
  const soloRoute = { ...route100, discountValue: 120, stackingMode: "NONE" as const };
  assert.deepEqual(applied([soloPercent, soloRoute], 1000), { discount: 120, promotions: ["route-100"] });
});

test("a percentage-and-voucher promotion stacks only with a coupon", () => {
  const percentWithVoucher = { ...tenPercent, stackingMode: "PERCENTAGE_AND_VOUCHER" as const };
  const soloRoute = { ...route100, stackingMode: "NONE" as const };
  assert.deepEqual(applied([percentWithVoucher, soloRoute], 1000), { discount: 100, promotions: ["ten-percent"] });
  assert.deepEqual(applied([percentWithVoucher, { ...voucher50, stackingMode: "NONE" }], 1000, "V50"), { discount: 150, promotions: ["ten-percent", "voucher-50"] });
});

test("a fixed total price never stacks, and a single promotion is unchanged", () => {
  const fixedTotal = promotion("total-700", { discountType: "TOTAL_PRICE", discountValue: 700 });
  assert.deepEqual(applied([fixedTotal, tenPercent], 1000), { discount: 300, promotions: ["total-700"] });
  assert.deepEqual(applied([tenPercent], 1000), { discount: 100, promotions: ["ten-percent"] });
  assert.equal(applied([], 1000), undefined);
});
