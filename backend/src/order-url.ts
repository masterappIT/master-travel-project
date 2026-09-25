export function buildDriverOrderUrl(token: string, configuredBase = process.env.DRIVER_ORDER_URL_BASE) {
  const base = configuredBase?.trim();
  if (!base) throw new Error("DRIVER_ORDER_URL_BASE must be configured");

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error("DRIVER_ORDER_URL_BASE must be an absolute HTTP(S) URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("DRIVER_ORDER_URL_BASE must be an absolute HTTP(S) URL");

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.searchParams.set("token", token);
  return url.toString();
}
