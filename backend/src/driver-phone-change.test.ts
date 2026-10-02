import assert from "node:assert/strict";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(join(__dirname, "main.ts"), "utf8");
const handlers = source.slice(source.indexOf('  @Post("me/phone/request")'), source.indexOf('  @Patch("me")'));
const helpers = source.slice(source.indexOf("function hashPassword("), source.indexOf("async function phoneLoginDevelopmentSetting()"));
function fixture(enabled = true) {
  let challenge: any;
  let sent = "";
  let loads = 0;
  let owner = "driver-1";
  let duplicate = false;
  let updates = 0;
  const current = { id: owner, phoneCountryCode: "+852", phone: "50000000", hongKongMacauCountryCode: "+852", hongKongMacauPhone: "50000000", mainlandPhone: "13800138000" };
  const db: any = {
    driver: {
      findFirst: async () => duplicate ? { id: "other" } : null,
      findUniqueOrThrow: async () => current,
      update: async ({ data }: any) => { updates++; Object.assign(current, data); return current; },
    },
    driverPhoneChangeChallenge: {
      create: async ({ data }: any) => { challenge = { attempts: 0, ...data }; return challenge; },
      findUnique: async ({ where }: any) => where.id === challenge?.id ? challenge : null,
      updateMany: async ({ where, data }: any) => {
        if (challenge.consumedAt || (where.attempts && challenge.attempts >= where.attempts.lt)) return { count: 0 };
        if (data.attempts) challenge.attempts++;
        if (data.consumedAt) challenge.consumedAt = data.consumedAt;
        return { count: 1 };
      },
    },
    $queryRaw: async () => { throw new Error("Advisory lock returns void; use $executeRaw"); },
    $executeRaw: async () => 1,
  };
  db.$transaction = async (fn: any) => fn(db);
  class RequestError extends Error {}
  const context = {
    createHash, randomBytes, scryptSync, timingSafeEqual, Buffer,
    Post: () => () => {}, Req: () => () => {}, Body: () => () => {},
    BadRequestException: RequestError, UnauthorizedException: RequestError, HttpException: RequestError,
    HttpStatus: { CONFLICT: 409 }, PHONE_CODE_MAX_ATTEMPTS: 5, PHONE_CODE_TTL_MS: 300000,
    prisma: db, driverSessionFrom: async () => ({ sub: owner }),
    parsePhoneIdentity: (body: any) => ({ countryCode: body.countryCode, phoneNumber: body.phoneNumber }),
    isPhoneLoginDevelopmentEnabled: async () => ({ enabled, setting: { verificationCodeHash: `scrypt$salt:${scryptSync("54321", "salt", 64).toString("hex")}` } }),
    loadSms253Settings: async () => { loads++; }, sendSms253: async (_: string, code: string) => { sent = code; },
    driverResponse: (driver: any) => driver,
  };
  const compiled = ts.transpileModule(`${helpers}\nclass Controller {${handlers}}\nnew Controller()`, { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const controller = runInNewContext(compiled, context);
  return {
    request: (target = "hongKongMacau", countryCode = "+853", phoneNumber = "60000000") => controller.requestPhoneChange({}, { target, countryCode, phoneNumber }),
    verify: (code = "54321") => controller.verifyPhoneChange({}, { challengeId: challenge.id, code }),
    get challenge() { return challenge; }, get sent() { return sent; }, get loads() { return loads; }, get updates() { return updates; }, current,
    setOwner: () => { owner = "other"; }, setDuplicate: () => { duplicate = true; },
  };
}

test("driver development phone changes use configured code without SMS and update primary phone", async () => {
  const f = fixture();
  const response = await f.request();
  assert.deepEqual(Object.keys(response).sort(), ["challengeId", "expiresAt"]);
  assert.equal(f.loads, 0);
  assert.equal(f.sent, "");
  await assert.rejects(f.verify("00000"), /Invalid verification code/);
  await f.verify();
  assert.equal(f.current.phoneCountryCode, "+853");
  assert.equal(f.current.phone, "60000000");
  await assert.rejects(f.verify(), /expired/);
});

test("driver SMS mainland changes do not replace Hong Kong primary phone", async () => {
  const f = fixture(false);
  await f.request("mainland", "+86", "13900139000");
  assert.equal(f.loads, 1);
  assert.match(f.sent, /^[1-9]\d{4}$/);
  await f.verify(f.sent);
  assert.equal(f.current.mainlandPhone, "13900139000");
  assert.equal(f.current.phone, "50000000");
});

test("driver phone changes reject wrong owner, expiry, locked challenges and duplicate numbers", async () => {
  const owner = fixture(); await owner.request(); owner.setOwner();
  await assert.rejects(owner.verify(), /expired/);
  const expired = fixture(); await expired.request(); expired.challenge.expiresAt = new Date(0);
  await assert.rejects(expired.verify(), /expired/);
  const locked = fixture(); await locked.request();
  for (let i = 0; i < 5; i++) await assert.rejects(locked.verify("wrong"), /Invalid verification code/);
  await assert.rejects(locked.verify(), /expired/);
  assert.equal(locked.updates, 0);
  const duplicate = fixture(); duplicate.setDuplicate();
  await assert.rejects(duplicate.request(), /already registered/);
  const claimed = fixture(); await claimed.request(); claimed.setDuplicate();
  await assert.rejects(claimed.verify(), /already registered/);
  assert.equal(claimed.updates, 0);
  const invalid = fixture();
  await assert.rejects(invalid.request("mainland", "+852"), /Invalid phone target/);
});
