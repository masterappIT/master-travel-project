import assert from "node:assert/strict";
import test from "node:test";
import { createCipheriv, createVerify, generateKeyPairSync } from "node:crypto";
import { WECHAT_PAY_CN_API, buildWechatPayAuthorization, decryptWechatPayResource, parseWechatPayHkConfigInput, testWechatPayHkConnection } from "./wechat-pay-hk-channel-config";

const { privateKey: PRIVATE_KEY, publicKey: PUBLIC_KEY } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const API_V3_KEY = "0123456789abcdef0123456789abcdef";
const SERIAL = "5157F09EFDC096DE15EBE81A47057A7232F1B8E1";
const direct = { merchantMode: "direct", name: " 微信支付香港 ", merchantId: "1900009191", appId: "wx8888888888888888", certificateSerialNo: SERIAL.toLowerCase(), privateKey: PRIVATE_KEY, apiV3Key: API_V3_KEY };
const credentials = { merchantMode: "direct" as const, merchantId: "1900009191", appId: "wx8888888888888888", subMerchantId: null, certificateSerialNo: SERIAL, privateKey: PRIVATE_KEY, apiV3Key: API_V3_KEY };

function encryptResource(key: string, plaintext: string) {
  const nonce = "0123456789ab";
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "utf8"), Buffer.from(nonce, "utf8"));
  cipher.setAAD(Buffer.from("certificate", "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]).toString("base64");
  return { algorithm: "AEAD_AES_256_GCM", nonce, associated_data: "certificate", ciphertext };
}
const certificateList = (key = API_V3_KEY) => ({
  data: [{ serial_no: "PLATFORM01", effective_time: "2026-01-01T00:00:00+08:00", expire_time: "2031-01-01T00:00:00+08:00", encrypt_certificate: encryptResource(key, "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----") }],
});

function wechatStub(responses: Record<string, { status: number; body: unknown }>) {
  const calls: { url: string; authorization: string }[] = [];
  const fetchImpl = async (url: string, init: { headers: Record<string, string> }) => {
    calls.push({ url, authorization: init.headers.Authorization });
    const path = Object.keys(responses).find((key) => url.includes(key));
    if (!path) throw new Error("network down");
    const { status, body } = responses[path];
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fetchImpl, calls };
}

test("accepts a direct merchant configuration and normalises the serial number", () => {
  const result = parseWechatPayHkConfigInput(direct, { privateKey: false, apiV3Key: false });
  assert.ok("value" in result);
  assert.equal(result.value.displayName, "微信支付香港");
  assert.equal(result.value.certificateSerialNo, SERIAL);
  assert.equal(result.value.subMerchantId, null);
});

test("institution mode requires a sub-merchant ID and direct mode ignores one", () => {
  const stored = { privateKey: false, apiV3Key: false };
  assert.deepEqual(parseWechatPayHkConfigInput({ ...direct, merchantMode: "institution" }, stored), { error: "WeChat Pay HK sub-merchant ID format is invalid" });
  const institution = parseWechatPayHkConfigInput({ ...direct, merchantMode: "institution", subMerchantId: "1900000109" }, stored);
  assert.ok("value" in institution);
  assert.equal(institution.value.subMerchantId, "1900000109");
  const ignored = parseWechatPayHkConfigInput({ ...direct, subMerchantId: "1900000109", subAppId: "wx9999999999999999" }, stored);
  assert.ok("value" in ignored);
  assert.equal(ignored.value.subMerchantId, null);
  assert.equal(ignored.value.subAppId, null);
});

test("blank secrets are only allowed when stored ones exist", () => {
  const blank = { ...direct, privateKey: "", apiV3Key: "" };
  assert.deepEqual(parseWechatPayHkConfigInput(blank, { privateKey: false, apiV3Key: true }), { error: "WeChat Pay HK private key is required for new configurations" });
  assert.deepEqual(parseWechatPayHkConfigInput(blank, { privateKey: true, apiV3Key: false }), { error: "WeChat Pay HK APIv3 key is required for new configurations" });
  assert.ok("value" in parseWechatPayHkConfigInput(blank, { privateKey: true, apiV3Key: true }));
});

test("rejects malformed merchant data, keys and notify URL", () => {
  const stored = { privateKey: false, apiV3Key: false };
  const errorOf = (patch: Record<string, unknown>) => (parseWechatPayHkConfigInput({ ...direct, ...patch }, stored) as { error: string }).error;
  assert.equal(errorOf({ merchantMode: "partner" }), "WeChat Pay HK merchant mode is invalid");
  assert.equal(errorOf({ merchantId: "19000abc" }), "WeChat Pay HK merchant ID format is invalid");
  assert.equal(errorOf({ appId: "8888888888888888" }), "WeChat Pay HK App ID format is invalid");
  assert.equal(errorOf({ certificateSerialNo: "not-hex" }), "WeChat Pay HK certificate serial number format is invalid");
  assert.equal(errorOf({ privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----" }), "WeChat Pay HK private key format is invalid");
  assert.equal(errorOf({ apiV3Key: "too-short" }), "WeChat Pay HK APIv3 key must be 32 characters");
  assert.equal(errorOf({ notifyUrl: "http://example.com/notify" }), "WeChat Pay HK notify URL must use HTTPS");
});

test("signs requests in the APIv3 format so WeChat Pay can verify them", () => {
  const header = buildWechatPayAuthorization(credentials, "GET", "/v3/global/certificates", "", 1554208460, "593BEC0C930BF1AFEB40B4A08C8FB242");
  assert.match(header, /^WECHATPAY2-SHA256-RSA2048 mchid="1900009191",nonce_str="593BEC0C930BF1AFEB40B4A08C8FB242",signature="[^"]+",timestamp="1554208460",serial_no="5157F09EFDC096DE15EBE81A47057A7232F1B8E1"$/);
  const signature = /signature="([^"]+)"/.exec(header)![1];
  const verified = createVerify("RSA-SHA256").update("GET\n/v3/global/certificates\n1554208460\n593BEC0C930BF1AFEB40B4A08C8FB242\n\n").verify(PUBLIC_KEY, signature, "base64");
  assert.equal(verified, true);
});

test("decrypts a platform certificate only with the right APIv3 key", () => {
  const resource = encryptResource(API_V3_KEY, "hello");
  assert.equal(decryptWechatPayResource(API_V3_KEY, resource), "hello");
  assert.throws(() => decryptWechatPayResource("ffffffffffffffffffffffffffffffff", resource));
});

test("direct mode succeeds when the signature is accepted and the certificate decrypts", async () => {
  const { fetchImpl, calls } = wechatStub({ "/v3/global/certificates": { status: 200, body: certificateList() } });
  const result = await testWechatPayHkConnection(credentials, fetchImpl);
  assert.equal(result.status, "success");
  assert.equal(result.account?.platformCertificateSerialNo, "PLATFORM01");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://apihk.mch.weixin.qq.com/v3/global/certificates");
});

test("reports a rejected signature, a wrong APIv3 key and a network failure as errors without leaking keys", async () => {
  const rejected = await testWechatPayHkConnection(credentials, wechatStub({ "/v3/global/certificates": { status: 401, body: { code: "SIGN_ERROR", message: "sign not match" } } }).fetchImpl);
  assert.equal(rejected.status, "error");
  assert.match(rejected.message, /SIGN_ERROR/);
  const wrongKey = await testWechatPayHkConnection(credentials, wechatStub({ "/v3/global/certificates": { status: 200, body: certificateList("ffffffffffffffffffffffffffffffff") } }).fetchImpl);
  assert.equal(wrongKey.status, "error");
  assert.match(wrongKey.message, /APIv3 密鑰/);
  const offline = await testWechatPayHkConnection(credentials, wechatStub({}).fetchImpl);
  assert.equal(offline.status, "error");
  for (const result of [rejected, wrongKey, offline]) {
    assert.equal(result.account, null);
    assert.ok(!result.message.includes(API_V3_KEY) && !result.message.includes("PRIVATE KEY"));
  }
});

test("institution mode confirms the sub-merchant and only warns when it cannot", async () => {
  const institution = { ...credentials, merchantMode: "institution" as const, subMerchantId: "1900000109" };
  const found = wechatStub({ "/v3/global/certificates": { status: 200, body: certificateList() }, "/v3/global/merchants/1900000109": { status: 200, body: { sub_mchid: "1900000109", name: "Master Travel Limited", shortname: "Master Travel" } } });
  const success = await testWechatPayHkConnection(institution, found.fetchImpl);
  assert.equal(success.status, "success");
  assert.deepEqual(success.account?.subMerchant, { id: "1900000109", name: "Master Travel" });
  assert.equal(found.calls[1].url, "https://apihk.mch.weixin.qq.com/v3/global/merchants/1900000109?sp_mchid=1900009191&sp_appid=wx8888888888888888");
  const missing = await testWechatPayHkConnection(institution, wechatStub({ "/v3/global/certificates": { status: 200, body: certificateList() }, "/v3/global/merchants/1900000109": { status: 400, body: { code: "INVALID_REQUEST" } } }).fetchImpl);
  assert.equal(missing.status, "warning");
  assert.match(missing.message, /INVALID_REQUEST/);
  assert.equal(missing.account?.subMerchant, null);
});

test("mainland uses its own host and path and does not look up the sub-merchant", async () => {
  const provider = { ...credentials, merchantMode: "institution" as const, subMerchantId: "1900000109" };
  const { fetchImpl, calls } = wechatStub({ "/v3/certificates": { status: 200, body: certificateList() } });
  const result = await testWechatPayHkConnection(provider, fetchImpl, WECHAT_PAY_CN_API);
  assert.equal(result.status, "success");
  assert.match(result.message, /1900000109/);
  assert.equal(result.account?.subMerchant, null);
  assert.deepEqual(calls.map((call) => call.url), ["https://api.mch.weixin.qq.com/v3/certificates"]);
});

test("a merchant without downloadable platform certificates gets a warning, not a false failure", async () => {
  const result = await testWechatPayHkConnection(credentials, wechatStub({ "/v3/certificates": { status: 404, body: { code: "RESOURCE_NOT_EXISTS" } } }).fetchImpl, WECHAT_PAY_CN_API);
  assert.equal(result.status, "warning");
  assert.match(result.message, /RESOURCE_NOT_EXISTS/);
  assert.equal(result.account?.platformCertificateSerialNo, null);
});
