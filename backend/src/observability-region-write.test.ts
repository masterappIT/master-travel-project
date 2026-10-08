import assert from "node:assert/strict";
import { test } from "node:test";
import { ObservabilityRegionWriteTracker } from "./observability-region-write";

test("a late older write cannot overwrite a newer failed attempt", () => {
  const tracker = new ObservabilityRegionWriteTracker();
  const older = tracker.begin();
  const newer = tracker.begin();
  assert.equal(tracker.complete(newer, "error"), true);
  const checkedAt = tracker.checkedAt;
  assert.equal(tracker.complete(older, "ok"), false);
  assert.equal(tracker.status, "error");
  assert.equal(tracker.checkedAt, checkedAt);
});

test("an older completed write remains visible until a newer attempt completes", () => {
  const tracker = new ObservabilityRegionWriteTracker();
  const older = tracker.begin();
  const newer = tracker.begin();
  assert.equal(tracker.complete(older, "ok"), true);
  assert.equal(tracker.status, "ok");
  assert.equal(tracker.complete(newer, "error"), true);
  assert.equal(tracker.status, "error");
});
