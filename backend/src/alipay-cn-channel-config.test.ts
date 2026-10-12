import assert from "node:assert/strict";
import test from "node:test";
import { createSign, createVerify, generateKeyPairSync } from "node:crypto";
import { extractAlipayResponseNode, normalizeAlipayPrivateKey, normalizeAlipayPublicKey, parseAlipayCnConfigInput, signAlipayParams, testAlipayCnConnection } from "./alipay-cn-channel-config";

const app = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const alipay = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const bare = (pem: string) => pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
const APP_ID = "2021000000000001";
const TOKEN = "202610BBabcdef0123456789abcdef0123456789";
const input = { environment: "production", merchantMode: "merchant", name: " 內地支付寶 ", appId: APP_ID, privateKey: app.privateKey, alipayPublicKey: alipay.publicKey, products: ["wap", "wap", "app", "bogus"] };
const nothingStored = { privateKey: false, alipayPublicKey: false, appAuthToken: false };
const credentials = { merchantMode: "merchant" as const, appId: APP_ID, gatewayUrl: "https://openapi.alipay.com/gateway.do", privateKey: app.privateKey, alipayPublicKey: alipay.publicKey, appAuthToken: null };

/** Builds a gateway reply the way Alipay does: the node's exact JSON text is what gets signed. */
function gatewayReply(node: Record<string, string>, signingKey: string | null = alipay.privateKey) {
  const content = JSON.stringify(node);
  const sign = signingKey ? `,"sign":"${createSign("RSA-SHA256").update(content, "utf8").sign(signingKey, "base64")}"` : "";
  return `{"alipay_trade_query_response":${content}${sign}}`;
}
function alipayStub(reply: { status?: number; body: string } | null) {
  const calls: { url: string; body: string }[] = [];
  const fetchImpl = async (url: string, init: { body: string }) => {
    calls.push({ url, body: init.body });
    if (!reply) throw new Error("network down");
    return { status: reply.status ?? 200, text: async () => reply.body };
  };
  return { fetchImpl, calls };
}
const notFound = { code: "40004", msg: "Business Failed", sub_code: "ACQ.TRADE_NOT_EXIST", sub_msg: "交易不存在 {\"x\":1}" };

test("accepts a merchant configuration, defaults the gateway and de-duplicates products", () => {
  const result = parseAlipayCnConfigInput(input, nothingStored);
  assert.ok("value" in result);
  assert.equal(result.value.displayName, "內地支付寶");
  assert.equal(result.value.gatewayUrl, "https://openapi.alipay.com/gateway.do");
  assert.deepEqual(result.value.products, ["wap", "app"]);
  assert.equal(result.value.appAuthToken, "");
});

test("accepts bare Base64 keys from the Alipay key tool and stores canonical PEM", () => {
  const result = parseAlipayCnConfigInput({ ...input, privateKey: bare(app.privateKey), alipayPublicKey: bare(alipay.publicKey) }, nothingStored);
  assert.ok("value" in result);
  assert.equal(result.value.privateKey, normalizeAlipayPrivateKey(app.privateKey));
  assert.equal(result.value.alipayPublicKey, normalizeAlipayPublicKey(alipay.publicKey));
  assert.match(result.value.privateKey, /^-----BEGIN PRIVATE KEY-----/);
});

test("ISV mode requires an app auth token and merchant mode drops ISV fields", () => {
  assert.deepEqual(parseAlipayCnConfigInput({ ...input, merchantMode: "isv" }, nothingStored), { error: "Alipay CN app auth token is required in ISV mode" });
  const isv = parseAlipayCnConfigInput({ ...input, merchantMode: "isv", appAuthToken: TOKEN, providerId: "2088000000000001" }, nothingStored);
  assert.ok("value" in isv);
  assert.equal(isv.value.appAuthToken, TOKEN);
  const merchant = parseAlipayCnConfigInput({ ...input, appAuthToken: TOKEN, providerId: "2088000000000001" }, nothingStored);
  assert.ok("value" in merchant);
  assert.equal(merchant.value.appAuthToken, "");
  assert.equal(merchant.value.providerId, "");
});

test("blank secrets are only allowed when stored ones exist", () => {
  const blank = { ...input, privateKey: "", alipayPublicKey: "" };
  assert.deepEqual(parseAlipayCnConfigInput(blank, nothingStored), { error: "Alipay CN private key and Alipay public key are required for new configurations" });
  assert.ok("value" in parseAlipayCnConfigInput(blank, { privateKey: true, alipayPublicKey: true, appAuthToken: false }));
});

