import assert from "node:assert/strict";
import test from "node:test";
import { matchesSearchCity } from "./location-search";

test("matches city names with or without 市 suffix", () => {
  assert.equal(matchesSearchCity("珠海市", "珠海"), true);
  assert.equal(matchesSearchCity("珠海", "珠海市"), true);
  assert.equal(matchesSearchCity("澳门", "珠海"), false);
});
