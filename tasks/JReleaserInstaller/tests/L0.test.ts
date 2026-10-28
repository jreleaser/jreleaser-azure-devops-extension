import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';

describe('JReleaserInstaller L0 Suite', () => {
  it('verifies installation before publishing the bin directory', t => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-install-'));
    t.after(() => fs.rmSync(tempDirectory, { recursive: true, force: true }));
    const stdout = execFileSync(process.execPath, [path.join(__dirname, 'fixtures/L0InstallJReleaserSuccess.js')], {
      env: { ...process.env, AGENT_TOOLSDIRECTORY: tempDirectory, AGENT_TEMPDIRECTORY: tempDirectory },
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.match(stdout, /^JRELEASER_INSTALL_VERIFIED$/m);
    assert.doesNotMatch(stdout, /##vso\[task\.complete result=Failed[;\]]/);
  });
});
