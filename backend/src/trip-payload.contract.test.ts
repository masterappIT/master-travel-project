import assert from "node:assert/strict";
import test from "node:test";

import { adminTripDetailSelect, tripDriverResponse, type TripDriverSummary } from "./trip-payload";

test("admin trip detail only selects and serializes trip-safe driver fields", () => {
  assert.deepEqual(adminTripDetailSelect.driver, {
    select: {
      id: true,
      name: true,
      phone: true,
      settlementMethod: true,
    },
  });

  const driver = {
    id: "driver-1",
    name: "Driver",
    phone: "60000000",
    settlementMethod: "BANK_TRANSFER",
  } satisfies TripDriverSummary;

  assert.deepEqual(tripDriverResponse(driver), driver);
  assert.equal("wechatQrCodeData" in adminTripDetailSelect.driver.select, false);
  assert.equal("wechatQrCodeMime" in adminTripDetailSelect.driver.select, false);
});
