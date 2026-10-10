import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import sharp from "sharp";

export const SUPPORT_MEDIA_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const SUPPORT_MEDIA_MAX_DIMENSION = 8000;
export const SUPPORT_MEDIA_DISPLAY_LONG_EDGE = 1600;
export const SUPPORT_MEDIA_THUMBNAIL_LONG_EDGE = 320;

export type SupportImageVariant = {
  buffer: Buffer;
  mimeType: "image/webp";
  width: number;
  height: number;
  sizeBytes: number;
  checksum: string;
};

export type SupportImageVariants = {
  display: SupportImageVariant;
  thumbnail: SupportImageVariant;
  sourceFormat: string;
  sourceWidth: number;
  sourceHeight: number;
};

const supportedFormats = new Set(["jpeg", "png", "webp"]);

export async function compressSupportImage(input: Buffer): Promise<SupportImageVariants> {
  if (!Buffer.isBuffer(input) || input.length === 0)
    throw new Error("Image file is empty");
  if (input.length > SUPPORT_MEDIA_MAX_INPUT_BYTES)
    throw new Error("Image file exceeds the 10 MB limit");

  const metadata = await sharp(input, { limitInputPixels: SUPPORT_MEDIA_MAX_DIMENSION ** 2 }).metadata();
  if (!metadata.format || !supportedFormats.has(metadata.format))
    throw new Error("Only JPEG, PNG, and WebP images are supported");
  if (!metadata.width || !metadata.height || metadata.width < 1 || metadata.height < 1)
    throw new Error("Image dimensions are invalid");
  if (metadata.width > SUPPORT_MEDIA_MAX_DIMENSION || metadata.height > SUPPORT_MEDIA_MAX_DIMENSION)
    throw new Error("Image dimensions exceed the 8000 px limit");

  const displayBuffer = await sharp(input, { limitInputPixels: SUPPORT_MEDIA_MAX_DIMENSION ** 2 })
    .rotate()
    .resize({ width: SUPPORT_MEDIA_DISPLAY_LONG_EDGE, height: SUPPORT_MEDIA_DISPLAY_LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
  const thumbnailBuffer = await sharp(input, { limitInputPixels: SUPPORT_MEDIA_MAX_DIMENSION ** 2 })
    .rotate()
    .resize({ width: SUPPORT_MEDIA_THUMBNAIL_LONG_EDGE, height: SUPPORT_MEDIA_THUMBNAIL_LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toBuffer();
  const displayMetadata = await sharp(displayBuffer).metadata();
  const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();
  if (!displayMetadata.width || !displayMetadata.height || !thumbnailMetadata.width || !thumbnailMetadata.height)
    throw new Error("Compressed image dimensions are invalid");

  return {
    sourceFormat: metadata.format,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    display: variant(displayBuffer, displayMetadata.width, displayMetadata.height),
    thumbnail: variant(thumbnailBuffer, thumbnailMetadata.width, thumbnailMetadata.height),
  };
}

function variant(buffer: Buffer, width: number, height: number): SupportImageVariant {
  return {
    buffer,
    mimeType: "image/webp",
    width,
    height,
    sizeBytes: buffer.byteLength,
    checksum: createHash("sha256").update(buffer).digest("hex"),
  };
}

export function supportMediaId(): string {
  return `${Date.now().toString(36)}-${randomBytes(12).toString("hex")}`;
}

export function supportMediaKey(conversationId: string, mediaId: string, variantName: "display" | "thumbnail"): string {
  return `support-media/${conversationId}/${mediaId}/${variantName}.webp`;
}

export class SupportMediaStorage {
  readonly root: string;

  constructor(root = process.env.SUPPORT_MEDIA_STORAGE_DIR || join(process.cwd(), ".support-media")) {
    if (process.env.NODE_ENV === "production" && !process.env.SUPPORT_MEDIA_STORAGE_DIR)
      throw new Error("SUPPORT_MEDIA_STORAGE_DIR must be configured before enabling support media in production");
    this.root = isAbsolute(root) ? resolve(root) : resolve(process.cwd(), root);
  }

  private pathFor(key: string): string {
    const normalized = key.replaceAll("\\", "/");
    if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => !part || part === "." || part === ".."))
      throw new Error("Invalid support media storage key");
    const path = resolve(this.root, normalized);
    if (path !== this.root && !path.startsWith(`${this.root}/`))
      throw new Error("Invalid support media storage key");
    return path;
  }

  async put(key: string, buffer: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer, { flag: "wx" });
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
