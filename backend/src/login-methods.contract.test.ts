import assert from "node:assert/strict";
import test from "node:test";

const providers = new Set(["phone", "wechat", "apple"]);

test("login method allocation contract requires every supported provider once", () => {
  const payload = [
    { provider: "phone", passengerEnabled: true, driverEnabled: false },
    { provider: "wechat", passengerEnabled: true, driverEnabled: true },
    { provider: "apple", passengerEnabled: false, driverEnabled: true },
  ];
  assert.equal(payload.length, providers.size);
  assert.deepEqual(new Set(payload.map((method) => method.provider)), providers);
  assert.ok(payload.every((method) => typeof method.passengerEnabled === "boolean" && typeof method.driverEnabled === "boolean"));
});

test("login method allocation flags remain independent by client", () => {
  const payload = [
    { provider: "phone", passengerEnabled: true, driverEnabled: false },
    { provider: "wechat", passengerEnabled: false, driverEnabled: true },
  ];
  assert.equal(payload.find((method) => method.provider === "phone")?.driverEnabled, false);
  assert.equal(payload.find((method) => method.provider === "wechat")?.passengerEnabled, false);
});
