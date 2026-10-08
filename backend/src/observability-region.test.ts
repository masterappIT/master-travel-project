import assert from "node:assert/strict";
import { test } from "node:test";
import type { CityResponse } from "maxmind";
import {
  createObservabilityRegionResolver,
  normalizeObservabilityIp,
  observabilityIpSelection,
  regionFromGeoIp,
  resolveLocalObservabilityRegion,
} from "./observability-region";

const sample = {
  country: { names: { en: "United States", "zh-CN": "美國" } },
  subdivisions: [{ names: { en: "California" } }],
  city: { names: { en: "Mountain View" } },
} as CityResponse;

test("normalizes proxy address formats", () => {
  assert.equal(normalizeObservabilityIp("::ffff:8.8.8.8"), "8.8.8.8");
  assert.equal(normalizeObservabilityIp("[2001:4860:4860::8888]:443"), "2001:4860:4860::8888");
  assert.equal(normalizeObservabilityIp("8.8.8.8:443, 10.0.0.1"), "8.8.8.8");
  assert.equal(normalizeObservabilityIp("not-an-ip"), undefined);
});

test("selects the first untrusted forwarded hop only behind a trusted socket", () => {
  const trusted = {
    ip: "169.254.8.1",
    headers: { "x-forwarded-for": "8.8.8.8, 10.0.0.2", "x-real-ip": "1.1.1.1" },
    socket: { remoteAddress: "10.0.0.3" },
  };
  const selected = observabilityIpSelection(trusted);
  assert.equal(selected.ip, "8.8.8.8");
  assert.equal(selected.diagnostic.source, "forwarded");
  assert.equal(JSON.stringify(selected.diagnostic).includes("8.8.8.8"), false);

  const forged = observabilityIpSelection({
    ip: "8.8.8.8",
    headers: { "x-forwarded-for": "1.1.1.1, 10.0.0.2" },
    socket: { remoteAddress: "8.8.4.4" },
  });
  assert.equal(forged.ip, "8.8.4.4");
  assert.equal(forged.diagnostic.source, "socket");
  assert.equal(observabilityIpSelection({
    ip: "1.1.1.1",
    headers: { "x-forwarded-for": "9.9.9.9, 8.8.8.8, 10.0.0.2" },
    socket: { remoteAddress: "169.254.3.4" },
  }).ip, "8.8.8.8");
  assert.equal(observabilityIpSelection({
    ip: "1.1.1.1",
    headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1, 10.0.0.2" },
    socket: { remoteAddress: "fe80::1" },
  }).ip, "1.1.1.1");
});

test("handles missing and malformed proxy chain values without trusting them", () => {
  assert.equal(observabilityIpSelection({ headers: {}, socket: { remoteAddress: "10.0.0.3" } }).diagnostic.source, "socket");
  assert.equal(observabilityIpSelection({ headers: { "x-forwarded-for": "not-an-ip" }, socket: { remoteAddress: "10.0.0.3" } }).diagnostic.source, "socket");
  assert.equal(observabilityIpSelection({ headers: {} }).diagnostic.selectedClass, "missing");
});

test("looks up public IPs and preserves private and unknown fallbacks", () => {
  const requested: string[] = [];
  const lookup = (ip: string) => { requested.push(ip); return sample; };
  assert.equal(regionFromGeoIp("8.8.8.8", lookup), "美國 · California");
  assert.deepEqual(requested, ["8.8.8.8"]);
  assert.equal(regionFromGeoIp("192.168.1.4", lookup), "本機／內網");
  assert.equal(regionFromGeoIp("127.0.0.2", lookup), "本機／內網");
  assert.equal(regionFromGeoIp(undefined, lookup), "本機／內網");
  assert.deepEqual(requested, ["8.8.8.8"]);
  assert.equal(regionFromGeoIp("2001:4860:4860::8888", () => null), "未知地區");
  assert.equal(regionFromGeoIp("8.8.4.4", () => ({ country: { names: { en: "United States" } } }) as CityResponse), "United States");
});

test("lookup failures are not cached but genuine unknown results are", async () => {
  let attempts = 0;
  const failures: unknown[] = [];
  const resolve = createObservabilityRegionResolver(async () => {
    attempts++;
    if (attempts === 1) throw new Error("database unavailable");
    return attempts === 2 ? "美國 · California" : "未知地區";
  }, error => failures.push(error));
  assert.equal(await resolve("8.8.8.8"), "未知地區");
  assert.equal(await resolve("8.8.8.8"), "美國 · California");
  assert.equal(await resolve("8.8.8.8"), "美國 · California");
  assert.equal(failures.length, 1);
  assert.equal(attempts, 2);
  assert.equal(await resolve("1.1.1.1"), "未知地區");
  assert.equal(await resolve("1.1.1.1"), "未知地區");
  assert.equal(attempts, 3);
});

test("coalesces concurrent lookups and keeps private addresses out of the cache", async () => {
  let attempts = 0;
  const resolve = createObservabilityRegionResolver(async () => {
    attempts++;
    await new Promise(done => setTimeout(done, 1));
    return "美國";
  }, () => assert.fail("unexpected lookup failure"));
  assert.deepEqual(await Promise.all([resolve("8.8.8.8"), resolve("8.8.8.8")]), ["美國", "美國"]);
  assert.equal(await resolve("10.0.0.2"), "本機／內網");
  assert.equal(attempts, 1);
});

test("missing database does not block private IP resolution and can recover", async () => {
  const oldPath = process.env.OBSERVABILITY_GEOIP_DB_PATH;
  process.env.OBSERVABILITY_GEOIP_DB_PATH = "/tmp/observability-geoip-no-such-file.mmdb";
  try {
    assert.equal(await resolveLocalObservabilityRegion("10.0.0.2"), "本機／內網");
    await assert.rejects(resolveLocalObservabilityRegion("8.8.8.8"), { code: "ENOENT" });
    await assert.rejects(resolveLocalObservabilityRegion("8.8.4.4"), { code: "ENOENT" });
  } finally {
    if (oldPath === undefined) delete process.env.OBSERVABILITY_GEOIP_DB_PATH;
    else process.env.OBSERVABILITY_GEOIP_DB_PATH = oldPath;
  }
});
