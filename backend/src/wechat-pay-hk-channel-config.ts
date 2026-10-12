import { createDecipheriv, createPrivateKey, createSign, randomBytes } from "node:crypto";

export const WECHAT_PAY_HK_API_BASE = "https://apihk.mch.weixin.qq.com";
export const WECHAT_PAY_CN_API_BASE = "https://api.mch.weixin.qq.com";

/** The Hong Kong and mainland APIv3 share signing and certificate handling; only the host, paths and sub-merchant lookup differ. */
export type WechatPayApi = { base: string; certificatesPath: string; subMerchantLookup: boolean };
export const WECHAT_PAY_HK_API: WechatPayApi = { base: WECHAT_PAY_HK_API_BASE, certificatesPath: "/v3/global/certificates", subMerchantLookup: true };
export const WECHAT_PAY_CN_API: WechatPayApi = { base: WECHAT_PAY_CN_API_BASE, certificatesPath: "/v3/certificates", subMerchantLookup: false };
export const WECHAT_PAY_HK_MERCHANT_MODES = ["direct", "institution"] as const;
export type WechatPayHkMerchantMode = (typeof WECHAT_PAY_HK_MERCHANT_MODES)[number];

export type WechatPayHkConfigInput = {
  merchantMode: WechatPayHkMerchantMode;
  displayName: string | null | undefined;
  description: string | null | undefined;
  merchantId: string;
  appId: string;
  subMerchantId: string | null;
  subAppId: string | null;
  certificateSerialNo: string;
  privateKey: string;
  apiV3Key: string;
  notifyUrl: string | null;
};

export type WechatPayHkCredentials = {
  merchantMode: WechatPayHkMerchantMode;
  merchantId: string;
  appId: string;
  subMerchantId: string | null;
  certificateSerialNo: string;
  privateKey: string;
  apiV3Key: string;
};

export type WechatPayHkAccountSnapshot = {
  merchantId: string;
  merchantMode: WechatPayHkMerchantMode;
  platformCertificateSerialNo: string | null;
  platformCertificateExpireTime: string | null;
  subMerchant: { id: string; name: string | null } | null;
};

export type WechatPayHkTestResult = {
  status: "success" | "warning" | "error";
  message: string;
  account: WechatPayHkAccountSnapshot | null;
};

export function isWechatPayHkMerchantMode(value: unknown): value is WechatPayHkMerchantMode {
  return typeof value === "string" && (WECHAT_PAY_HK_MERCHANT_MODES as readonly string[]).includes(value);
}

