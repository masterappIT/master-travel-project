import { chromium } from "playwright-core";

export const inviteShareTitle = "MasterApp｜司機端 ｜邀請接單";

export function escapeShareHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function inviteShareHtml(base: URL, token: string, trip: {
  origin: string; destination: string; scheduledAt: string;
  vehicleCategory: string | null; payoutAmount: unknown; payoutCurrency: string | null;
}): string {
  const page = new URL("/order-invite", base);
  page.searchParams.set("token", token);
  const image = new URL("/order-invite/share-image", base);
  image.searchParams.set("token", token);
  const description = `${trip.origin} → ${trip.destination}｜${trip.scheduledAt}｜${trip.vehicleCategory ?? ""}｜${trip.payoutCurrency ?? ""} ${trip.payoutAmount ?? ""}`;
  const title = escapeShareHtml(inviteShareTitle);
  const url = escapeShareHtml(page.href);
  const imageUrl = escapeShareHtml(image.href);
  const summary = escapeShareHtml(description);
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${title}</title><meta name="description" content="${summary}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${summary}"><meta property="og:url" content="${url}"><meta property="og:image" content="${imageUrl}"><meta property="og:image:width" content="430"><meta property="og:image:height" content="600"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${summary}"><meta name="twitter:image" content="${imageUrl}"><meta http-equiv="refresh" content="0;url=${url}"></head><body><a href="${url}">${title}</a></body></html>`;
}

let activeRenders = 0;
export async function renderInviteCard(base: URL, token: string): Promise<Buffer> {
  if (activeRenders >= 2) throw new Error("Preview renderer is busy");
  activeRenders++;
  try {
    const url = new URL("/order-invite-preview", base);
    url.searchParams.set("token", token);
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      const page = await browser.newPage({ viewport: { width: 430, height: 600 }, deviceScaleFactor: 1, locale: "zh-HK" });
      await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.locator('body[data-order-invite-preview-ready="true"]').waitFor({ timeout: 20000 });
      await page.evaluate(() => document.fonts.ready);
      return await page.screenshot({ type: "png", animations: "disabled", timeout: 10000 });
    } finally {
      await browser.close();
    }
  } finally {
    activeRenders--;
  }
}
