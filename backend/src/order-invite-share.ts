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
  const appPage = new URL("/order-invite-app", base);
  appPage.searchParams.set("token", token);
  const image = new URL("/order-invite/share-image", base);
  image.searchParams.set("token", token);
  const description = `${trip.origin} → ${trip.destination}｜${trip.scheduledAt}｜${trip.vehicleCategory ?? ""}｜${trip.payoutCurrency ?? ""} ${trip.payoutAmount ?? ""}`;
  const title = escapeShareHtml(inviteShareTitle);
  const url = escapeShareHtml(appPage.href);
  const imageUrl = escapeShareHtml(image.href);
  const summary = escapeShareHtml(description);
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${title}</title><meta name="description" content="${summary}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${summary}"><meta property="og:url" content="${url}"><meta property="og:image" content="${imageUrl}"><meta property="og:image:width" content="860"><meta property="og:image:height" content="1200"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${summary}"><meta name="twitter:image" content="${imageUrl}"><meta http-equiv="refresh" content="0;url=${url}"></head><body><a href="${url}">${title}</a></body></html>`;
}
