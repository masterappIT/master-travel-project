import { createPrivateKey, createPublicKey, createSign, createVerify, randomBytes } from "node:crypto";

export type AlipayCnEnvironment = "sandbox" | "production";
export const ALIPAY_CN_MERCHANT_MODES = ["merchant", "isv"] as const;
export type AlipayCnMerchantMode = (typeof ALIPAY_CN_MERCHANT_MODES)[number];
export const ALIPAY_CN_PRODUCTS = ["wap", "app", "page"] as const;
export type AlipayCnProduct = (typeof ALIPAY_CN_PRODUCTS)[number];

export const ALIPAY_CN_DEFAULT_GATEWAYS: Record<AlipayCnEnvironment, string> = {
  sandbox: "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
  production: "https://openapi.alipay.com/gateway.do",
};

export type AlipayCnConfigInput = {
  environment: AlipayCnEnvironment;
  merchantMode: AlipayCnMerchantMode;
  displayName: string | null | undefined;
  description: string | null | undefined;
  appId: string;
  gatewayUrl: string;
  /** Canonical PKCS8 PEM, or "" to keep the stored key. */
  privateKey: string;
  /** Canonical SPKI PEM, or "" to keep the stored key. */
  alipayPublicKey: string;
  appAuthToken: string;
  providerId: string;
  products: AlipayCnProduct[];
  notifyUrl: string | null;
  returnUrl: string | null;
};

export type AlipayCnCredentials = { merchantMode: AlipayCnMerchantMode; appId: string; gatewayUrl: string; privateKey: string; alipayPublicKey: string; appAuthToken: string | null };

export type AlipayCnAccountSnapshot = { appId: string; merchantMode: AlipayCnMerchantMode; credentialsAccepted: boolean; responseSignatureVerified: boolean; subCode: string | null };

export type AlipayCnTestResult = { status: "success" | "warning" | "error"; message: string; account: AlipayCnAccountSnapshot | null };

export function isAlipayCnMerchantMode(value: unknown): value is AlipayCnMerchantMode {
  return typeof value === "string" && (ALIPAY_CN_MERCHANT_MODES as readonly string[]).includes(value);
}
export function isAlipayCnProduct(value: unknown): value is AlipayCnProduct {
  return typeof value === "string" && (ALIPAY_CN_PRODUCTS as readonly string[]).includes(value);
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const pemWrap = (label: string, base64: string) => `-----BEGIN ${label}-----\n${base64.replace(/\s+/g, "").replace(/(.{64})/g, "$1\n").trimEnd()}\n-----END ${label}-----\n`;

/** The Alipay key tool issues bare Base64 (PKCS8 or PKCS1) as often as PEM, so both are accepted and stored as canonical PEM. */
export function normalizeAlipayPrivateKey(value: string): string | null {
  const candidates = value.includes("-----BEGIN") ? [value] : [pemWrap("PRIVATE KEY", value), pemWrap("RSA PRIVATE KEY", value)];
  for (const candidate of candidates) {
    try {
      const key = createPrivateKey({ key: candidate, format: "pem" });
      if (key.asymmetricKeyType === "rsa") return key.export({ type: "pkcs8", format: "pem" }).toString();
    } catch {
      // try the next encoding
    }
  }
  return null;
}
export function normalizeAlipayPublicKey(value: string): string | null {
  try {
    const key = createPublicKey({ key: value.includes("-----BEGIN") ? value : pemWrap("PUBLIC KEY", value), format: "pem" });
    return key.asymmetricKeyType === "rsa" ? key.export({ type: "spki", format: "pem" }).toString() : null;
  } catch {
    return null;
  }
}

/** The backend calls this URL with signed requests, so it must stay on Alipay's own hosts. */
function isAlipayGatewayUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.port && /(^|\.)(alipay\.com|alipaydev\.com)$/i.test(url.hostname);
  } catch {
    return false;
  }
}
const isHttpsUrl = (value: string) => /^https:\/\/\S+$/i.test(value);

