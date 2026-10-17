#!/usr/bin/env node
// Runs the unpacked VSIX without Azure credentials or publishing anything.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');

const [packageDirectory, outputDirectory, version = '1.26.0'] = process.argv.slice(2);
assert.ok(packageDirectory && outputDirectory, 'Usage: node scripts/smoke-test-package.cjs <unpacked-vsix> <output-directory> [jreleaser-version]');
const root = path.resolve(packageDirectory);
const output = path.resolve(outputDirectory);
fs.mkdirSync(output, { recursive: true });
const summaryPath = path.join(output, 'summary.json');
fs.rmSync(summaryPath, { force: true });
assert.match(version, /^\d+\.\d+\.\d+$/);
const runtime = fs.mkdtempSync(path.join(output, 'runtime-'));
const checks = [];
try {
  for (const dir of ['temp', 'tools', 'home']) fs.mkdirSync(path.join(runtime, dir));
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'windir', 'WINDIR', 'ComSpec', 'COMSPEC', 'PATHEXT', 'SystemDrive']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, {
    HOME: path.join(runtime, 'home'), USERPROFILE: path.join(runtime, 'home'),
    TEMP: path.join(runtime, 'temp'), TMP: path.join(runtime, 'temp'),
    AGENT_TEMPDIRECTORY: path.join(runtime, 'temp'),
    AGENT_TOOLSDIRECTORY: path.join(runtime, 'tools'), AGENT_WORKFOLDER: runtime,
  });
  function run(name, args, inputs = {}, failure = false, cwd = runtime) {
    const result = spawnSync(process.execPath, args, {
      cwd, env: { ...env, ...inputs }, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
    });
    const text = (result.stdout || '') + (result.stderr || '');
    fs.writeFileSync(path.join(output, name + '.log'), text);
    assert.ifError(result.error);
    assert.equal(result.signal, null, text.slice(-2000));
    if (failure) assert.match(text, /##vso\[task\.complete result=Failed[;\]]/);
    else {
      assert.equal(result.status, 0, text.slice(-2000));
      assert.doesNotMatch(text, /##vso\[task\.complete result=Failed[;\]]|##vso\[task\.issue type=error/);
    }
    checks.push({ name, exitCode: result.status, expectedFailure: failure });
    console.log(`${name}: passed`);
    return text;
  }

  const installer = path.join(root, 'tasks/JReleaserInstaller');
  const invoker = path.join(root, 'tasks/JReleaserTask');
  const req = createRequire(path.join(installer, 'package.json'));
  const toolReq = createRequire(req.resolve('azure-pipelines-tool-lib/package.json'));
  assert.equal(req.resolve('azure-pipelines-task-lib/task'), toolReq.resolve('azure-pipelines-task-lib/task'));
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path');
  function installedEnvironment(stage, text) {
    const paths = [...text.matchAll(/^##vso\[task.prependpath\]([^\r\n]+)/gm)];
    assert.equal(paths.length, 1, 'Installer must publish exactly one bin directory');
    const bin = paths[0][1];
    assert.ok(fs.realpathSync(bin).startsWith(fs.realpathSync(runtime) + path.sep),
      'Installed bin directory must belong to this test run');
    const inputs = { [pathKey]: bin + path.delimiter + env[pathKey], INPUT_LOGLEVEL: 'info' };
    const verifyPath = `try {
      const assert = require('node:assert/strict');
      const fs = require('node:fs');
      const path = require('node:path');
      const task = require('azure-pipelines-task-lib/task');
      const bin = process.argv[1];
      const expected = fs.realpathSync(task.which(path.join(bin, 'jreleaser'), true));
      assert.equal(path.dirname(expected), fs.realpathSync(bin));
      assert.equal(fs.realpathSync(task.which('jreleaser', true)), expected);
      console.log('JRELEASER_EXECUTABLE_VERIFIED');
    } catch (error) { console.error(error); process.exitCode = 1; }`;
    assert.match(run(stage + '-path', ['-e', verifyPath, bin], inputs, false, invoker),
      /^JRELEASER_EXECUTABLE_VERIFIED$/m);
    return inputs;
  }
  const probe = `try {
    require('azure-pipelines-tool-lib/tool');
    require('node:assert/strict').equal(require('azure-pipelines-task-lib/task').getInput('version', true), '${version}');
    console.log('JRELEASER_INPUT_VERIFIED');
  } catch (error) { console.error(error); process.exitCode = 1; }`;
  assert.match(run('input', ['-e', probe], { INPUT_VERSION: version }, false, installer), /JRELEASER_INPUT_VERIFIED/);
  const entry = path.join(installer, 'dist/installer.js');
  const installed = run('install', [entry], { INPUT_VERSION: version });
  assert.match(installed, /Verified JReleaser release checksum/);
  assert.ok(installed.includes(`jreleaser ${version}`));
  installedEnvironment('install', installed);
  const cached = run('cache', [entry], { INPUT_VERSION: version });
  assert.match(cached, /was found in the local cache/);
  assert.ok(cached.includes(`jreleaser ${version}`));
  const inputs = installedEnvironment('cache', cached);
  const runner = path.join(invoker, 'dist/jreleaserTask.js');
  const invoked = run('version', [runner], { ...inputs, INPUT_COMMAND: 'custom', INPUT_ARGUMENTS: '--version' });
  assert.ok(invoked.includes(`jreleaser ${version}`));
  assert.match(invoked, /##vso\[task\.complete result=Succeeded/);
  const help = run('config', [runner], { ...inputs, INPUT_COMMAND: 'config', INPUT_ARGUMENTS: '--help' });
  assert.match(help, /##vso\[task\.complete result=Succeeded/);
  run('invalid-option', [runner], { ...inputs, INPUT_COMMAND: 'custom', INPUT_ARGUMENTS: '--invalid-smoke-test-option' }, true);
} finally {
  fs.rmSync(runtime, { recursive: true, force: true });
}
fs.writeFileSync(summaryPath, JSON.stringify({
  platform: process.platform, arch: process.arch, node: process.version, jreleaser: version, checks,
}, null, 2) + '\n');
