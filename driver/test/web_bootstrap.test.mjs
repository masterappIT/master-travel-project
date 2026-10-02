import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../web/flutter_bootstrap.js', import.meta.url), 'utf8')
  .replace('{{flutter_js}}', '')
  .replace('{{flutter_build_config}}', '');

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
