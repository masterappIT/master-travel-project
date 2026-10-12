import { createHmac, randomUUID } from "node:crypto";

export type PaymeEnvironment = "sandbox" | "production";

export const PAYME_API_VERSION = "0.12";
export const PAYME_API_BASES: Record<PaymeEnvironment, string> = {
  sandbox: "https://sandbox.api.payme.hsbc.com.hk",
  production: "https://api.payme.hsbc.com.hk",
};

export type PaymeConfigInput = {
  environment: PaymeEnvironment;
  displayName: string | null | undefined;
  description: string | null | undefined;
  clientId: string;
  clientSecret: string;
  signingKeyId: string;
  signingKey: string;
};

export type PaymeCredentials = { environment: PaymeEnvironment; clientId: string; clientSecret: string; signingKeyId: string; signingKey: string };

export type PaymeAccountSnapshot = { clientId: string; environment: PaymeEnvironment; tokenIssued: boolean; signatureAccepted: boolean };

export type PaymeTestResult = { status: "success" | "warning" | "error"; message: string; account: PaymeAccountSnapshot | null };

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Validates an admin save request. A blank client secret or signing key means "keep the stored one" and is only allowed when one exists. */
export function parsePaymeConfigInput(body: Record<string, unknown>, stored: { clientSecret: boolean; signingKey: boolean }): { value: PaymeConfigInput } | { error: string } {
  const environment = body.environment === "production" ? "production" : body.environment === "sandbox" ? "sandbox" : null;
  if (!environment) return { error: "PayMe environment is invalid" };
  const displayName = typeof body.name === "string" ? body.name.trim() || null : undefined;
  const description = typeof body.description === "string" ? body.description.trim() || null : undefined;
  if ((displayName?.length ?? 0) > 80 || (description?.length ?? 0) > 500) return { error: "PayMe name or description is too long" };
  const clientId = text(body.clientId).toLowerCase();
  if (!UUID_PATTERN.test(clientId)) return { error: "PayMe client ID format is invalid" };
  const signingKeyId = text(body.signingKeyId).toLowerCase();
  if (!UUID_PATTERN.test(signingKeyId)) return { error: "PayMe signing key ID format is invalid" };
  const clientSecret = text(body.clientSecret);
  if (!clientSecret && !stored.clientSecret) return { error: "PayMe client secret is required for new configurations" };
  if (clientSecret.length > 512) return { error: "PayMe client secret format is invalid" };
  const signingKey = text(body.signingKey);
  if (!signingKey && !stored.signingKey) return { error: "PayMe signing key is required for new configurations" };
  // The signing key is issued Base64-encoded and is decoded to bytes before use as the HMAC secret.
  if (signingKey && (!/^[A-Za-z0-9+/]+={0,2}$/.test(signingKey) || signingKey.length % 4 !== 0 || Buffer.from(signingKey, "base64").length < 16)) return { error: "PayMe signing key format is invalid" };
  return { value: { environment, displayName, description, clientId, clientSecret, signingKeyId, signingKey } };
}

/** Builds the PayMe `Signature` header (draft-cavage HTTP signatures, hmac-sha256) for a request without a body. */
export function buildPaymeSignature(credentials: Pick<PaymeCredentials, "signingKeyId" | "signingKey">, method: string, path: string, headers: { "Api-Version": string; "Request-Date-Time": string; "Trace-Id": string; Authorization: string }) {
  const signed: [string, string][] = [["(request-target)", `${method.toLowerCase()} ${path}`], ...(["Api-Version", "Request-Date-Time", "Trace-Id", "Authorization"] as const).map((name): [string, string] => [name.toLowerCase(), headers[name]])];
  const signature = createHmac("sha256", Buffer.from(credentials.signingKey, "base64")).update(signed.map(([name, value]) => `${name}: ${value}`).join("\n")).digest("base64");
  return `keyId="${credentials.signingKeyId}",algorithm="hmac-sha256",headers="${signed.map(([name]) => name).join(" ")}",signature="${signature}"`;
}

type PaymeFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

function paymeErrorCode(body: Record<string, unknown> | null) {
  const first = Array.isArray(body?.errors) ? (body.errors[0] as Record<string, unknown> | undefined) : undefined;
  const code = first?.errorCode ?? body?.errorCode ?? body?.code;
  return typeof code === "string" ? code : null;
}

/**
 * Calls PayMe with the saved credentials: requests an access token (proves client ID and secret), then lists
 * transactions with a signed request (proves signing key ID and signing key). Read-only; never creates a payment
 * request. Messages never contain the secret or the signing key.
 */
export async function testPaymeConnection(credentials: PaymeCredentials, fetchImpl: PaymeFetch = fetch as unknown as PaymeFetch): Promise<PaymeTestResult> {
  const base = PAYME_API_BASES[credentials.environment];
  const call = async (path: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    const response = await fetchImpl(`${base}${path}`, { ...init, signal: AbortSignal.timeout(10_000) });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: response.ok, status: response.status, body, code: paymeErrorCode(body) };
  };
  const detail = (response: { status: number; code: string | null }) => `HTTP ${response.status}${response.code ? `，${response.code}` : ""}`;

  let token: Awaited<ReturnType<typeof call>>;
  try {
    token = await call("/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "Api-Version": PAYME_API_VERSION },
      body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret }).toString(),
    });
  } catch {
    return { status: "error", message: "無法連線到 PayMe，請稍後重試。", account: null };
  }
  if (token.status === 400 || token.status === 401 || token.status === 403) {
    return { status: "error", message: `PayMe 拒絕了這組憑證（${detail(token)}）：請核對 Client ID 與 Client Secret，並確認它們屬於${credentials.environment === "production" ? "正式（Live）" : " Sandbox "}環境。`, account: null };
  }
  const accessToken = typeof token.body?.accessToken === "string" ? token.body.accessToken : "";
  if (!token.ok || !accessToken) return { status: "error", message: `PayMe 回應異常（${detail(token)}），請稍後重試。`, account: null };

  const account: PaymeAccountSnapshot = { clientId: credentials.clientId, environment: credentials.environment, tokenIssued: true, signatureAccepted: false };
  const path = "/payments/transactions";
  const headers = { "Api-Version": PAYME_API_VERSION, "Request-Date-Time": new Date().toISOString(), "Trace-Id": randomUUID(), Authorization: `Bearer ${accessToken}` };
  try {
    const transactions = await call(path, { method: "GET", headers: { ...headers, "Content-Type": "application/json", Accept: "application/json", "Accept-Language": "en-US", Signature: buildPaymeSignature(credentials, "GET", path, headers) } });
    if (transactions.ok) {
      account.signatureAccepted = true;
      return { status: "success", message: "已連線 PayMe：Client ID、Client Secret、Signing Key ID 與 Signing Key 均驗證通過。", account };
    }
    if (transactions.status === 400 || transactions.status === 401 || transactions.status === 403) {
      return { status: "error", message: `Client ID 與 Client Secret 驗證通過，但 PayMe 拒絕了簽名請求（${detail(transactions)}）：請核對 Signing Key ID 與 Signing Key。`, account };
    }
    return { status: "warning", message: `Client ID 與 Client Secret 驗證通過，但未能確認簽名金鑰（${detail(transactions)}），請稍後重新測試。`, account };
  } catch {
    return { status: "warning", message: "Client ID 與 Client Secret 驗證通過，但驗證簽名金鑰時連線失敗，請稍後重新測試。", account };
  }
}
