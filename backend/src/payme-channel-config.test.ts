import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { buildPaymeSignature, parsePaymeConfigInput, testPaymeConnection } from "./payme-channel-config";

const CLIENT_ID = "93993aec-863c-42a1-86dd-6649051ed87d";
const SIGNING_KEY_ID = "3f181d20-f85f-437e-8deb-7f4bf261abfa";
const CLIENT_SECRET = "test-client-secret-value";
const SIGNING_KEY = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
const input = { environment: "sandbox", name: " PayMe 測試 ", clientId: CLIENT_ID.toUpperCase(), clientSecret: CLIENT_SECRET, signingKeyId: SIGNING_KEY_ID, signingKey: SIGNING_KEY };
const credentials = { environment: "sandbox" as const, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, signingKeyId: SIGNING_KEY_ID, signingKey: SIGNING_KEY };

function paymeStub(responses: Record<string, { status: number; body: unknown }>) {
  const calls: { url: string; method: string; headers: Record<string, string>; body?: string }[] = [];
  const fetchImpl = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body });
    const path = Object.keys(responses).find((key) => url.includes(key));
    if (!path) throw new Error("network down");
    const { status, body } = responses[path];
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fetchImpl, calls };
}

test("accepts a sandbox configuration and normalises the IDs", () => {
  const result = parsePaymeConfigInput(input, { clientSecret: false, signingKey: false });
  assert.ok("value" in result);
  assert.equal(result.value.displayName, "PayMe 測試");
  assert.equal(result.value.clientId, CLIENT_ID);
});

test("blank secrets are only allowed when stored ones exist", () => {
  const blank = { ...input, clientSecret: "", signingKey: "" };
  assert.deepEqual(parsePaymeConfigInput(blank, { clientSecret: false, signingKey: true }), { error: "PayMe client secret is required for new configurations" });
  assert.deepEqual(parsePaymeConfigInput(blank, { clientSecret: true, signingKey: false }), { error: "PayMe signing key is required for new configurations" });
  assert.ok("value" in parsePaymeConfigInput(blank, { clientSecret: true, signingKey: true }));
});

test("rejects a bad environment, malformed IDs and a signing key that is not Base64", () => {
  const stored = { clientSecret: false, signingKey: false };
  const errorOf = (patch: Record<string, unknown>) => (parsePaymeConfigInput({ ...input, ...patch }, stored) as { error: string }).error;
  assert.equal(errorOf({ environment: "live" }), "PayMe environment is invalid");
  assert.equal(errorOf({ clientId: "not-a-uuid" }), "PayMe client ID format is invalid");
  assert.equal(errorOf({ signingKeyId: "1234" }), "PayMe signing key ID format is invalid");
  assert.equal(errorOf({ signingKey: "not base64!" }), "PayMe signing key format is invalid");
  assert.equal(errorOf({ signingKey: "YWJj" }), "PayMe signing key format is invalid");
});

test("signs the request target and headers with the Base64-decoded key", () => {
  const headers = { "Api-Version": "0.12", "Request-Date-Time": "2026-10-13T01:00:00.000Z", "Trace-Id": "6f5e7f0a-8b1c-4d2e-9f3a-1b2c3d4e5f60", Authorization: "Bearer token-1" };
  const header = buildPaymeSignature(credentials, "GET", "/payments/transactions", headers);
  const expected = createHmac("sha256", Buffer.from(SIGNING_KEY, "base64"))
    .update("(request-target): get /payments/transactions\napi-version: 0.12\nrequest-date-time: 2026-10-13T01:00:00.000Z\ntrace-id: 6f5e7f0a-8b1c-4d2e-9f3a-1b2c3d4e5f60\nauthorization: Bearer token-1")
    .digest("base64");
  assert.equal(header, `keyId="${SIGNING_KEY_ID}",algorithm="hmac-sha256",headers="(request-target) api-version request-date-time trace-id authorization",signature="${expected}"`);
});

test("succeeds when the token is issued and the signed request is accepted", async () => {
  const { fetchImpl, calls } = paymeStub({ "/oauth2/token": { status: 200, body: { accessToken: "token-1", tokenType: "Bearer" } }, "/payments/transactions": { status: 200, body: { transactions: [] } } });
  const result = await testPaymeConnection(credentials, fetchImpl);
  assert.equal(result.status, "success");
  assert.deepEqual(result.account, { clientId: CLIENT_ID, environment: "sandbox", tokenIssued: true, signatureAccepted: true });
  assert.equal(calls[0].url, "https://sandbox.api.payme.hsbc.com.hk/oauth2/token");
  assert.equal(calls[0].body, `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`);
  assert.equal(calls[1].url, "https://sandbox.api.payme.hsbc.com.hk/payments/transactions");
  assert.equal(calls[1].headers.Authorization, "Bearer token-1");
  assert.match(calls[1].headers.Signature, /^keyId="3f181d20-/);
});

test("production credentials are sent to the live host", async () => {
  const { fetchImpl, calls } = paymeStub({ "/oauth2/token": { status: 401, body: {} } });
  await testPaymeConnection({ ...credentials, environment: "production" }, fetchImpl);
  assert.equal(calls[0].url, "https://api.payme.hsbc.com.hk/oauth2/token");
});

test("reports rejected credentials, a rejected signature and outages without leaking secrets", async () => {
  const rejected = await testPaymeConnection(credentials, paymeStub({ "/oauth2/token": { status: 401, body: { errors: [{ errorCode: "EA001" }] } } }).fetchImpl);
  assert.equal(rejected.status, "error");
  assert.equal(rejected.account, null);
  assert.match(rejected.message, /EA001/);
  const badSignature = await testPaymeConnection(credentials, paymeStub({ "/oauth2/token": { status: 200, body: { accessToken: "token-1" } }, "/payments/transactions": { status: 401, body: { errors: [{ errorCode: "EA017" }] } } }).fetchImpl);
  assert.equal(badSignature.status, "error");
  assert.equal(badSignature.account?.signatureAccepted, false);
  assert.match(badSignature.message, /Signing Key/);
  const unknown = await testPaymeConnection(credentials, paymeStub({ "/oauth2/token": { status: 200, body: { accessToken: "token-1" } }, "/payments/transactions": { status: 500, body: {} } }).fetchImpl);
  assert.equal(unknown.status, "warning");
  const offline = await testPaymeConnection(credentials, paymeStub({}).fetchImpl);
  assert.equal(offline.status, "error");
  for (const result of [rejected, badSignature, unknown, offline]) assert.ok(!result.message.includes(CLIENT_SECRET) && !result.message.includes(SIGNING_KEY) && !result.message.includes("token-1"));
});
