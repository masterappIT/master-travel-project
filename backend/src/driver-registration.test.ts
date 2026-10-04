import assert from "node:assert/strict";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(join(__dirname, "main.ts"), "utf8");
const handlers = source.slice(source.indexOf('  @Post("register/phone/request")'), source.indexOf('  @Post("phone/request")', source.indexOf('  @Post("register/phone/request")')));
const helpers = source.slice(source.indexOf("function hashPassword("), source.indexOf("async function phoneLoginDevelopmentSetting()"));
function fixture(enabled = true) {
  let challenge: any;
  let code = "54321";
  let loads = 0;
  let sent = "";
  let duplicate = false;
  let allowed = true;
  const hash = (value: string) => `salt:${scryptSync(value, "salt", 64).toString("hex")}`;
  const db: any = {
    driver: {
      findFirst: async () => duplicate ? { id: "existing" } : null,
      create: async ({ data }: any) => data,
    },
    vehicleCategory: { findFirst: async () => ({ id: "category" }) },
    driverVehicle: { create: async () => ({}) },
    driverOtpChallenge: {
      create: async ({ data }: any) => { challenge = data; return data; },
      findUnique: async ({ where }: any) => where.id === challenge?.id ? challenge : null,
      update: async ({ data }: any) => Object.assign(challenge, data),
    },
  };
  db.$transaction = async (fn: any) => fn(db);
  const decorator = () => () => {};
  const context = {
    createHash, randomBytes, scryptSync, timingSafeEqual, Buffer,
    Post: decorator, Body: decorator, UploadedFile: decorator, UseInterceptors: decorator,
    FileInterceptor: () => ({}), HttpException: Error, UnauthorizedException: Error,
    HttpStatus: { CONFLICT: 409, BAD_REQUEST: 400 }, PHONE_CODE_TTL_MS: 300000,
    prisma: db,
    requireLoginMethodEnabled: async () => { if (!allowed) throw new Error("disabled"); },
    parsePhoneIdentity: (body: any) => ({ countryCode: body.countryCode, phoneNumber: body.phoneNumber }),
    isPhoneLoginDevelopmentEnabled: async () => ({ enabled, setting: { verificationCodeHash: `scrypt$${hash(code)}` } }),
    loadSms253Settings: async () => { loads++; },
    sendSms253: async (_: string, value: string) => { sent = value; },
    normalizeVehiclePlateData: (body: any) => body,
    validVehiclePlateData: () => true,
    driverAuthResponse: (driver: any) => driver,
  };
  const compiled = ts.transpileModule(`${helpers}\nclass Controller {${handlers}}\nnew Controller()`, { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const controller = runInNewContext(compiled, context);
  return {
    request: () => controller.requestRegistrationCode({ countryCode: "+852", phoneNumber: "00998877" }),
    verify: (value = "54321") => controller.verifyRegistrationCode({ challengeId: challenge.id, code: value }),
    register: (value = "54321") => controller.register({ name: "Test", vehicleOwnership: "香港", plateType: "test", hkPlate: "TEST", vehicleCategory: "test", vehicleColor: "white", phoneCountryCode: "+852", phone: "00998877", hongKongMacauCountryCode: "+852", hongKongMacauPhone: "00998877", mainlandPhone: "13800138000", challengeId: challenge.id, code: value }, { buffer: Buffer.from("test"), mimetype: "image/jpeg" }),
    get challenge() { return challenge; }, get sent() { return sent; }, get loads() { return loads; },
    toggle: () => { enabled = !enabled; }, changeCode: () => { code = "12345"; },
    duplicate: () => { duplicate = true; }, disable: () => { allowed = false; }, hash,
  };
}

test("driver registration uses configured development code through final registration without SMS", async () => {
  const f = fixture();
  const response = await f.request();
  assert.deepEqual(Object.keys(response).sort(), ["challengeId", "expiresAt"]);
  assert.equal(f.loads, 0);
  assert.equal(f.sent, "");
  await assert.rejects(f.verify("00000"), /Invalid registration/);
  await f.verify();
  await assert.rejects(f.register("00000"), /Invalid registration/);
  const driver = await f.register();
  assert.equal(driver.reviewStatus, "PENDING");
  assert.ok(f.challenge.consumedAt);
  await assert.rejects(f.verify(), /Invalid registration/);
});

test("registration challenge retains issued code after settings change", async () => {
  const f = fixture();
  await f.request();
  f.changeCode(); f.toggle();
  await f.verify();
  await assert.rejects(f.verify("12345"), /Invalid registration/);
  await f.request();
  assert.equal(f.loads, 1);
  assert.equal(f.sent.length, 5);
  await f.verify(f.sent);
});

test("registration preserves legacy SMS hashes and rejects expired or login challenges", async () => {
  const f = fixture(false);
  await f.request();
  f.challenge.codeHash = f.hash(f.sent);
  await f.verify(f.sent);
  f.challenge.driverId = "existing";
  await assert.rejects(f.verify(f.sent), /Invalid registration/);
  f.challenge.driverId = null;
  f.challenge.expiresAt = new Date(0);
  await assert.rejects(f.verify(f.sent), /Invalid registration/);
});

test("registration checks allocation and duplicate phone before SMS or challenge creation", async () => {
  const f = fixture(); f.disable();
  await assert.rejects(f.request(), /disabled/);
  const g = fixture(); g.duplicate();
  await assert.rejects(g.request(), /already registered/);
  assert.equal(g.loads, 0);
  assert.equal(g.challenge, undefined);
});
