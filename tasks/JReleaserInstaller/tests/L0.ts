import * as path from 'path';
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('JReleaserInstaller L0 Suite', () => {
  it('should install JReleaser successfully', { timeout: 10000 }, async () => {
    let tp = path.join(__dirname, 'L0InstallJReleaserSuccess.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true);
  });
});
