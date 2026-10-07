import os from "node:os";

function localDriverOrderBase() {
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const network of interfaces ?? []) {
      if (network.family === "IPv4" && !network.internal && network.address) {
        return `http://${network.address}:8085/order-invite`;
      }
    }
  }
  return "http://127.0.0.1:8085/order-invite";
}

export function resolveDriverOrderBase(
  configuredBase = process.env.DRIVER_ORDER_URL_BASE?.trim() || localDriverOrderBase(),
) {
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
  return url;
}

export function buildDriverOrderUrl(token: string, configuredBase = process.env.DRIVER_ORDER_URL_BASE?.trim() || localDriverOrderBase()) {
  const url = resolveDriverOrderBase(configuredBase);
  url.searchParams.set("token", token);
  return url.toString();
}
