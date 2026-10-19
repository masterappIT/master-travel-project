import http from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const port = Number(process.env.PORT || 8080);
const driverUrlBase = process.env.DRIVER_ORDER_URL_BASE;
// Rendered images are kept on a volume so restarts and other renderer processes reuse them.
const shareImageDir = process.env.SHARE_IMAGE_DIR;
if (!driverUrlBase) throw new Error("DRIVER_ORDER_URL_BASE is required");
if (!shareImageDir) throw new Error("SHARE_IMAGE_DIR is required");
const browserPromise = chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const imageCache = new Map();
const inFlight = new Map();
const cacheTtlMs = 10 * 60 * 1000;
const maxCacheEntries = 100;
// Bump when the rendered card changes so stored images are rendered again.
const cacheVersion = "v2";
// Invite links last at most 30 days, so older images are never requested again.
const storedImageMaxAgeMs = 35 * 24 * 60 * 60 * 1000;
const temporaryMaxAgeMs = 60 * 60 * 1000;
const pruneIntervalMs = 6 * 60 * 60 * 1000;
let active = false;

function cachePath(token) {
  return path.join(shareImageDir, "order-invites", cacheVersion, `${createHash("sha256").update(token).digest("hex")}.png`);
}

async function readStoredImage(token) {
  let image;
  try {
    image = await readFile(cachePath(token));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  storeImage(token, image);
  return image;
}

// Write to a temporary file first so a reader never sees a partly written image.
async function saveStoredImage(token, image) {
  const file = cachePath(token);
  const temporary = `${file}.${randomUUID()}.tmp`;
  await mkdir(path.dirname(file), { recursive: true });
  try {
    await writeFile(temporary, image);
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

// Removes old images and temporary files left by an interrupted write, including older cache versions.
async function pruneStoredImages() {
  const root = path.join(shareImageDir, "order-invites");
  let entries;
  try {
    entries = await readdir(root, { recursive: true, withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  const now = Date.now();
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath ?? entry.path, entry.name);
    const maxAge = entry.name.endsWith(".tmp") ? temporaryMaxAgeMs : storedImageMaxAgeMs;
    try {
      if (now - (await stat(file)).mtimeMs > maxAge) {
        await rm(file, { force: true });
        removed += 1;
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  if (removed) console.log(`Removed ${removed} expired share image files`);
}

function schedulePrune() {
  pruneStoredImages().catch((error) => console.error("Failed to prune share images", error));
}

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
  const existing = inFlight.get(token);
  if (existing) return existing;
  const render = (async () => {
    const memoryCached = cachedImage(token);
    if (memoryCached) return { image: memoryCached, cacheHit: true };
    const stored = await readStoredImage(token);
    if (stored) return { image: stored, cacheHit: true };
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
        await saveStoredImage(token, image);
        return { image, cacheHit: false };
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
    const result = await renderImage(token);
    response.writeHead(200, {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400, immutable",
      "x-share-image-cache": result.cacheHit ? "HIT" : "MISS",
    }).end(result.image);
  } catch (error) {
    console.error("Failed to render invite image", error);
    if (!response.headersSent) response.writeHead(503).end("preview unavailable");
  }
});
server.listen(port, "0.0.0.0");
schedulePrune();
setInterval(schedulePrune, pruneIntervalMs).unref();
