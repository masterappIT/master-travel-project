import assert from "node:assert/strict";
import test from "node:test";
import { buildDriverOrderUrl } from "./order-url";

test("builds an absolute driver order URL", () => {
  assert.equal(
    buildDriverOrderUrl("a token", "https://driver.example.com/order-invite"),
    "https://driver.example.com/order-invite?token=a+token",
  );
});

test("preserves configured query parameters and replaces token", () => {
  assert.equal(
    buildDriverOrderUrl(
      "new-token",
      "https://driver.example.com/order-invite/?source=admin&token=old",
    ),
    "https://driver.example.com/order-invite?source=admin&token=new-token",
  );
});

test("rejects missing or non-HTTP bases", () => {
  assert.throws(() => buildDriverOrderUrl("token", ""), /must be configured/);
  assert.throws(
    () => buildDriverOrderUrl("token", "/order-invite"),
    /absolute HTTP\(S\) URL/,
  );
  assert.throws(
    () => buildDriverOrderUrl("token", "javascript:alert(1)"),
    /absolute HTTP\(S\) URL/,
  );
});
