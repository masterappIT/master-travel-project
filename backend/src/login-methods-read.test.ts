import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(join(__dirname, "main.ts"), "utf8");
const slice = (from: string, to: string) => {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `source slice not found: ${from}`);
  return source.slice(start, end);
};
const helpers = [
  slice("const loginMethodDefaults = [", "async function requireLoginMethodEnabled("),
  slice("function publicLoginMethod(", "function appSettingsResponse("),
  slice("const WECHAT_MINI_PROGRAM_LOGIN_MODES = [", "async function recordWechatCapabilityVerification("),
].join("\n");
const controllerSource = `class ClientAuthController {\n${slice('  @Get("login-methods")\n  async publicLoginMethods(@Query("client")', '  @Get("third-party/apple-config")')}\n}`;

const method = (provider: string, sortOrder: number, passengerEnabled = true, driverEnabled = true) => ({
  provider, enabled: passengerEnabled || driverEnabled, passengerEnabled, driverEnabled, displayName: provider, logoUrl: null, description: null, sortOrder,
});

function fixture(options: { methods?: ReturnType<typeof method>[]; settings?: Record<string, unknown> } = {}) {
  const methods = options.methods ?? [method("phone", 1), method("wechat", 2), method("apple", 3, false, true)];
  const settings = { wechatMiniProgramEnabled: true, wechatMiniProgramLoginMode: "wechatAndSms", wechatMiniProgramPhoneCapability: true, wechatMiniProgramAvatarCapability: false, wechatMiniProgramNicknameCapability: true, wechatMiniProgramAppId: "wx-app", wechatMiniProgramAppSecret: "encrypted", ...options.settings };
  const calls = { methodReads: 0, methodWrites: 0, settingReads: 0 };
  const prisma = {
    loginMethodSetting: {
      findMany: async () => { calls.methodReads += 1; return [...methods].sort((a, b) => a.sortOrder - b.sortOrder); },
      upsert: async ({ create }: { create: { provider: string; sortOrder: number } }) => {
        calls.methodWrites += 1;
        if (!methods.some((item) => item.provider === create.provider)) methods.push(method(create.provider, create.sortOrder));
      },
    },
    appSetting: { findUnique: async () => { calls.settingReads += 1; return settings; } },
  };
  const decorator = () => () => {};
  class HttpError extends Error {}
  const context = {
    prisma, process: { env: {} }, appSettingsDefaults: { id: "default" },
    decryptWechatSecret: () => "secret",
    isValidLoginPreviewToken: () => false,
    ensureLoginMethodDrafts: async () => { throw new Error("published reads must not touch drafts"); },
    Get: decorator, Query: decorator,
    BadRequestException: HttpError, UnauthorizedException: HttpError,
    exports: {} as { controller?: any },
  };
  const compiled = ts.transpileModule(`${helpers}\n${controllerSource}\nexports.controller = new ClientAuthController();`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  }).outputText;
  runInNewContext(compiled, context);
  return { controller: context.exports.controller, calls };
}

const providers = (response: { data: { provider: string }[] }) => response.data.map((item) => item.provider);

test("public login methods read without writing when defaults already exist", async () => {
  const { controller, calls } = fixture();
  assert.deepEqual(providers(await controller.publicLoginMethods("passenger", "miniProgram")), ["phone", "wechat"]);
  assert.deepEqual(calls, { methodReads: 1, methodWrites: 0, settingReads: 1 });
});

test("web and driver login methods do not read mini-program settings", async () => {
  const { controller, calls } = fixture();
  assert.deepEqual(providers(await controller.publicLoginMethods("passenger", "web")), ["phone", "wechat"]);
  assert.deepEqual(providers(await controller.publicLoginMethods("driver")), ["phone", "wechat", "apple"]);
  assert.deepEqual(calls, { methodReads: 2, methodWrites: 0, settingReads: 0 });
});

test("missing default login methods are still created on read", async () => {
  const { controller, calls } = fixture({ methods: [method("phone", 1)] });
  assert.deepEqual(providers(await controller.publicLoginMethods("driver")), ["phone", "wechat", "apple"]);
  assert.deepEqual(calls, { methodReads: 2, methodWrites: 2, settingReads: 0 });
});

test("mini-program login mode and WeChat switch still decide visible methods", async () => {
  const visible = async (settings: Record<string, unknown>) => providers(await fixture({ settings }).controller.publicLoginMethods("passenger", "miniProgram"));
  assert.deepEqual(await visible({ wechatMiniProgramLoginMode: "smsOnly" }), ["phone"]);
  assert.deepEqual(await visible({ wechatMiniProgramLoginMode: "wechatOnly" }), ["wechat"]);
  assert.deepEqual(await visible({ wechatMiniProgramLoginMode: "wechatOnly", wechatMiniProgramEnabled: false }), []);
  assert.deepEqual(await visible({ wechatMiniProgramLoginMode: "unknown" }), ["wechat"]);
});

test("mini-program config keeps its response and reads settings once", async () => {
  const { controller, calls } = fixture();
  assert.deepEqual(JSON.parse(JSON.stringify(await controller.wechatMiniProgramConfig())), {
    enabled: true, loginMode: "wechatAndSms", capabilities: { phone: true, avatar: false, nickname: true },
  });
  assert.deepEqual(calls, { methodReads: 0, methodWrites: 0, settingReads: 1 });
});