/** Validates an admin save request. Blank keys or app auth token mean "keep the stored one" and are only allowed when one exists. */
export function parseAlipayCnConfigInput(
  body: Record<string, unknown>,
  stored: { privateKey: boolean; alipayPublicKey: boolean; appAuthToken: boolean },
): { value: AlipayCnConfigInput } | { error: string } {
  const environment = body.environment === "production" ? "production" : body.environment === "sandbox" ? "sandbox" : null;
  if (!environment) return { error: "Alipay CN environment is invalid" };
  if (!isAlipayCnMerchantMode(body.merchantMode)) return { error: "Alipay CN merchant mode is invalid" };
  const merchantMode = body.merchantMode;
  const displayName = typeof body.name === "string" ? body.name.trim() || null : undefined;
  const description = typeof body.description === "string" ? body.description.trim() || null : undefined;
  if ((displayName?.length ?? 0) > 80 || (description?.length ?? 0) > 500) return { error: "Alipay CN name or description is too long" };
  const appId = text(body.appId);
  if (!/^\d{16}$/.test(appId)) return { error: "Alipay CN App ID format is invalid" };
  const gatewayUrl = text(body.gatewayUrl) || ALIPAY_CN_DEFAULT_GATEWAYS[environment];
  if (!isAlipayGatewayUrl(gatewayUrl)) return { error: "Alipay CN gateway URL is invalid" };
  const rawPrivateKey = text(body.privateKey);
  const rawPublicKey = text(body.alipayPublicKey);
  if ((!rawPrivateKey && !stored.privateKey) || (!rawPublicKey && !stored.alipayPublicKey)) return { error: "Alipay CN private key and Alipay public key are required for new configurations" };
  const privateKey = rawPrivateKey ? normalizeAlipayPrivateKey(rawPrivateKey) : "";
  if (privateKey === null) return { error: "Alipay CN private key format is invalid" };
  const alipayPublicKey = rawPublicKey ? normalizeAlipayPublicKey(rawPublicKey) : "";
  if (alipayPublicKey === null) return { error: "Alipay CN public key format is invalid" };
  const appAuthToken = merchantMode === "isv" ? text(body.appAuthToken) : "";
  if (merchantMode === "isv" && !appAuthToken && !stored.appAuthToken) return { error: "Alipay CN app auth token is required in ISV mode" };
  if (appAuthToken && !/^[A-Za-z0-9]{20,128}$/.test(appAuthToken)) return { error: "Alipay CN app auth token format is invalid" };
  const providerId = merchantMode === "isv" ? text(body.providerId) : "";
  if (providerId && !/^2088\d{12}$/.test(providerId)) return { error: "Alipay CN provider ID format is invalid" };
  const products = Array.isArray(body.products) ? [...new Set(body.products.filter(isAlipayCnProduct))] : [];
  if (!products.length) return { error: "Alipay CN products are required" };
  const notifyUrl = text(body.notifyUrl);
  const returnUrl = text(body.returnUrl);
  if ((notifyUrl && !isHttpsUrl(notifyUrl)) || (returnUrl && !isHttpsUrl(returnUrl))) return { error: "Alipay CN notify and return URLs must use HTTPS" };
  return { value: { environment, merchantMode, displayName, description, appId, gatewayUrl, privateKey, alipayPublicKey, appAuthToken, providerId, products, notifyUrl: notifyUrl || null, returnUrl: returnUrl || null } };
}

/** RSA2 request signature: non-empty parameters sorted by name, joined as `k=v&…`, signed with SHA256withRSA. */
export function signAlipayParams(params: Record<string, string>, privateKey: string) {
  const content = Object.keys(params).filter((key) => key !== "sign" && params[key] !== "").sort().map((key) => `${key}=${params[key]}`).join("&");
  return createSign("RSA-SHA256").update(content, "utf8").sign(privateKey, "base64");
}

/** Returns the exact JSON text of a top-level response node; Alipay signs these bytes, so re-serialising would break verification. */
export function extractAlipayResponseNode(raw: string, node: string): string | null {
  const marker = `"${node}":`;
  const start = raw.indexOf(marker);
  if (start === -1) return null;
  const begin = start + marker.length;
  if (raw[begin] !== "{") return null;
  let depth = 0;
  let inString = false;
  for (let index = begin; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return raw.slice(begin, index + 1);
  }
  return null;
}

export function verifyAlipayResponse(raw: string, node: string, sign: unknown, alipayPublicKey: string) {
  const content = extractAlipayResponseNode(raw, node);
  if (!content || typeof sign !== "string" || !sign) return false;
  try {
    return createVerify("RSA-SHA256").update(content, "utf8").verify(alipayPublicKey, sign, "base64");
  } catch {
    return false;
  }
}

type AlipayFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ status: number; text: () => Promise<string> }>;

function alipayTimestamp(now: Date) {
  // Alipay expects Beijing time (UTC+8) as "yyyy-MM-dd HH:mm:ss".
  return new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 19).replace("T", " ");
}

const QUERY_NODE = "alipay_trade_query_response";

/**
 * Calls Alipay with the saved credentials: queries a trade number that cannot exist. "Trade not found" proves the
 * App ID, application private key and (in ISV mode) app auth token; verifying that reply's signature proves the
 * Alipay public key. Read-only; never creates a trade. Messages never contain key material or the token.
 */
export async function testAlipayCnConnection(credentials: AlipayCnCredentials, fetchImpl: AlipayFetch = fetch as unknown as AlipayFetch, now = new Date()): Promise<AlipayCnTestResult> {
  const params: Record<string, string> = {
    app_id: credentials.appId,
    method: "alipay.trade.query",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: alipayTimestamp(now),
    version: "1.0",
    biz_content: JSON.stringify({ out_trade_no: `CONNTEST${randomBytes(8).toString("hex")}` }),
    ...(credentials.merchantMode === "isv" && credentials.appAuthToken ? { app_auth_token: credentials.appAuthToken } : {}),
  };
  params.sign = signAlipayParams(params, credentials.privateKey);

  let status: number;
  let raw: string;
  try {
    const response = await fetchImpl(`${credentials.gatewayUrl}?charset=utf-8`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    status = response.status;
    raw = await response.text();
  } catch {
    return { status: "error", message: "無法連線到支付寶網關，請稍後重試。", account: null };
  }
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  const node = (parsed?.[QUERY_NODE] ?? null) as Record<string, unknown> | null;
  if (!node || typeof node.code !== "string") {
    return { status: "error", message: `網關沒有回傳支付寶 API 格式的回應（HTTP ${status}）：請核對支付網關地址是否與開放平台控制台顯示的一致。`, account: null };
  }
  const subCode = typeof node.sub_code === "string" ? node.sub_code : null;
  const account: AlipayCnAccountSnapshot = { appId: credentials.appId, merchantMode: credentials.merchantMode, credentialsAccepted: false, responseSignatureVerified: false, subCode };
  const detail = `${node.code}${subCode ? `，${subCode}` : ""}`;

  if (subCode === "isv.invalid-app-id") return { status: "error", message: `支付寶不認識這個 App ID（${detail}）：請核對 App ID，並確認它屬於${credentials.gatewayUrl.includes("alipaydev") ? "沙箱" : "正式"}環境。`, account };
  if (subCode === "isv.invalid-signature") return { status: "error", message: `支付寶拒絕了請求簽名（${detail}）：應用私鑰與開放平台上登記的應用公鑰不配對，或該應用的加簽方式不是 RSA2 公鑰模式。`, account };
  if (subCode && /auth-token/.test(subCode)) return { status: "error", message: `支付寶拒絕了商戶授權令牌（${detail}）：請核對 app_auth_token 是否有效、未過期，且由此服務商應用取得。`, account };

  const tradeNotFound = node.code === "40004" && subCode === "ACQ.TRADE_NOT_EXIST";
  const noPermission = node.code === "40006" || subCode === "isv.insufficient-isv-permissions";
  if (!tradeNotFound && !noPermission && node.code !== "10000") return { status: "error", message: `支付寶回傳了未預期的結果（${detail}），請依錯誤碼在開放平台查詢原因後重試。`, account };

  account.credentialsAccepted = true;
  account.responseSignatureVerified = verifyAlipayResponse(raw, QUERY_NODE, parsed?.sign, credentials.alipayPublicKey);
  if (noPermission) return { status: "warning", message: `App ID 與應用私鑰驗證通過，但此應用沒有交易查詢權限（${detail}）：請在開放平台確認已簽約並上線所選的支付產品。`, account };
  if (!account.responseSignatureVerified) return { status: "error", message: "App ID 與應用私鑰驗證通過，但支付寶回應的簽名驗證失敗：支付寶公鑰不正確，請從開放平台重新複製「支付寶公鑰」（不是應用公鑰）。", account };
  return { status: "success", message: `已連線支付寶：App ID、應用私鑰與支付寶公鑰${credentials.merchantMode === "isv" ? "及商戶授權令牌" : ""}均驗證通過。`, account };
}
