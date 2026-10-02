import assert from "node:assert/strict";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(join(__dirname, "main.ts"), "utf8");
const handlers = source.slice(source.indexOf('  @Post("security/phone/request")'), source.indexOf('  @Patch("security")'));
const helpers = source.slice(source.indexOf("function hashPassword("), source.indexOf("async function phoneLoginDevelopmentSetting()"));

function fixture(enabled: boolean, configuredCode = "54321") {
  let settingEnabled = enabled;
  let stored: any;
  let smsCode = "";
  let smsLoads = 0;
  let duplicate = false;
  let sessionUser = "user-1";
  let updates = 0;
  const challenges = new Map();
  class RequestError extends Error {}
  const context = {
    createHash, randomBytes, scryptSync, timingSafeEqual, Buffer,
    Post: () => () => {}, Req: () => () => {}, Body: () => () => {},
    HttpException: RequestError, UnauthorizedException: RequestError,
    HttpStatus: { CONFLICT: 409 },
    PHONE_CODE_TTL_MS: 300000, PHONE_CODE_MAX_ATTEMPTS: 5,
    clientPhoneChangeChallenges: challenges,
    clientSessionFrom: async () => ({ sub: sessionUser }),
    parsePhoneIdentity: (body: unknown) => body,
    isPhoneLoginDevelopmentEnabled: async (client: string) => {
      assert.equal(client, "passenger");
      const salt = "test-salt";
      return { enabled: settingEnabled, setting: { verificationCodeHash: `scrypt$${salt}:${scryptSync(configuredCode, salt, 64).toString("hex")}` } };
    },
    loadSms253Settings: async () => { smsLoads += 1; },
    sendSms253: async (phone: string, code: string) => { assert.equal(phone, "+85260000000"); smsCode = code; },
    clientSecurityResponse: (user: unknown) => user,
    prisma: {
      user: {
        findFirst: async () => duplicate ? { id: "other" } : null,
        update: async ({ data }: any) => { updates += 1; return data; },
      },
      verificationCode: {
        create: async ({ data }: any) => { stored = { attempts: 0, status: "ISSUED", ...data }; },
        findUnique: async ({ where }: any) => stored?.id === where.id ? stored : null,
        update: async ({ data }: any) => { Object.assign(stored, data); },
      },
    },
  };
  // Execute the real handlers without importing main.ts, which starts the server.
  const compiled = ts.transpileModule(`${helpers}\nclass Controller { ${handlers} }\nnew Controller()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText;
  const controller = runInNewContext(compiled, context);
  return {
    request: () => controller.requestPhoneChange({}, { countryCode: "+852", phoneNumber: "60000000" }),
    verify: (code: string) => controller.verifyPhoneChange({}, { challengeId: stored.id, code }),
    get stored() { return stored; }, get smsCode() { return smsCode; },
    get smsLoads() { return smsLoads; }, get updates() { return updates; },
    challenges,
    setEnabled: (value: boolean) => { settingEnabled = value; },
    setDuplicate: () => { duplicate = true; },
    setSessionUser: (value: string) => { sessionUser = value; },
  };
}

test("phone change uses configured development code without SMS and works after memory loss", async () => {
  const f = fixture(true);
  const response = await f.request();
  assert.deepEqual(Object.keys(response).sort(), ["challengeId", "expiresAt"]);
  assert.equal(f.smsLoads, 0);
  assert.equal(f.smsCode, "");
  assert.ok(f.stored.codeHash.startsWith("scrypt$"));
  assert.equal(f.stored.purpose, "PHONE_CHANGE");
  await assert.rejects(f.verify("00000"), /Invalid verification code/);
  f.challenges.clear();
  await f.verify("54321");
  assert.equal(f.updates, 1);
  await assert.rejects(f.verify("54321"), /expired/);
});

test("phone change selects current setting per request and preserves SMS and legacy hashes", async () => {
  const f = fixture(true);
  await f.request();
  f.setEnabled(false);
  await f.request();
  assert.equal(f.smsLoads, 1);
  assert.match(f.smsCode, /^[1-9]\d{4}$/);
  await assert.rejects(f.verify("00000"), /Invalid verification code/);
  f.stored.codeHash = createHash("sha256").update(f.smsCode).digest("hex");
  await f.verify(f.smsCode);
  assert.equal(f.updates, 1);
});

test("phone change verifies newly issued prefixed SMS hashes", async () => {
  const f = fixture(false);
  await f.request();
  assert.ok(f.stored.codeHash.startsWith("sha256$"));
  await f.verify(f.smsCode);
  assert.equal(f.updates, 1);
});

test("development phone change preserves ownership, expiry, attempt limit and duplicate checks", async () => {
  const owner = fixture(true);
  await owner.request();
  owner.setSessionUser("other");
  await assert.rejects(owner.verify("54321"), /expired/);
  assert.equal(owner.updates, 0);

  const expired = fixture(true);
  await expired.request();
  expired.stored.expiresAt = new Date(0);
  await assert.rejects(expired.verify("54321"), /expired/);
  assert.equal(expired.stored.status, "EXPIRED");

  const locked = fixture(true);
  await locked.request();
  for (let i = 0; i < 5; i++) await assert.rejects(locked.verify("wrong"), /Invalid verification code/);
  assert.equal(locked.stored.status, "LOCKED");
  await assert.rejects(locked.verify("54321"), /expired/);
  assert.equal(locked.updates, 0);

  const duplicate = fixture(true);
  duplicate.setDuplicate();
  await assert.rejects(duplicate.request(), /already connected/);
  assert.equal(duplicate.smsLoads, 0);
  assert.equal(duplicate.stored, undefined);
  const changedDuplicate = fixture(true);
  await changedDuplicate.request();
  changedDuplicate.setDuplicate();
  await assert.rejects(changedDuplicate.verify("54321"), /already connected/);
  assert.equal(changedDuplicate.updates, 0);
});
