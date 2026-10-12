import assert from "node:assert/strict";
import test from "node:test";
import { channelOperatingState, channelTechnicalState, defaultSheetItems, isChannelOffered, parseFinanceChannelInput, parseSheetItems, passengerSheetRows } from "./finance-channel";

const at = (iso: string) => new Date(iso);
const stripe = (patch: Record<string, unknown> = {}) => ({ provider: "STRIPE", environment: "production", lastTestStatus: "success" as string | null, lastUnavailableAt: null as Date | null, ...patch });
const adopted = (patch: Record<string, unknown> = {}) => ({ status: "ACTIVE", confirmedAt: at("2026-10-13T02:00:00Z"), ...patch });

test("a channel is technically connected only after a live test passed, and a warning still counts", () => {
  assert.deepEqual(channelTechnicalState(stripe()), { usable: true, reason: "OK" });
  assert.deepEqual(channelTechnicalState(stripe({ lastTestStatus: "warning" })), { usable: true, reason: "OK" });
  assert.deepEqual(channelTechnicalState(stripe({ lastTestStatus: "error" })), { usable: false, reason: "TEST_FAILED" });
  assert.deepEqual(channelTechnicalState(stripe({ lastTestStatus: null })), { usable: false, reason: "NOT_TESTED" });
});

test("AlipayHK cannot be treated as connected while its check never calls the provider", () => {
  assert.deepEqual(channelTechnicalState({ provider: "ALIPAY_HK", environment: "production", lastTestStatus: "success", lastUnavailableAt: null }), { usable: false, reason: "NO_LIVE_TEST" });
});

test("a connected channel is not in use until finance adopts it", () => {
  assert.equal(channelOperatingState(stripe(), null), "NOT_ADOPTED");
  assert.equal(channelOperatingState(stripe(), adopted()), "ACTIVE");
  assert.equal(channelOperatingState(stripe(), adopted({ status: "DISABLED" })), "DISABLED");
});

test("a failing test makes an adopted channel unavailable without touching the finance decision", () => {
  assert.equal(channelOperatingState(stripe({ lastTestStatus: "error", lastUnavailableAt: at("2026-10-13T03:00:00Z") }), adopted()), "TECH_UNAVAILABLE");
});

test("passing the test again after an outage still needs finance to confirm", () => {
  const recovered = stripe({ lastUnavailableAt: at("2026-10-13T03:00:00Z") });
  assert.equal(channelOperatingState(recovered, adopted()), "NEEDS_CONFIRMATION");
  assert.equal(channelOperatingState(recovered, adopted({ confirmedAt: at("2026-10-13T04:00:00Z") })), "ACTIVE");
  // An outage that predates the adoption does not hold the channel back.
  assert.equal(channelOperatingState(stripe({ lastUnavailableAt: at("2026-10-13T01:00:00Z") }), adopted()), "ACTIVE");
});

test("a channel is offered only when it is active in the environment in use", () => {
  assert.equal(isChannelOffered(stripe(), adopted(), false), true);
  assert.equal(isChannelOffered(stripe(), adopted(), true), false);
  assert.equal(isChannelOffered(stripe({ environment: "sandbox" }), adopted(), true), true);
  assert.equal(isChannelOffered(stripe(), null, false), false);
  assert.equal(isChannelOffered(stripe({ lastUnavailableAt: at("2026-10-13T03:00:00Z") }), adopted(), false), false);
});

test("activating needs a connected channel; disabling is always allowed", () => {
  assert.deepEqual(parseFinanceChannelInput({ status: "ACTIVE" }, stripe()), { value: { status: "ACTIVE" } });
  assert.deepEqual(parseFinanceChannelInput({ status: "ACTIVE" }, stripe({ lastTestStatus: "error" })), { error: "Finance channel is not technically connected" });
  assert.deepEqual(parseFinanceChannelInput({ status: "DISABLED" }, stripe({ lastTestStatus: "error" })), { value: { status: "DISABLED" } });
  assert.deepEqual(parseFinanceChannelInput({ status: "PAUSED" }, stripe()), { error: "Finance channel status is invalid" });
});

const flags = { fareBalancePayEnabled: true, cashBalancePayEnabled: true, wechatPayEnabled: true, alipayPayEnabled: false, bankCardPayEnabled: true };

