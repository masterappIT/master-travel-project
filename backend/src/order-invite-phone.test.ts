import assert from "node:assert/strict";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(join(__dirname, "main.ts"), "utf8");
const start = source.indexOf('  @Post(":token/phone/request")');
const end = source.indexOf('  @Post(":token/phone/verify")', start);
const controllerSource = `class DriverOrderInviteController {\n${source.slice(start, end)}\n}`;
const helpers = source.slice(source.indexOf("function hashPassword("), source.indexOf("async function phoneLoginDevelopmentSetting()"));

function fixture(enabled = true) {
  let challenge: any;
  let loads = 0;
  let sent = "";
  const configuredCode = "54321";
  const hash = (value: string) => {
    const salt = "test-salt";
    return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
  };
  const developmentHash = (value: string) => `scrypt$${hash(value)}`;
  const db: any = {
    driver: { findFirst: async () => null },
    driverOtpChallenge: {
      create: async ({ data }: any) => {
        challenge = data;
        return data;
      },
    },
  };
  const context = {
    randomBytes,
    scryptSync,
    timingSafeEqual,
    Buffer,
    Post: () => () => {},
    Get: () => () => {},
    Param: () => () => {},
    Body: () => () => {},
    prisma: db,
    parsePhoneIdentity: (body: any) => ({ countryCode: body.countryCode, phoneNumber: body.phoneNumber }),
    isPhoneLoginDevelopmentEnabled: async () => ({
      enabled,
      setting: { verificationCodeHash: developmentHash(configuredCode) },
    }),
    loadSms253Settings: async () => { loads++; },
    sendSms253: async (_phone: string, code: string) => { sent = code; },
    PHONE_CODE_TTL_MS: 300000,
    HttpException: class extends Error {},
    HttpStatus: { CONFLICT: 409 },
  };
  const compiled = ts.transpileModule(
    `${helpers}\n${controllerSource}\nnew DriverOrderInviteController()`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } },
  ).outputText;
  const controller = runInNewContext(compiled, context);
  controller.details = async () => ({ invitation: { id: "invite-1" } });
  return {
    request: () => controller.requestCode("token", { countryCode: "+852", phoneNumber: "55558888" }),
    get challenge() { return challenge; },
    get loads() { return loads; },
    get sent() { return sent; },
    configuredCode,
    hash,
  };
}

test("order invite development mode uses the configured driver code without SMS", async () => {
  const f = fixture(true);
  const response = await f.request();
  assert.deepEqual(Object.keys(response).sort(), ["challengeId", "expiresAt"]);
  assert.equal(f.loads, 0);
  assert.equal(f.sent, "");
  assert.equal(f.challenge.invitationOrderUrlId, "invite-1");
  assert.equal(f.challenge.codeHash, `scrypt$${f.hash(f.configuredCode)}`);
});

test("order invite production mode sends SMS and stores the issued code", async () => {
  const f = fixture(false);
  const response = await f.request();
  assert.deepEqual(Object.keys(response).sort(), ["challengeId", "expiresAt"]);
  assert.equal(f.loads, 1);
  assert.match(f.sent, /^[1-9]\d{4}$/);
    const hash = (value: string) => {
      const salt = "test-salt";
      return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
    };
    const [salt, digest] = f.challenge.codeHash.split(":");
    assert.equal(scryptSync(f.sent, salt, 64).toString("hex"), digest);
});

function registerFixture(codeHash: string) {
  const methodStart = source.indexOf('  @Post(":token/register-and-accept")');
  const methodEnd = source.indexOf("    const now = new Date();", methodStart);
  // Stop right after the code check: a passing check reaches the vehicle
  // category lookup, which reports a sentinel instead of continuing.
  const registerSource = `class DriverOrderInviteController {\n${source.slice(methodStart, methodEnd)}\n}}`;
  const context = {
    createHash: require("node:crypto").createHash,
    randomBytes,
    scryptSync,
    timingSafeEqual,
    Buffer,
    Date,
    Post: () => () => {},
    Param: () => () => {},
    Body: () => () => {},
    UploadedFile: () => () => {},
    UseInterceptors: () => () => {},
    FileInterceptor: () => undefined,
    normalizeVehiclePlateData: (body: any) => body,
    validVehiclePlateData: () => true,
    parsePhoneIdentity: (body: any) => ({ countryCode: body.countryCode, phoneNumber: body.phoneNumber }),
    prisma: {
      driverOtpChallenge: {
        findUnique: async () => ({
          id: "challenge-1",
          driverId: null,
          consumedAt: null,
          invitationOrderUrlId: "invite-1",
          expiresAt: new Date(Date.now() + 60000),
          countryCode: "+852",
          phone: "55558888",
          codeHash,
        }),
      },
      vehicleCategory: { findFirst: async () => { throw new Error("code accepted"); } },
    },
    HttpException: class extends Error {},
    HttpStatus: { BAD_REQUEST: 400, CONFLICT: 409 },
    UnauthorizedException: class extends Error {},
  };
  const compiled = ts.transpileModule(
    `${helpers}\n${registerSource}\nnew DriverOrderInviteController()`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } },
  ).outputText;
  const controller = runInNewContext(compiled, context);
  controller.details = async () => ({ invitation: { id: "invite-1" } });
  return (code: string) => controller.registerAndAccept("token", {
    name: "Driver",
    vehicleCategory: "Alphard",
    vehicleColor: "Black",
    phoneCountryCode: "+852",
    phone: "55558888",
    hongKongMacauCountryCode: "+852",
    hongKongMacauPhone: "55558888",
    challengeId: "challenge-1",
    code,
  }, { mimetype: "image/png" });
}

for (const [mode, storedHash] of [
  ["development mode", (code: string) => `scrypt$${fixture().hash(code)}`],
  ["SMS mode", (code: string) => fixture().hash(code)],
] as const) {
  test(`register-and-accept accepts the verified invitation code in ${mode}`, async () => {
    const submit = registerFixture(storedHash("54321"));
    await assert.rejects(submit("54321"), /code accepted/);
    await assert.rejects(submit("12345"), /Invalid invitation verification code/);
  });
}
