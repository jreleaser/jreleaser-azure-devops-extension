const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

module.exports = function runSmoke(packageDirectory, output, { env = process.env, timeout = 30000 } = {}) {
  const result = spawnSync(
    process.execPath,
    [path.resolve(__dirname, '../smoke-test-package.cjs'), packageDirectory, output],
    { env, encoding: 'utf8', timeout },
  );
  assert.ifError(result.error);
  return result;
};
