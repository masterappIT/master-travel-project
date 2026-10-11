import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { test } from 'node:test';

function docker(...args) {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function rawGet(url, encoding) {
  const result = spawnSync('curl', [
    '--fail', '--silent', '--show-error', '-H', `Accept-Encoding: ${encoding}`, url,
  ], { maxBuffer: 20 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr.toString());
  return result.stdout;
}

test('Driver TTF is byte-identical through Brotli, gzip and original fallback', async () => {
  const source = resolve('driver/assets/fonts/NotoSansTC-Variable.ttf');
  const fixture = mkdtempSync(join(tmpdir(), 'driver-font-brotli-'));
  const image = `driver-font-brotli-test:${process.pid}`;
  let container;
  try {
    const fonts = join(fixture, 'assets/assets/fonts');
    mkdirSync(fonts, { recursive: true });
    cpSync(source, join(fonts, 'NotoSansTC-Variable.ttf'));
    writeFileSync(join(fixture, 'index.html'), '<!doctype html><title>Driver font test</title>');
    writeFileSync(join(fixture, 'unrelated.ttf'), 'untouched');
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

    const url = `${base}/assets/assets/fonts/NotoSansTC-Variable.ttf`;
    const original = readFileSync(source);
    for (const [accept, expected, decode] of [
      ['br, gzip', 'br', brotliDecompressSync],
      ['gzip', 'gzip', gunzipSync],
      ['identity', null, (bytes) => bytes],
      ['br;q=0, gzip', 'gzip', gunzipSync],
    ]) {
      const response = await fetch(url, { headers: { 'Accept-Encoding': accept } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-encoding'), expected);
      assert.match(response.headers.get('cache-control'), /no-cache, must-revalidate/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), original);
      const transferred = rawGet(url, accept);
      assert.deepEqual(decode(transferred), original);
      if (expected) assert.ok(transferred.length < original.length);
    }

    const fontPath = '/usr/share/nginx/html/assets/assets/fonts/NotoSansTC-Variable.ttf';
    docker('exec', container, 'rm', `${fontPath}.br`);
    const gzipFallback = await fetch(url, { headers: { 'Accept-Encoding': 'br, gzip' } });
    assert.equal(gzipFallback.status, 200);
    assert.equal(gzipFallback.headers.get('content-encoding'), 'gzip');
    assert.deepEqual(Buffer.from(await gzipFallback.arrayBuffer()), original);
    docker('exec', container, 'rm', `${fontPath}.gz`);
    const originalFallback = await fetch(url, { headers: { 'Accept-Encoding': 'br, gzip' } });
    assert.equal(originalFallback.status, 200);
    assert.equal(originalFallback.headers.get('content-encoding'), null);
    assert.deepEqual(Buffer.from(await originalFallback.arrayBuffer()), original);

    const missing = await fetch(`${base}/assets/assets/fonts/NotoSansTC-Missing.ttf`, {
      headers: { 'Accept-Encoding': 'br, gzip' },
    });
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('content-encoding'), null);
    const unrelated = await fetch(`${base}/unrelated.ttf`, { headers: { 'Accept-Encoding': 'br' } });
    assert.equal(unrelated.status, 200);
    assert.equal(unrelated.headers.get('content-encoding'), null);
    assert.equal(await unrelated.text(), 'untouched');
  } finally {
    if (container) docker('rm', '-f', container);
    spawnSync('docker', ['image', 'rm', image], { encoding: 'utf8' });
    rmSync(fixture, { recursive: true, force: true });
  }
});
