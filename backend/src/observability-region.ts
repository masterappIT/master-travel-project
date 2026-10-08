import { isIP } from "node:net";
import { open, type CityResponse, type Reader } from "maxmind";

export function normalizeObservabilityIp(value: string | undefined) {
  const raw = value?.split(",", 1)[0]?.trim();
  const candidate = raw?.startsWith("[") && raw.includes("]")
    ? raw.slice(1, raw.indexOf("]"))
    : raw && /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(raw)
      ? raw.slice(0, raw.lastIndexOf(":"))
      : raw;
  if (!candidate || !isIP(candidate)) return undefined;
  return candidate.startsWith("::ffff:") ? candidate.slice(7) : candidate;
}

export function observabilityIpSelection(req: {
  ip?: string;
  headers: { ["x-real-ip"]?: string; ["x-forwarded-for"]?: string };
  socket?: { remoteAddress?: string };
}, preferForwarded = false) {
  const candidates = {
    request: normalizeObservabilityIp(req.ip),
    real: normalizeObservabilityIp(req.headers["x-real-ip"]),
    forwarded: normalizeObservabilityIp(req.headers["x-forwarded-for"]),
    socket: normalizeObservabilityIp(req.socket?.remoteAddress),
  };
  const priority = preferForwarded ? ["real", "forwarded", "request", "socket"] as const : ["request", "real", "forwarded", "socket"] as const;
  const source = priority.find(key => candidates[key]) || "none";
  const ip = source === "none" ? undefined : candidates[source];
  return {
    ip,
    diagnostic: {
      source,
      selectedClass: observabilityIpClass(ip),
      forwardedClass: observabilityIpClass(candidates.forwarded),
      sameAsForwarded: Boolean(ip && candidates.forwarded && ip === candidates.forwarded),
      realClass: observabilityIpClass(candidates.real),
      sameAsReal: Boolean(ip && candidates.real && ip === candidates.real),
    },
  };
}

function observabilityIpClass(ip: string | undefined) {
  if (!ip) return "missing";
  if (/^169\.254\./.test(ip) || /^fe[89ab]/i.test(ip)) return "link_local";
  return isPrivateObservabilityIp(ip) ? "private_or_loopback" : "public_candidate";
}

export function isPrivateObservabilityIp(ip: string) {
  return !ip || ip === "::1" || /^127\./.test(ip) || ip.startsWith("10.") || ip.startsWith("192.168.") || /^(172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip) || ip.startsWith("fc") || ip.startsWith("fd") || /^fe[89ab]/i.test(ip);
}

export function regionFromGeoIp(ip: string | undefined, lookup: (ip: string) => CityResponse | null) {
  const normalizedIp = normalizeObservabilityIp(ip);
  if (isPrivateObservabilityIp(normalizedIp || "")) return "本機／內網";
  const record = lookup(normalizedIp!);
  const country = record?.country?.names?.["zh-CN"] || record?.country?.names?.en;
  const subdivision = record?.subdivisions?.[0]?.names?.["zh-CN"] || record?.subdivisions?.[0]?.names?.en;
  const city = record?.city?.names?.["zh-CN"] || record?.city?.names?.en;
  return [country, subdivision || city].filter(Boolean).join(" · ") || "未知地區";
}

export function createObservabilityRegionResolver(
  lookup: (ip: string) => Promise<string>,
  onFailure: (error: unknown) => void,
) {
  const cache = new Map<string, { region: string; expiresAt: number }>();
  const pending = new Map<string, Promise<string>>();
  const cacheTtlMs = 24 * 60 * 60 * 1000;
  const cacheMaxEntries = 10_000;
  return async (ip: string | undefined) => {
    const normalizedIp = normalizeObservabilityIp(ip);
    if (isPrivateObservabilityIp(normalizedIp || "")) return "本機／內網";
    const cached = cache.get(normalizedIp!);
    if (cached && cached.expiresAt > Date.now()) return cached.region;
    const existing = pending.get(normalizedIp!);
    if (existing) return existing;
    const request = lookup(normalizedIp!).then(region => {
      cache.delete(normalizedIp!);
      cache.set(normalizedIp!, { region, expiresAt: Date.now() + (region === "未知地區" ? 60 * 60 * 1000 : cacheTtlMs) });
      if (cache.size > cacheMaxEntries) cache.delete(cache.keys().next().value!);
      return region;
    }).catch(error => {
      onFailure(error);
      return "未知地區";
    }).finally(() => pending.delete(normalizedIp!));
    pending.set(normalizedIp!, request);
    return request;
  };
}

let readerPromise: Promise<Reader<CityResponse>> | undefined;
export function resolveLocalObservabilityRegion(ip: string | undefined) {
  if (isPrivateObservabilityIp(normalizeObservabilityIp(ip) || "")) return Promise.resolve("本機／內網");
  readerPromise ??= open<CityResponse>(process.env.OBSERVABILITY_GEOIP_DB_PATH || "/app/backend/geoip/dbip-city-lite.mmdb").catch(error => {
    readerPromise = undefined;
    throw error;
  });
  return readerPromise.then(reader => regionFromGeoIp(ip, value => reader.get(value)));
}
