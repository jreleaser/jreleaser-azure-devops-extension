const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const repo = path.resolve(__dirname, '../..');
const windows = process.platform === 'win32';
const launcher = windows ? 'jreleaser.cmd' : 'jreleaser';

function fixture(t, missingStage, executable = true, faultyInstaller = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-path-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const candidate = path.join(root, 'package');
  const calls = path.join(root, 'calls.txt');
  fs.writeFileSync(calls, '');
  const program = label =>
    windows
      ? `@echo off\r\necho ${label}>>"${calls}"\r\nif "%~1"=="--invalid-smoke-test-option" exit /b 2\r\necho jreleaser 1.26.0\r\n`
      : `#!${process.execPath}\nrequire('node:fs').appendFileSync(${JSON.stringify(calls)}, ${JSON.stringify(
          label + '\n',
        )});
       if (process.argv.includes('--invalid-smoke-test-option')) process.exit(2);
       console.log('jreleaser 1.26.0');\n`;
  const host = path.join(root, 'host-bin');
  fs.mkdirSync(host);
  fs.writeFileSync(path.join(host, launcher), program('host'), { mode: 0o755 });

  for (const task of ['JReleaserInstaller', 'JReleaserTask']) {
    const source = path.join(repo, 'tasks', task);
    const target = path.join(candidate, 'tasks', task);
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(path.join(source, 'dist'), path.join(target, 'dist'), { recursive: true });
    fs.copyFileSync(path.join(source, 'package.json'), path.join(target, 'package.json'));
    fs.symlinkSync(path.join(source, 'node_modules'), path.join(target, 'node_modules'), 'junction');
  }

  const dist = path.join(candidate, 'tasks/JReleaserInstaller/dist');
  // Only transport/extraction are fixtures. Installer, cache, SDK resolution,
  // and Invoker are the actual built code, with an executable on the host PATH.
  fs.writeFileSync(
    path.join(dist, 'utils.js'),
    `
    const fs = require('node:fs'), path = require('node:path');
    exports.getJReleaserRelease = async version => ({ version, platform: 'fixture', name: 'fixture-release' });
    exports.downloadJReleaserRelease = async () => {
      const file = path.join(process.env.AGENT_TEMPDIRECTORY, 'archive');
      fs.writeFileSync(file, 'archive fixture'); return file;
    };
    exports.verifyJReleaserReleaseChecksum = async () => console.log('Verified JReleaser release checksum');
    exports.unzipJReleaserRelease = async () => {
      const temp = process.env.AGENT_TEMPDIRECTORY;
      const marker = path.join(temp, 'extracted');
      const stage = fs.existsSync(marker) ? 'cache' : 'install';
      fs.writeFileSync(marker, '');
      const extracted = fs.mkdtempSync(path.join(temp, 'extract-'));
      const bin = path.join(extracted, 'fixture-release', 'bin');
      fs.mkdirSync(bin, { recursive: true });
      if (stage !== ${JSON.stringify(missingStage)}) {
        fs.writeFileSync(path.join(bin, ${JSON.stringify(launcher)}), ${JSON.stringify(program('installed'))},
          { mode: ${executable ? '0o755' : '0o644'} });
      }
      return extracted;
    };
  `,
  );
  if (faultyInstaller) {
    // Reintroduce the reviewed bug only in this fixture: validation uses PATH.
    fs.renameSync(path.join(dist, 'installer.js'), path.join(dist, 'actual-installer.js'));
    fs.writeFileSync(
      path.join(dist, 'installer.js'),
      `
      const task = require('azure-pipelines-task-lib/task');
      const which = task.which;
      task.which = (name, check) => which(require('node:path').basename(name) === 'jreleaser' ? 'jreleaser' : name, check);
      require('./actual-installer');
    `,
    );
  }
  const output = path.join(root, 'output');
  const env = { ...process.env };
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path');
  env[pathKey] = host + path.delimiter + env[pathKey];
  const result = spawnSync(process.execPath, [path.join(repo, 'scripts/smoke-test-package.cjs'), candidate, output], {
    env,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.ifError(result.error);
  assert.deepEqual(
    fs.readdirSync(output).filter(name => name.startsWith('runtime-')),
    [],
  );
  return { result, output, calls: fs.readFileSync(calls, 'utf8') };
}

for (const stage of ['install', 'cache']) {
  test(`rejects a missing ${stage} executable instead of using the host PATH`, t => {
    const { result, output, calls } = fixture(t, stage);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(calls, /host/);
    assert.match(fs.readFileSync(path.join(output, stage + '.log'), 'utf8'), /task\.complete result=Failed/);
    assert.doesNotMatch(fs.readFileSync(path.join(output, stage + '.log'), 'utf8'), /##vso\[task.prependpath\]/);
    assert.equal(fs.existsSync(path.join(output, 'summary.json')), false);
  });
}

test('rejects a non-executable launcher instead of using the host PATH', { skip: windows }, t => {
  const { result, calls } = fixture(t, null, false);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(calls, /host/);
});

test('detects PATH substitution even when installer validation regresses', t => {
  const { result, output, calls } = fixture(t, 'install', true, true);
  assert.notEqual(result.status, 0);
  assert.match(calls, /host/);
  assert.ok(fs.existsSync(path.join(output, 'install-path.log')));
  assert.equal(fs.existsSync(path.join(output, 'summary.json')), false);
});

test('uses the installed executable for cold install, cache and Invoker', t => {
  const { result, output, calls } = fixture(t, null);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(calls, /host/);
  const summary = JSON.parse(fs.readFileSync(path.join(output, 'summary.json')));
  assert.deepEqual(
    summary.checks.map(check => check.name),
    ['input', 'install', 'install-path', 'cache', 'cache-path', 'version', 'config', 'invalid-option'],
  );
});
