import "reflect-metadata";
import assert from "node:assert/strict";
import { request } from "node:http";
import { createHmac } from "node:crypto";
import test from "node:test";
import { Controller, ForbiddenException, Module, Post, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FileInterceptor } from "@nestjs/platform-express";
import { SupportMediaUploadGuard, supportMediaEnabledForEnvironment } from "./support-media-upload-guard";

test("support media is disabled only in production", () => {
  assert.equal(supportMediaEnabledForEnvironment("production"), false);
  assert.equal(supportMediaEnabledForEnvironment("development"), true);
  assert.equal(supportMediaEnabledForEnvironment(undefined), true);
});

test("production media routes reject before metadata access and upload parsing", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSessionSecret = process.env.ADMIN_SESSION_SECRET;
  process.env.NODE_ENV = "production";
  process.env.ADMIN_SESSION_SECRET = "test-only-support-media-session-secret-32";
  try {
    const { AdminSupportMediaController, activeAdminSessions } = await import("./main");
    const session = { sub: "admin-super", role: "SUPER_ADMIN", exp: Date.now() + 60_000, jti: "test-support-media-session" };
    activeAdminSessions.set(session.jti, session.exp);
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    const signature = createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("base64url");
    const authorization = ["Bearer ", payload, ".", signature].join("");
    @Module({ controllers: [AdminSupportMediaController] })
    class ProductionMediaTestModule {}
    const app = await NestFactory.create(ProductionMediaTestModule, { logger: false, bodyParser: false });
    try {
      await app.listen(0, "127.0.0.1");
      const address = app.getHttpServer().address();
      assert.ok(address && typeof address !== "string");
      const port = address.port;

      async function send(path: string, method: string, body?: Buffer, authorization = "******"): Promise<number> {
        return await new Promise((resolve, reject) => {
          const req = request({
            host: "127.0.0.1", port, path, method,
            headers: {
              ...(body ? { "content-type": "multipart/form-data; boundary=boundary", "content-length": body.length } : {}),
              authorization,
            },
          }, (res) => {
            res.resume();
            res.on("end", () => { resolve(res.statusCode ?? 0); req.destroy(); });
            res.on("error", reject);
          });
          req.setTimeout(2000, () => req.destroy(new Error("Server waited for multipart body before responding")));
          req.on("error", reject);
          if (body) req.end(body); else req.flushHeaders();
        });
      }

      const incompleteMultipart = Buffer.from("--boundary\r\n");
      assert.equal(await send("/admin/support/media", "POST"), 401);
      assert.equal(await send("/admin/support/media", "POST", incompleteMultipart), 401);
      assert.equal(await send("/admin/support/media/nonexistent/display", "GET"), 401);
      assert.equal(await send("/admin/support/media/nonexistent", "DELETE"), 401);
      assert.equal(await send("/admin/support/media", "POST", undefined, authorization), 403);
      assert.equal(await send("/admin/support/media", "POST", incompleteMultipart, authorization), 403);
      for (const id of ["existing", "nonexistent"]) {
        assert.equal(await send(`/admin/support/media/${id}/display`, "GET", undefined, authorization), 403);
        assert.equal(await send(`/admin/support/media/${id}`, "DELETE", undefined, authorization), 403);
      }
    } finally {
      activeAdminSessions.delete(session.jti);
      await app.close();
    }
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSessionSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = previousSessionSecret;
  }
});

let storageAvailable = false;

@Controller("media")
class UploadController {
  @Post()
  @UseGuards(new SupportMediaUploadGuard(
    (req) => {
      const role = (req as { headers: { "x-test-role"?: string } }).headers["x-test-role"];
      if (!role) throw new UnauthorizedException();
      if (role !== "OPERATOR") throw new ForbiddenException();
    },
    () => { if (!storageAvailable) throw new ForbiddenException("Support image upload is disabled in production"); },
  ))
  @UseInterceptors(FileInterceptor("file"))
  upload(@UploadedFile() file?: Express.Multer.File) {
    return { size: file?.size ?? 0 };
  }
}

@Module({ controllers: [UploadController] })
class UploadTestModule {}

test("media upload guard rejects before multipart parsing and allows authorized uploads when storage is available", async () => {
  const app = await NestFactory.create(UploadTestModule, { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.ok(address && typeof address !== "string");
    const port = address.port;

    async function send(role: string | undefined, body?: Buffer): Promise<{ status: number; text: string }> {
      return await new Promise((resolve, reject) => {
        const req = request({
          host: "127.0.0.1", port, path: "/media", method: "POST",
          headers: {
            "content-type": "multipart/form-data; boundary=boundary",
            "content-length": body?.length ?? 100_000,
            ...(role ? { "x-test-role": role } : {}),
          },
        }, (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => { resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() }); req.destroy(); });
          res.on("error", reject);
        });
        req.setTimeout(2000, () => req.destroy(new Error("Server waited for multipart body before responding")));
        req.on("error", reject);
        if (body) req.end(body);
        else req.flushHeaders();
      });
    }

    storageAvailable = false;
    assert.equal((await send("OPERATOR")).status, 403);
    assert.equal((await send(undefined)).status, 401);
    storageAvailable = true;
    assert.equal((await send("VIEWER")).status, 403);
    const body = Buffer.from("--boundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.txt\"\r\nContent-Type: text/plain\r\n\r\nhello\r\n--boundary--\r\n");
    const response = await send("OPERATOR", body);
    assert.equal(response.status, 201);
    assert.deepEqual(JSON.parse(response.text), { size: 5 });
  } finally {
    storageAvailable = false;
    await app.close();
  }
});
