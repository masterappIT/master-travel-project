import sharp from "sharp";

export const AVATAR_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const AVATAR_MAX_DIMENSION = 8000;
export const AVATAR_SIZE = 320;

const supportedFormats = new Set(["jpeg", "png", "webp", "gif"]);

export class AvatarImageError extends Error {}

/**
 * Turns an uploaded picture into the stored avatar: upright, centre-cropped to a square, 320 px, WebP.
 * The stored size no longer depends on what the phone produced, and anything that is not a real image is rejected.
 */
export async function normalizeAvatarImage(input: Buffer): Promise<{ data: Buffer; mimeType: "image/webp" }> {
  if (!Buffer.isBuffer(input) || input.length === 0) throw new AvatarImageError("圖片檔案是空的");
  if (input.length > AVATAR_MAX_INPUT_BYTES) throw new AvatarImageError("圖片不可超過 10 MB");
  const options = { limitInputPixels: AVATAR_MAX_DIMENSION ** 2 };
  const metadata = await sharp(input, options).metadata().catch(() => {
    throw new AvatarImageError("無法讀取圖片，請改用 JPG、PNG 或 WebP");
  });
  if (!metadata.format || !supportedFormats.has(metadata.format))
    throw new AvatarImageError("只支援 JPG、PNG、WebP 或 GIF 圖片");
  if (!metadata.width || !metadata.height) throw new AvatarImageError("圖片尺寸無效");
  try {
    const data = await sharp(input, options)
      .rotate()
      .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE, fit: "cover", position: "centre" })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();
    return { data, mimeType: "image/webp" };
  } catch {
    throw new AvatarImageError("圖片處理失敗，請換一張圖片");
  }
}