test("rejects malformed fields and gateways outside Alipay's hosts", () => {
  const errorOf = (patch: Record<string, unknown>) => (parseAlipayCnConfigInput({ ...input, ...patch }, nothingStored) as { error: string }).error;
  assert.equal(errorOf({ environment: "live" }), "Alipay CN environment is invalid");
  assert.equal(errorOf({ merchantMode: "partner" }), "Alipay CN merchant mode is invalid");
  assert.equal(errorOf({ appId: "2021" }), "Alipay CN App ID format is invalid");
  for (const gatewayUrl of ["http://openapi.alipay.com/gateway.do", "https://evil.example.com/gateway.do", "https://openapi.alipay.com.evil.io/gateway.do", "https://user@openapi.alipay.com/gateway.do"]) assert.equal(errorOf({ gatewayUrl }), "Alipay CN gateway URL is invalid");
  assert.equal(errorOf({ privateKey: "not a key" }), "Alipay CN private key format is invalid");
  assert.equal(errorOf({ alipayPublicKey: "not a key" }), "Alipay CN public key format is invalid");
  assert.equal(errorOf({ products: [] }), "Alipay CN products are required");
  assert.equal(errorOf({ notifyUrl: "http://example.com/notify" }), "Alipay CN notify and return URLs must use HTTPS");
  assert.equal(errorOf({ merchantMode: "isv", appAuthToken: TOKEN, providerId: "1234" }), "Alipay CN provider ID format is invalid");
});

test("signs sorted non-empty parameters so Alipay can verify them", () => {
  const sign = signAlipayParams({ method: "alipay.trade.query", app_id: APP_ID, empty: "", sign: "ignored" }, app.privateKey);
  assert.equal(createVerify("RSA-SHA256").update(`app_id=${APP_ID}&method=alipay.trade.query`, "utf8").verify(app.publicKey, sign, "base64"), true);
});

test("extracts the signed node verbatim, including braces and quotes inside strings", () => {
  const raw = gatewayReply(notFound);
  assert.equal(extractAlipayResponseNode(raw, "alipay_trade_query_response"), JSON.stringify(notFound));
  assert.equal(extractAlipayResponseNode(raw, "missing_response"), null);
});

test("succeeds when the trade is not found and the reply signature verifies", async () => {
  const { fetchImpl, calls } = alipayStub({ body: gatewayReply(notFound) });
  const result = await testAlipayCnConnection(credentials, fetchImpl, new Date("2026-10-12T18:40:05Z"));
  assert.equal(result.status, "success");
  assert.deepEqual(result.account, { appId: APP_ID, merchantMode: "merchant", credentialsAccepted: true, responseSignatureVerified: true, subCode: "ACQ.TRADE_NOT_EXIST" });
  assert.equal(calls[0].url, "https://openapi.alipay.com/gateway.do?charset=utf-8");
  const sent = new URLSearchParams(calls[0].body);
  assert.equal(sent.get("timestamp"), "2026-10-13 02:40:05");
  assert.equal(sent.get("method"), "alipay.trade.query");
  assert.equal(sent.get("app_auth_token"), null);
  const { sign, ...rest } = Object.fromEntries(sent);
  assert.equal(sign, signAlipayParams(rest, app.privateKey));
});

test("ISV mode sends the app auth token and reports a rejected one", async () => {
  const isv = { ...credentials, merchantMode: "isv" as const, appAuthToken: TOKEN };
  const accepted = alipayStub({ body: gatewayReply(notFound) });
  assert.equal((await testAlipayCnConnection(isv, accepted.fetchImpl)).status, "success");
  assert.equal(new URLSearchParams(accepted.calls[0].body).get("app_auth_token"), TOKEN);
  const rejected = await testAlipayCnConnection(isv, alipayStub({ body: gatewayReply({ code: "20001", msg: "Insufficient Token Permissions", sub_code: "aop.invalid-auth-token" }, null) }).fetchImpl);
  assert.equal(rejected.status, "error");
  assert.match(rejected.message, /app_auth_token/);
  assert.ok(!rejected.message.includes(TOKEN));
});

test("explains each credential failure separately", async () => {
  const run = async (body: string | null, status = 200) => testAlipayCnConnection(credentials, alipayStub(body === null ? null : { status, body }).fetchImpl);
  const badAppId = await run(gatewayReply({ code: "40002", msg: "Invalid Arguments", sub_code: "isv.invalid-app-id" }, null));
  assert.equal(badAppId.status, "error");
  assert.match(badAppId.message, /App ID/);
  const badPrivateKey = await run(gatewayReply({ code: "40002", msg: "Invalid Arguments", sub_code: "isv.invalid-signature" }, null));
  assert.match(badPrivateKey.message, /應用私鑰/);
  const badPublicKey = await run(gatewayReply(notFound, app.privateKey));
  assert.equal(badPublicKey.status, "error");
  assert.equal(badPublicKey.account?.credentialsAccepted, true);
  assert.match(badPublicKey.message, /支付寶公鑰/);
  const noPermission = await run(gatewayReply({ code: "40006", msg: "Insufficient Permissions", sub_code: "isv.insufficient-isv-permissions" }));
  assert.equal(noPermission.status, "warning");
  const wrongGateway = await run("<html>404 Not Found</html>", 404);
  assert.equal(wrongGateway.status, "error");
  assert.match(wrongGateway.message, /HTTP 404/);
  const offline = await run(null);
  assert.equal(offline.status, "error");
  assert.equal(offline.account, null);
});
