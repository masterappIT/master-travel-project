import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import test from "node:test";
import { compressSupportImage, SupportMediaStorage } from "./support-media";

test("compresses supported images into oriented display and thumbnail WebP variants", async () => {
  const input = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: { r: 20, g: 80, b: 120 } } }).jpeg().toBuffer();
  const variants = await compressSupportImage(input);
  assert.equal(variants.display.mimeType, "image/webp");
  assert.equal(variants.display.width, 1600);
  assert.equal(variants.display.height, 800);
  assert.equal(variants.thumbnail.width, 320);
  assert.equal(variants.thumbnail.height, 160);
  assert.notEqual(variants.display.checksum, variants.thumbnail.checksum);
});

test("rejects unsupported image formats and prevents storage traversal", async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
  await assert.rejects(compressSupportImage(svg), /Only JPEG, PNG, and WebP/);
  const root = await mkdtemp(join(tmpdir(), "support-media-test-"));
  const storage = new SupportMediaStorage(root);
  await assert.rejects(storage.put("../outside.webp", Buffer.from("x")), /Invalid support media storage key/);
  await rm(root, { recursive: true, force: true });
});
