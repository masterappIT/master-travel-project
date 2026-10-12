/**
 * Finance-centre view of payment channels. Payment settings owns whether a channel is technically connected;
 * the finance centre owns whether it is used and for what. Neither side changes the other's state: a channel is
 * offered to passengers only when both agree, and after a technical outage finance has to confirm it again.
 */

/** Every passenger-side action that takes money. Each one has its own payment sheet arranged by finance. */
export const FINANCE_SCENARIOS = [
  { key: "TRIP_PAYMENT", label: "行程付款" },
  { key: "FARE_TOP_UP", label: "車費增值" },
  { key: "MEMBERSHIP", label: "會員訂閱" },
] as const;
export type FinanceScenario = (typeof FINANCE_SCENARIOS)[number]["key"];
export type FinanceChannelStatus = "ACTIVE" | "DISABLED";

export type ChannelTechnicalFacts = { provider: string; environment: string; lastTestStatus: string | null; lastUnavailableAt: Date | null };
export type FinanceChannelFacts = { status: string; confirmedAt: Date };

export type TechnicalReason = "OK" | "NOT_TESTED" | "TEST_FAILED" | "NO_LIVE_TEST";
export type OperatingState = "NOT_ADOPTED" | "ACTIVE" | "DISABLED" | "TECH_UNAVAILABLE" | "NEEDS_CONFIRMATION";

/** AlipayHK's check only validates key format and never calls AlipayHK, so it cannot prove the service is connected. */
const PROVIDERS_WITHOUT_LIVE_TEST = new Set(["ALIPAY_HK"]);

export function isFinanceScenario(value: unknown): value is FinanceScenario {
  return typeof value === "string" && FINANCE_SCENARIOS.some((scenario) => scenario.key === value);
}

/** "Connected" means the last live connection test reached the provider and the account can be used; a warning still counts. */
export function channelTechnicalState(config: ChannelTechnicalFacts): { usable: boolean; reason: TechnicalReason } {
  if (PROVIDERS_WITHOUT_LIVE_TEST.has(config.provider)) return { usable: false, reason: "NO_LIVE_TEST" };
  if (config.lastTestStatus === "success" || config.lastTestStatus === "warning") return { usable: true, reason: "OK" };
  return { usable: false, reason: config.lastTestStatus === "error" ? "TEST_FAILED" : "NOT_TESTED" };
}

export function channelOperatingState(config: ChannelTechnicalFacts, finance: FinanceChannelFacts | null): OperatingState {
  if (!finance) return "NOT_ADOPTED";
  if (finance.status !== "ACTIVE") return "DISABLED";
  if (!channelTechnicalState(config).usable) return "TECH_UNAVAILABLE";
  // The channel went down (or its credentials were replaced) after finance last confirmed it: passing the test again is not enough.
  if (config.lastUnavailableAt && config.lastUnavailableAt.getTime() >= finance.confirmedAt.getTime()) return "NEEDS_CONFIRMATION";
  return "ACTIVE";
}

/** Passengers get sandbox channels only while the system is in test mode, and production channels otherwise; never both. */
export function channelEnvironmentInUse(sandboxMode: boolean) {
  return sandboxMode ? "sandbox" : "production";
}

export function isChannelOffered(config: ChannelTechnicalFacts, finance: FinanceChannelFacts | null, sandboxMode: boolean) {
  return config.environment === channelEnvironmentInUse(sandboxMode) && channelOperatingState(config, finance) === "ACTIVE";
}

/** Validates a finance decision. Activating (or re-confirming) is only allowed while payment settings reports the channel connected. */
export function parseFinanceChannelInput(body: Record<string, unknown>, config: ChannelTechnicalFacts): { value: { status: FinanceChannelStatus } } | { error: string } {
  const status = body.status === "ACTIVE" ? "ACTIVE" : body.status === "DISABLED" ? "DISABLED" : null;
  if (!status) return { error: "Finance channel status is invalid" };
  if (status === "ACTIVE" && !channelTechnicalState(config).usable) return { error: "Finance channel is not technically connected" };
  return { value: { status } };
}

// ---- Payment sheet: what a passenger sees when paying, as arranged by finance ----