function isRsaPrivateKeyPem(pem: string) {
  try {
    return createPrivateKey({ key: pem, format: "pem" }).asymmetricKeyType === "rsa";
  } catch {
    return false;
  }
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Validates an admin save request. A blank private key or APIv3 key means "keep the stored one" and is only allowed when one exists. */
export function parseWechatPayHkConfigInput(
  body: Record<string, unknown>,
  stored: { privateKey: boolean; apiV3Key: boolean },
): { value: WechatPayHkConfigInput } | { error: string } {
  if (!isWechatPayHkMerchantMode(body.merchantMode)) return { error: "WeChat Pay HK merchant mode is invalid" };
  const merchantMode = body.merchantMode;
  const displayName = typeof body.name === "string" ? body.name.trim() || null : undefined;
  const description = typeof body.description === "string" ? body.description.trim() || null : undefined;
  if ((displayName?.length ?? 0) > 80 || (description?.length ?? 0) > 500) return { error: "WeChat Pay HK name or description is too long" };
  const merchantId = text(body.merchantId);
  if (!/^\d{8,32}$/.test(merchantId)) return { error: "WeChat Pay HK merchant ID format is invalid" };
  const appId = text(body.appId);
  if (!/^wx[0-9a-z]{16}$/.test(appId)) return { error: "WeChat Pay HK App ID format is invalid" };
  const subMerchantId = merchantMode === "institution" ? text(body.subMerchantId) : "";
  const subAppId = merchantMode === "institution" ? text(body.subAppId) : "";
  if (merchantMode === "institution" && !/^\d{8,32}$/.test(subMerchantId)) return { error: "WeChat Pay HK sub-merchant ID format is invalid" };
  if (subAppId && !/^wx[0-9a-z]{16}$/.test(subAppId)) return { error: "WeChat Pay HK sub App ID format is invalid" };
  const certificateSerialNo = text(body.certificateSerialNo).toUpperCase();
  if (!/^[0-9A-F]{8,64}$/.test(certificateSerialNo)) return { error: "WeChat Pay HK certificate serial number format is invalid" };
  const privateKey = text(body.privateKey);
  if (!privateKey && !stored.privateKey) return { error: "WeChat Pay HK private key is required for new configurations" };
  if (privateKey && !isRsaPrivateKeyPem(privateKey)) return { error: "WeChat Pay HK private key format is invalid" };
  const apiV3Key = text(body.apiV3Key);
  if (!apiV3Key && !stored.apiV3Key) return { error: "WeChat Pay HK APIv3 key is required for new configurations" };
  if (apiV3Key && Buffer.byteLength(apiV3Key, "utf8") !== 32) return { error: "WeChat Pay HK APIv3 key must be 32 characters" };
  const notifyUrl = text(body.notifyUrl);
  if (notifyUrl && !/^https:\/\/\S+$/i.test(notifyUrl)) return { error: "WeChat Pay HK notify URL must use HTTPS" };
  return {
    value: { merchantMode, displayName, description, merchantId, appId, subMerchantId: subMerchantId || null, subAppId: subAppId || null, certificateSerialNo, privateKey, apiV3Key, notifyUrl: notifyUrl || null },
  };
}

/** Builds the APIv3 `Authorization` header: SHA256-with-RSA over method, canonical URL, timestamp, nonce and body. */
export function buildWechatPayAuthorization(
  credentials: Pick<WechatPayHkCredentials, "merchantId" | "certificateSerialNo" | "privateKey">,
  method: string,
  canonicalUrl: string,
  body = "",
  timestamp = Math.floor(Date.now() / 1000),
  nonce = randomBytes(16).toString("hex"),
) {
  const signature = createSign("RSA-SHA256").update(`${method}\n${canonicalUrl}\n${timestamp}\n${nonce}\n${body}\n`).sign(credentials.privateKey, "base64");
  return `WECHATPAY2-SHA256-RSA2048 mchid="${credentials.merchantId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${credentials.certificateSerialNo}"`;
}

/** Decrypts an APIv3 `AEAD_AES_256_GCM` resource; throws when the APIv3 key does not match. */
export function decryptWechatPayResource(apiV3Key: string, resource: { nonce: string; associated_data?: string; ciphertext: string }) {
  const payload = Buffer.from(resource.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(apiV3Key, "utf8"), Buffer.from(resource.nonce, "utf8"));
  decipher.setAuthTag(payload.subarray(payload.length - 16));
  decipher.setAAD(Buffer.from(resource.associated_data ?? "", "utf8"));
  return Buffer.concat([decipher.update(payload.subarray(0, payload.length - 16)), decipher.final()]).toString("utf8");
}

type WechatPayFetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

async function wechatPayGet(fetchImpl: WechatPayFetch, api: WechatPayApi, credentials: WechatPayHkCredentials, canonicalUrl: string) {
  const response = await fetchImpl(`${api.base}${canonicalUrl}`, {
    headers: { Authorization: buildWechatPayAuthorization(credentials, "GET", canonicalUrl), Accept: "application/json", "User-Agent": "master-travel-admin/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: response.ok, status: response.status, body, code: typeof body?.code === "string" ? body.code : null };
}

/**
 * Calls WeChat Pay with the saved credentials: downloads the platform certificates (proves merchant ID, certificate
 * serial number and private key), decrypts one (proves the APIv3 key), and in institution mode looks up the sub-merchant.
 * Read-only; never creates an order. Messages never contain key material.
 */
export async function testWechatPayHkConnection(credentials: WechatPayHkCredentials, fetchImpl: WechatPayFetch = fetch as unknown as WechatPayFetch, api: WechatPayApi = WECHAT_PAY_HK_API): Promise<WechatPayHkTestResult> {
  let certificates: Awaited<ReturnType<typeof wechatPayGet>>;
  try {
    certificates = await wechatPayGet(fetchImpl, api, credentials, api.certificatesPath);
  } catch {
    return { status: "error", message: "無法連線到微信支付，請稍後重試。", account: null };
  }
  if (certificates.status === 401) {
    return { status: "error", message: `微信支付拒絕了簽名${certificates.code ? `（${certificates.code}）` : ""}：請核對商戶號、API 證書序號與商戶 API 私鑰是否屬於同一張證書。`, account: null };
  }
  if (certificates.status === 403) return { status: "error", message: `此商戶號沒有呼叫該接口的權限${certificates.code ? `（${certificates.code}）` : ""}，請在微信支付商戶平台確認 API 權限。`, account: null };
  const list = Array.isArray(certificates.body?.data) ? (certificates.body.data as Record<string, unknown>[]) : [];
  // Merchants on the WeChat Pay public-key scheme have no platform certificate to download; the signature was still accepted.
  if (certificates.status === 404 || (certificates.ok && !list.length)) {
    const account: WechatPayHkAccountSnapshot = { merchantId: credentials.merchantId, merchantMode: credentials.merchantMode, platformCertificateSerialNo: null, platformCertificateExpireTime: null, subMerchant: null };
    return { status: "warning", message: `商戶號、API 證書與私鑰驗證通過，但此商戶沒有可下載的平台證書（HTTP ${certificates.status}${certificates.code ? `，${certificates.code}` : ""}），可能使用微信支付公鑰模式，因此未能驗證 APIv3 密鑰。`, account };
  }
  if (!certificates.ok || !list.length) {
    return { status: "error", message: `微信支付回應異常（HTTP ${certificates.status}${certificates.code ? `，${certificates.code}` : ""}），請稍後重試。`, account: null };
  }

  // The newest certificate is the one callbacks will be signed with for longest.
  const newest = [...list].sort((a, b) => String(b.expire_time ?? "").localeCompare(String(a.expire_time ?? "")))[0];
  const encrypted = (newest.encrypt_certificate ?? null) as { nonce?: unknown; associated_data?: unknown; ciphertext?: unknown } | null;
  try {
    if (typeof encrypted?.nonce !== "string" || typeof encrypted.ciphertext !== "string") throw new Error("missing certificate");
    const pem = decryptWechatPayResource(credentials.apiV3Key, { nonce: encrypted.nonce, associated_data: typeof encrypted.associated_data === "string" ? encrypted.associated_data : "", ciphertext: encrypted.ciphertext });
    if (!pem.includes("BEGIN CERTIFICATE")) throw new Error("not a certificate");
  } catch {
    return { status: "error", message: "已通過微信支付簽名驗證，但 APIv3 密鑰無法解密平台證書：APIv3 密鑰不正確，請在商戶平台「API 安全」核對後重新輸入。", account: null };
  }

  const account: WechatPayHkAccountSnapshot = {
    merchantId: credentials.merchantId,
    merchantMode: credentials.merchantMode,
    platformCertificateSerialNo: typeof newest.serial_no === "string" ? newest.serial_no : null,
    platformCertificateExpireTime: typeof newest.expire_time === "string" ? newest.expire_time : null,
    subMerchant: null,
  };
  if (credentials.merchantMode !== "institution" || !credentials.subMerchantId) {
    return { status: "success", message: "已連線微信支付：商戶號、API 證書、私鑰與 APIv3 密鑰均驗證通過。", account };
  }
  if (!api.subMerchantLookup) {
    return { status: "success", message: `已連線微信支付：服務商商戶號、API 證書、私鑰與 APIv3 密鑰均驗證通過。子商戶號 ${credentials.subMerchantId} 無法在此測試中核對，請自行確認。`, account };
  }

  // The sub-merchant lookup is advisory: the institution credentials above are already proven valid.
  const query = `/v3/global/merchants/${encodeURIComponent(credentials.subMerchantId)}?sp_mchid=${encodeURIComponent(credentials.merchantId)}&sp_appid=${encodeURIComponent(credentials.appId)}`;
  try {
    const subMerchant = await wechatPayGet(fetchImpl, api, credentials, query);
    if (subMerchant.ok && subMerchant.body?.sub_mchid === credentials.subMerchantId) {
      const name = typeof subMerchant.body.shortname === "string" ? subMerchant.body.shortname : typeof subMerchant.body.name === "string" ? subMerchant.body.name : null;
      account.subMerchant = { id: credentials.subMerchantId, name };
      return { status: "success", message: "已連線微信支付：機構商戶憑證驗證通過，子商戶號已確認歸屬於此機構。", account };
    }
    return { status: "warning", message: `機構商戶憑證驗證通過，但無法確認子商戶號 ${credentials.subMerchantId}（HTTP ${subMerchant.status}${subMerchant.code ? `，${subMerchant.code}` : ""}）：請核對子商戶號及機構 App ID。`, account };
  } catch {
    return { status: "warning", message: "機構商戶憑證驗證通過，但查詢子商戶時連線失敗，請稍後重新測試。", account };
  }
}
