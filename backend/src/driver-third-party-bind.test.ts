import assert from "node:assert/strict";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(join(__dirname, "main.ts"), "utf8");
const helpers = source.slice(source.indexOf("function hashPassword("), source.indexOf("async function phoneLoginDevelopmentSetting()"));
const hash = (value: string) => {
  const salt = "test-salt";
  return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
};

function bindFixture(codeHash: string) {
  const methodStart = source.indexOf('  @Post("third-party/bind")');
  const methodEnd = source.indexOf("    const existing = await prisma.driverAuthIdentity.findUnique", methodStart);
  // Stop right after the code check and report a sentinel when it passes.
  const controllerSource = `class DriverAuthController {\n${source.slice(methodStart, methodEnd)}\n    throw new Error("code accepted");\n  }\n}`;
  const context = {
    createHash,
    randomBytes,
    scryptSync,
    timingSafeEqual,
    Buffer,
    Date,
    Post: () => () => {},
    Body: () => () => {},
    requireLoginMethodEnabled: async () => {},
    consumeWechatWebOAuthState: () => {},
    exchangeWechatWebCode: async () => "openid-1",
    verifyAppleIdentityToken: async () => ({ sub: "apple-1" }),
    prisma: {
      driverOtpChallenge: {
        findUnique: async () => ({
          id: "challenge-1",
          consumedAt: null,
          expiresAt: new Date(Date.now() + 60000),
          codeHash,
          driver: { id: "driver-1" },
        }),
      },
    },
    HttpException: class extends Error {},
    HttpStatus: { BAD_REQUEST: 400, CONFLICT: 409 },
    UnauthorizedException: class extends Error {},
  };
  const compiled = ts.transpileModule(
    `${helpers}\n${controllerSource}\nnew DriverAuthController()`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } },
  ).outputText;
  const controller = runInNewContext(compiled, context);
  return (code: string) =>
    controller.bindThirdParty({ provider: "wechat", providerToken: "token", state: "state", challengeId: "challenge-1", code });
}

for (const [mode, storedHash] of [
  ["development mode", `scrypt$${hash("54321")}`],
  ["SMS mode", `scrypt$${hash("54321")}`],
  ["legacy salt:hash", hash("54321")],
] as const) {
  test(`third-party bind accepts the verified phone code (${mode})`, async () => {
    const bind = bindFixture(storedHash);
    await assert.rejects(bind("54321"), /code accepted/);
    await assert.rejects(bind("12345"), /Invalid phone verification/);
  });
}