test("the default sheet is the five rows the passenger app has always shown, following the existing switches", () => {
  const items = defaultSheetItems(flags);
  assert.deepEqual(items.map((item) => item.label), ["車費餘額", "現金餘額", "微信支付（支持香港/澳門）", "支付寶支付", "銀行帳戶 支付"]);
  assert.deepEqual(items.map((item) => item.enabled), [true, true, true, false, true]);
  assert.ok(items.every((item) => item.provider === null));
});

test("a sheet accepts renamed, reordered rows and one provider behind several rows", () => {
  const result = parseSheetItems([
    { kind: "EXTERNAL", label: " 信用卡 ", icon: "bank", provider: "STRIPE" },
    { kind: "EXTERNAL", label: "微信支付", icon: "wechat", provider: "STRIPE", enabled: false },
    { kind: "FARE_BALANCE", label: "車費餘額", icon: "wallet-fare", provider: "STRIPE" },
  ]);
  assert.deepEqual(result, { value: [
    { kind: "EXTERNAL", label: "信用卡", icon: "bank", enabled: true, provider: "STRIPE" },
    { kind: "EXTERNAL", label: "微信支付", icon: "wechat", enabled: false, provider: "STRIPE" },
    { kind: "FARE_BALANCE", label: "車費餘額", icon: "wallet-fare", enabled: true, provider: null },
  ] });
});

test("a sheet rejects malformed rows, duplicate wallets and too many rows", () => {
  const row = (patch: Record<string, unknown> = {}) => ({ kind: "EXTERNAL", label: "支付寶支付", icon: "alipay", provider: null, ...patch });
  const errorOf = (items: unknown) => (parseSheetItems(items) as { error: string }).error;
  assert.equal(errorOf([]), "Payment sheet must have between 1 and 8 items");
  assert.equal(errorOf(Array.from({ length: 9 }, () => row())), "Payment sheet must have between 1 and 8 items");
  assert.equal(errorOf([row({ kind: "CRYPTO" })]), "Payment sheet item kind is invalid");
  assert.equal(errorOf([row({ label: "  " })]), "Payment sheet item label is invalid");
  assert.equal(errorOf([row({ label: "字".repeat(25) })]), "Payment sheet item label is invalid");
  assert.equal(errorOf([row({ icon: "https://evil.example/icon.svg" })]), "Payment sheet item icon is invalid");
  assert.equal(errorOf([row({ provider: "PAYPAL" })]), "Payment sheet item provider is invalid");
  assert.equal(errorOf([row({ kind: "CASH_BALANCE" }), row({ kind: "CASH_BALANCE" })]), "Payment sheet can list each wallet only once");
});

test("passengers see enabled wallets and only external rows whose provider is in operation", () => {
  const items = [
    { id: "fare", kind: "FARE_BALANCE" as const, label: "車費餘額", icon: "wallet-fare" as const, enabled: true, provider: null },
    { id: "cash", kind: "CASH_BALANCE" as const, label: "現金餘額", icon: "wallet-cash" as const, enabled: false, provider: null },
    { id: "card", kind: "EXTERNAL" as const, label: "銀行帳戶 支付", icon: "bank" as const, enabled: true, provider: "STRIPE" },
    { id: "wechat", kind: "EXTERNAL" as const, label: "微信支付", icon: "wechat" as const, enabled: true, provider: "WECHATPAY_HK" },
    { id: "unbound", kind: "EXTERNAL" as const, label: "支付寶支付", icon: "alipay" as const, enabled: true, provider: null },
    { id: "off", kind: "EXTERNAL" as const, label: "信用卡", icon: "bank" as const, enabled: false, provider: "STRIPE" },
  ];
  const channels = [
    { ...stripe(), financeChannel: adopted() },
    { ...stripe({ environment: "sandbox", lastTestStatus: "error" }), financeChannel: adopted() },
    { provider: "WECHATPAY_HK", environment: "production", lastTestStatus: "success", lastUnavailableAt: null, financeChannel: null },
  ];
  assert.deepEqual(passengerSheetRows(items, channels, false), [
    { id: "fare", kind: "FARE_BALANCE", label: "車費餘額", icon: "wallet-fare", provider: null },
    { id: "card", kind: "EXTERNAL", label: "銀行帳戶 支付", icon: "bank", provider: "STRIPE" },
  ]);
  // In test mode the sandbox Stripe config is down, so no external row is offered.
  assert.deepEqual(passengerSheetRows(items, channels, true).map((row) => row.id), ["fare"]);
});
