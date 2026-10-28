const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

function createInstallerProbe(packageDirectory, source) {
  const modules = path.join(packageDirectory, 'tasks/JReleaserInstaller/node_modules');
  fs.mkdirSync(path.join(modules, 'azure-pipelines-tool-lib'), { recursive: true });
  fs.mkdirSync(path.join(modules, 'azure-pipelines-task-lib'));
  fs.writeFileSync(path.join(modules, 'azure-pipelines-tool-lib/package.json'), '{}');
  fs.writeFileSync(path.join(modules, 'azure-pipelines-tool-lib/tool.js'), '');
  fs.writeFileSync(path.join(modules, 'azure-pipelines-task-lib/task.js'), source);
}

for (const hostOS of ['Windows_NT', undefined]) {
  test(`preserves ${hostOS === undefined ? 'an absent' : hostOS} OS environment variable in child processes`, t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-smoke-env-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const packageDirectory = path.join(root, 'package');
    const output = path.join(root, 'output');
    const environmentPath = path.join(root, 'child-env.json');
    createInstallerProbe(
      packageDirectory,
      `
      require('node:fs').writeFileSync(${JSON.stringify(environmentPath)}, JSON.stringify({ OS: process.env.OS }));
      throw new Error('environment probe completed');
    `,
    );
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.toUpperCase() === 'OS') delete env[key];
    if (hostOS !== undefined) env.OS = hostOS;
    const result = spawnSync(
      process.execPath,
      [path.resolve(__dirname, '../smoke-test-package.cjs'), packageDirectory, output],
      { env, encoding: 'utf8', timeout: 10000 },
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.match(fs.readFileSync(path.join(output, 'input.log'), 'utf8'), /environment probe completed/);
    assert.deepEqual(JSON.parse(fs.readFileSync(environmentPath, 'utf8')), hostOS === undefined ? {} : { OS: hostOS });
  });
}

for (const failure of ['missing-package', 'child-error']) {
  test(`removes stale success and temporary files after ${failure}`, t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-smoke-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const output = path.join(root, 'output');
    const candidate = path.join(root, 'package');
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'summary.json'), '{"previousRun":"succeeded"}');
    fs.writeFileSync(path.join(output, 'keep.txt'), 'unrelated output');

    if (failure === 'child-error') {
      const modules = path.join(candidate, 'tasks/JReleaserInstaller/node_modules');
      fs.mkdirSync(path.join(modules, 'azure-pipelines-tool-lib'), { recursive: true });
      fs.mkdirSync(path.join(modules, 'azure-pipelines-task-lib'));
      fs.writeFileSync(path.join(modules, 'azure-pipelines-tool-lib/package.json'), '{}');
      fs.writeFileSync(path.join(modules, 'azure-pipelines-tool-lib/tool.js'), '');
      fs.writeFileSync(
        path.join(modules, 'azure-pipelines-task-lib/task.js'),
        `
        require('node:fs').writeFileSync(
          require('node:path').join(process.env.AGENT_TOOLSDIRECTORY, 'partial-download'), 'partial data');
        throw new Error('injected child failure');
      `,
      );
    }

    const result = spawnSync(
      process.execPath,
      [path.resolve(__dirname, '../smoke-test-package.cjs'), candidate, output],
      { encoding: 'utf8', timeout: 10000 },
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(path.join(output, 'summary.json')), false);
    assert.deepEqual(
      fs.readdirSync(output).filter(name => name.startsWith('runtime-')),
      [],
    );
    assert.equal(fs.readFileSync(path.join(output, 'keep.txt'), 'utf8'), 'unrelated output');
    if (failure === 'child-error') {
      assert.match(fs.readFileSync(path.join(output, 'input.log'), 'utf8'), /injected child failure/);
    }
  });
}