export const SHEET_KINDS = ["FARE_BALANCE", "CASH_BALANCE", "EXTERNAL"] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];
/** Icons the passenger app ships with; the sheet can only refer to these. */
export const SHEET_ICONS = ["wallet-fare", "wallet-cash", "wechat", "alipay", "bank"] as const;
export type SheetIcon = (typeof SHEET_ICONS)[number];
export const SHEET_PROVIDERS = ["STRIPE", "WECHATPAY_HK", "WECHATPAY_CN", "ALIPAY_HK", "ALIPAY_CN", "PAYME"] as const;
export const SHEET_MAX_ITEMS = 8;
export const SHEET_LABEL_MAX_LENGTH = 24;

export type SheetItem = { kind: SheetKind; label: string; icon: SheetIcon; enabled: boolean; provider: string | null };

/** The sheet as the passenger app has always shown it; used until finance saves its own arrangement. */
export function defaultSheetItems(flags: { fareBalancePayEnabled: boolean; cashBalancePayEnabled: boolean; wechatPayEnabled: boolean; alipayPayEnabled: boolean; bankCardPayEnabled: boolean }): SheetItem[] {
  return [
    { kind: "FARE_BALANCE", label: "車費餘額", icon: "wallet-fare", enabled: flags.fareBalancePayEnabled, provider: null },
    { kind: "CASH_BALANCE", label: "現金餘額", icon: "wallet-cash", enabled: flags.cashBalancePayEnabled, provider: null },
    { kind: "EXTERNAL", label: "微信支付（支持香港/澳門）", icon: "wechat", enabled: flags.wechatPayEnabled, provider: null },
    { kind: "EXTERNAL", label: "支付寶支付", icon: "alipay", enabled: flags.alipayPayEnabled, provider: null },
    { kind: "EXTERNAL", label: "銀行帳戶 支付", icon: "bank", enabled: flags.bankCardPayEnabled, provider: null },
  ];
}

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === "string" && (list as readonly string[]).includes(value);

/** Validates a whole sheet. Each wallet may appear once; an external row may be left without a provider, in which case passengers never see it. */
export function parseSheetItems(input: unknown): { value: SheetItem[] } | { error: string } {
  if (!Array.isArray(input) || !input.length || input.length > SHEET_MAX_ITEMS) return { error: "Payment sheet must have between 1 and 8 items" };
  const items: SheetItem[] = [];
  for (const raw of input as Record<string, unknown>[]) {
    if (!raw || typeof raw !== "object" || !isOneOf(SHEET_KINDS, raw.kind)) return { error: "Payment sheet item kind is invalid" };
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    if (!label || label.length > SHEET_LABEL_MAX_LENGTH) return { error: "Payment sheet item label is invalid" };
    if (!isOneOf(SHEET_ICONS, raw.icon)) return { error: "Payment sheet item icon is invalid" };
    const provider = raw.kind === "EXTERNAL" && typeof raw.provider === "string" && raw.provider ? raw.provider : null;
    if (provider && !isOneOf(SHEET_PROVIDERS, provider)) return { error: "Payment sheet item provider is invalid" };
    items.push({ kind: raw.kind, label, icon: raw.icon, enabled: raw.enabled !== false, provider });
  }
  for (const wallet of ["FARE_BALANCE", "CASH_BALANCE"] as const) {
    if (items.filter((item) => item.kind === wallet).length > 1) return { error: "Payment sheet can list each wallet only once" };
  }
  return { value: items };
}

export type ChannelRow = ChannelTechnicalFacts & { financeChannel: FinanceChannelFacts | null };

/**
 * The rows a passenger is shown: enabled wallets, and enabled external rows whose provider has a channel that payment
 * settings reports connected and finance operates, in the environment in use. Nothing here exposes credentials.
 */
export function passengerSheetRows<T extends SheetItem & { id: string }>(items: T[], channels: ChannelRow[], sandboxMode: boolean) {
  const offeredProviders = new Set(channels.filter((channel) => isChannelOffered(channel, channel.financeChannel, sandboxMode)).map((channel) => channel.provider));
  return items
    .filter((item) => item.enabled && (item.kind !== "EXTERNAL" || (item.provider !== null && offeredProviders.has(item.provider))))
    .map((item) => ({ id: item.id, kind: item.kind, label: item.label, icon: item.icon, provider: item.provider }));
}
