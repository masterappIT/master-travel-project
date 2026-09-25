import assert from "node:assert/strict";
import test from "node:test";

import { publicDriverOrderChannelFilter } from "./driver-order-channel";

test("public driver orders exclude trips reserved for the URL channel", () => {
  assert.deepEqual(publicDriverOrderChannelFilter, {
    orderUrls: { none: { revokedAt: null } },
  });
});
