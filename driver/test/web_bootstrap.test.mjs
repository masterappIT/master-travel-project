import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../web/flutter_bootstrap.js', import.meta.url), 'utf8')
  .replace('{{flutter_js}}', '')
  .replace('{{flutter_build_config}}', '');

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

test('startup resources do not block Flutter on Apple CDN or preload all fonts', () => {
  assert.doesNotMatch(html, /<script\s+src="https:\/\/appleid\.cdn-apple\.com\//);
  assert.match(html, /window\.driverAppleSignIn = async function/);
  assert.match(html, /await loadDriverAppleSdk\(\)/);
  assert.doesNotMatch(html, /<link[^>]+rel="preload"[^>]+NotoSansTC-/);
  assert.match(html, /<script src="flutter_bootstrap\.js"><\/script>/);
});

test('Apple SDK loads on demand, shares a request, and retries after failure', async () => {
  const appleScript = html.match(/<script>\s*(let driverAppleSdkLoad;[\s\S]*?)<\/script>/)?.[1];
  assert.ok(appleScript);
  const appended = [];
  const window = {};
  const document = {
    createElement: () => ({ remove() { this.removed = true; } }),
    head: { appendChild: script => appended.push(script) },
  };
  vm.runInNewContext(appleScript, { window, document, Promise, Error });
  assert.equal(appended.length, 0);

  const first = window.driverAppleSignIn('client', 'https://example.com/callback');
  const second = window.driverAppleSignIn('client', 'https://example.com/callback');
  assert.equal(appended.length, 1);
  appended[0].onerror();
  await assert.rejects(first, /Apple Sign In SDK is unavailable/);
  await assert.rejects(second, /Apple Sign In SDK is unavailable/);
  assert.equal(appended[0].removed, true);

  const authCalls = [];
  const third = window.driverAppleSignIn('client', 'https://example.com/callback');
  assert.equal(appended.length, 2);
  window.AppleID = { auth: {
    init: options => authCalls.push(options),
    signIn: async () => ({ authorization: { id_token: 'test-token' } }),
  } };
  appended[1].onload();
  assert.equal(await third, 'test-token');
  assert.equal(authCalls[0].clientId, 'client');
  assert.equal(authCalls[0].redirectURI, 'https://example.com/callback');
});

for (const shouldReload of [false, true]) {
  test(`cache migration reload=${shouldReload}`, async () => {
    const loads = [];
    let reloads = 0;
    let finishMigration;
    const migration = new Promise(resolve => { finishMigration = resolve; });
    vm.runInNewContext(source, {
      window: {
        __driverCacheMigration: migration,
        location: { reload: () => { reloads++; } },
      },
      _flutter: { loader: { load: options => loads.push(options) } },
    });
    assert.equal(loads.length, 0);
    assert.equal(reloads, 0);
    finishMigration(shouldReload);
    await migration;
    await Promise.resolve();
    assert.equal(reloads, shouldReload ? 1 : 0);
    assert.equal(loads.length, shouldReload ? 0 : 1);
    if (!shouldReload) {
      assert.equal(loads[0].config.canvasKitBaseUrl, 'canvaskit/');
      assert.deepEqual(Object.keys(loads[0].config), ['canvasKitBaseUrl']);
    }
  });
}
