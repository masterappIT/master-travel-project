import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { AVATAR_SIZE, AvatarImageError, normalizeAvatarImage } from "./avatar-image";

const picture = (width: number, height: number, format: "jpeg" | "png" | "webp" | "gif" | "tiff" = "jpeg") =>
  sharp({ create: { width, height, channels: 3, background: { r: 40, g: 92, b: 252 } } })[format]().toBuffer();

test("stores a square 320 px WebP whatever the source shape or format", async () => {
  for (const [width, height, format] of [[1200, 800, "jpeg"], [600, 1400, "png"], [90, 90, "webp"], [400, 300, "gif"]] as const) {
    const result = await normalizeAvatarImage(await picture(width, height, format));
    const metadata = await sharp(result.data).metadata();
    assert.equal(result.mimeType, "image/webp");
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, AVATAR_SIZE);
    assert.equal(metadata.height, AVATAR_SIZE);
  }
});

test("a large photo is stored far smaller than it was uploaded", async () => {
  const noise = Buffer.alloc(3000 * 2000 * 3);
  for (let index = 0; index < noise.length; index += 1) noise[index] = (index * 2654435761) >>> 24;
  const source = await sharp(noise, { raw: { width: 3000, height: 2000, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  const result = await normalizeAvatarImage(source);
  assert.ok(source.length > 1024 * 1024, "the fixture should exceed the old 1 MB upload limit");
  assert.ok(result.data.length < 200 * 1024);
});

test("applies the camera orientation before cropping", async () => {
  // Left half red, right half blue, flagged as rotated 90 degrees: upright it is red on top, blue below.
  const left = await sharp({ create: { width: 200, height: 400, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
  const source = await sharp({ create: { width: 400, height: 400, channels: 3, background: { r: 0, g: 0, b: 255 } } })
    .composite([{ input: left, left: 0, top: 0 }]).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const { data } = await normalizeAvatarImage(source);
  const { data: pixels, info } = await sharp(data).raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => [...pixels.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
  const [topRed, , topBlue] = at(160, 40);
  const [bottomRed, , bottomBlue] = at(160, 280);
  assert.ok(topRed > 200 && topBlue < 60, "top should be red once upright");
  assert.ok(bottomBlue > 200 && bottomRed < 60, "bottom should be blue once upright");
});

test("rejects empty files, non-images and unsupported formats with a readable reason", async () => {
  await assert.rejects(normalizeAvatarImage(Buffer.alloc(0)), AvatarImageError);
  await assert.rejects(normalizeAvatarImage(Buffer.from("<html>not an image</html>")), AvatarImageError);
  await assert.rejects(normalizeAvatarImage(await picture(50, 50, "tiff")), /只支援/);
});
