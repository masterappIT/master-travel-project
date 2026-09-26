import http from "node:http";
import { chromium } from "playwright";

const port = Number(process.env.PORT || 8080);
const driverUrlBase = process.env.DRIVER_ORDER_URL_BASE;
if (!driverUrlBase) throw new Error("DRIVER_ORDER_URL_BASE is required");
const browserPromise = chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const imageCache = new Map();
const inFlight = new Map();
const cacheTtlMs = 10 * 60 * 1000;
const maxCacheEntries = 100;
let active = false;

function cachedImage(token) {
  const entry = imageCache.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    imageCache.delete(token);
    return null;
  }
  imageCache.delete(token);
  imageCache.set(token, entry);
  return entry.image;
}

function storeImage(token, image) {
  imageCache.delete(token);
  imageCache.set(token, { image, expiresAt: Date.now() + cacheTtlMs });
  while (imageCache.size > maxCacheEntries) imageCache.delete(imageCache.keys().next().value);
}

async function renderImage(token) {
  const cached = cachedImage(token);
  if (cached) return cached;
  const existing = inFlight.get(token);
  if (existing) return existing;
  const render = (async () => {
    if (active) throw new Error("renderer busy");
    active = true;
    try {
      const url = new URL("/order-invite-preview", driverUrlBase);
      url.searchParams.set("token", token);
      const browser = await browserPromise;
      const page = await browser.newPage({ viewport: { width: 430, height: 600 }, deviceScaleFactor: 2, locale: "zh-HK" });
      try {
        await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.locator('body[data-order-invite-preview-ready="true"]').waitFor({ timeout: 20000 });
        await page.evaluate(() => document.fonts.ready);
        const image = await page.screenshot({ type: "png", animations: "disabled", timeout: 10000 });
        storeImage(token, image);
        return image;
      } finally { await page.close(); }
    } finally {
      active = false;
    }
  })();
  inFlight.set(token, render);
  try {
    return await render;
  } finally {
    inFlight.delete(token);
  }
}

function tokenFrom(requestUrl) {
  const token = new URL(requestUrl, "http://renderer").searchParams.get("token") || "";
  if (!token || token.length > 512 || /[\u0000-\u001f\u007f]/.test(token)) return null;
  return token;
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url?.split("?")[0] === "/health/live") {
    response.writeHead(200, { "content-type": "text/plain" }).end("ok");
    return;
  }
  if (request.method !== "GET" || request.url?.split("?")[0] !== "/order-invite/share-image") {
    response.writeHead(404).end();
    return;
  }
  const token = tokenFrom(request.url);
  if (!token) { response.writeHead(400).end("token is required"); return; }
  try {
    const cached = cachedImage(token);
    const image = await renderImage(token);
    response.writeHead(200, {
      "content-type": "image/png",
      "cache-control": "public, max-age=600, stale-while-revalidate=60",
      "x-share-image-cache": cached ? "HIT" : "MISS",
    }).end(image);
  } catch (error) {
    console.error("Failed to render invite image", error);
    if (!response.headersSent) response.writeHead(503).end("preview unavailable");
  }
});
server.listen(port, "0.0.0.0");
