import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';

function docker(...args) {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function wasmPaths(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${prefix}${entry.name}`;
    return entry.isDirectory()
      ? wasmPaths(join(directory, entry.name), `${relative}/`)
      : entry.name.endsWith('.wasm') ? [relative] : [];
  });
}

test('CanvasKit gzip preserves WASM bytes, MIME, cache and identity fallback', async () => {
  const source = resolve('driver/build/web/canvaskit');
  const paths = wasmPaths(source);
  assert.ok(paths.length > 0, 'Build driver web before running this integration test');
  const fixture = mkdtempSync(join(tmpdir(), 'driver-wasm-gzip-'));
  const image = `driver-wasm-gzip-test:${process.pid}`;
  let container;
  try {
    cpSync(source, join(fixture, 'canvaskit'), { recursive: true });
    cpSync(join(source, paths[0]), join(fixture, 'outside.wasm'));
    writeFileSync(join(fixture, 'index.html'), '<!doctype html><title>WASM test</title>');
    docker('build', '--build-context', `static=${fixture}`, '-f', 'deploy/frontend/Dockerfile', '-t', image, '.');
    container = docker('run', '-d', '-p', '127.0.0.1::8080', '-e', 'API_ORIGIN=http://127.0.0.1:8080', image);
    const address = docker('port', container, '8080/tcp').split('\n')[0];
    const base = `http://${address}`;
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { ready = (await fetch(`${base}/healthz`)).ok; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Container must become responsive');
    docker('exec', container, 'nginx', '-t');
    for (const path of paths) {
      const url = `${base}/canvaskit/${path}`;
      const identity = await fetch(url, { headers: { 'Accept-Encoding': 'identity' } });
      const gzip = await fetch(url, { headers: { 'Accept-Encoding': 'gzip' } });
      assert.equal(identity.status, 200);
      assert.equal(gzip.status, 200);
      assert.equal(identity.headers.get('content-encoding'), null);
      assert.equal(gzip.headers.get('content-encoding'), 'gzip');
      assert.equal(gzip.headers.get('content-type'), 'application/wasm');
      assert.match(gzip.headers.get('vary'), /Accept-Encoding/i);
      assert.equal(gzip.headers.get('cache-control'), identity.headers.get('cache-control'));
      assert.match(gzip.headers.get('cache-control'), /no-cache, must-revalidate/);
      const original = Buffer.from(await identity.arrayBuffer());
      assert.deepEqual(original, readFileSync(join(source, path)));
      assert.deepEqual(Buffer.from(await gzip.arrayBuffer()), original);
      const raw = spawnSync('curl', ['--fail', '--silent', '-H', 'Accept-Encoding: gzip', url], { maxBuffer: 32 * 1024 * 1024 });
      assert.equal(raw.status, 0);
      assert.deepEqual(gunzipSync(raw.stdout), original);
      assert.ok(raw.stdout.length < original.length);
      console.log(`${path}: ${original.length} -> ${raw.stdout.length} bytes`);
    }
    for (const encoding of ['identity', 'gzip;q=0', '']) {
      const response = await fetch(`${base}/canvaskit/${paths[0]}`, { headers: { 'Accept-Encoding': encoding } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-encoding'), null);
    }
    const outside = await fetch(`${base}/outside.wasm`, { headers: { 'Accept-Encoding': 'gzip' } });
    assert.equal(outside.status, 200);
    assert.equal(outside.headers.get('content-encoding'), null);
    assert.equal((await fetch(`${base}/canvaskit/missing.wasm`)).status, 404);
    docker('exec', container, 'rm', `/usr/share/nginx/html/canvaskit/${paths[0]}.gz`);
    const fallback = await fetch(`${base}/canvaskit/${paths[0]}`, { headers: { 'Accept-Encoding': 'gzip' } });
    assert.equal(fallback.status, 200);
    assert.equal(fallback.headers.get('content-encoding'), null);
  } finally {
    if (container) docker('rm', '-f', container);
    spawnSync('docker', ['image', 'rm', image], { encoding: 'utf8' });
    rmSync(fixture, { recursive: true, force: true });
  }
});
