import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import { CommandResponse, CommandStatus } from '../commands';
import { exportOutputProperties, exportOutputPropertiesIfSuccessful } from '../outputProperties';

function createFixture(t: TestContext, contents: string | null) {
  const baseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-output-'));
  const previousBaseDirectory = process.env.JRELEASER_BASEDIR;
  t.after(() => {
    if (previousBaseDirectory === undefined) delete process.env.JRELEASER_BASEDIR;
    else process.env.JRELEASER_BASEDIR = previousBaseDirectory;
    fs.rmSync(baseDirectory, { recursive: true, force: true });
  });
  delete process.env.JRELEASER_BASEDIR;
  if (contents !== null) {
    const outputDirectory = path.join(baseDirectory, 'out', 'jreleaser');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(path.join(outputDirectory, 'output.properties'), contents);
  }
  const variables: Array<{ name: string; value: string; secret?: boolean; isOutput?: boolean }> = [];
  const warnings: string[] = [];
  const debugMessages: string[] = [];
  const ctx = {
    command: 'release',
    arguments: '',
    baseDirectory,
    configFile: '',
    exportOutputProperties: true,
    setVariable: (name: string, value: string, secret?: boolean, isOutput?: boolean) => {
      variables.push({ name, value, secret, isOutput });
    },
  };
  const logger = {
    command() {},
    error() {},
    warning: (message: string) => warnings.push(message),
    debug: (message: string) => debugMessages.push(message),
  };
  return { ctx, logger, variables, warnings, debugMessages };
}

describe('JReleaser output properties', () => {
  it('exports normalized Azure output variables after a successful command', t => {
    const { ctx, logger, variables, warnings, debugMessages } = createFixture(
      t,
      [
        'project.version=1.2.3',
        'tag.name=v1.2.3',
        'timestamp=2026-05-21T12:00:00Z',
        'release.name=Release Candidate',
        'artifact.path=/tmp/jreleaser/app.zip',
        'github.token=should-not-export',
      ].join('\n'),
    );

    exportOutputPropertiesIfSuccessful(new CommandResponse(CommandStatus.Success, 'test command'), ctx, logger);

    assert.deepEqual(variables, [
      { name: 'JRELEASER_PROJECT_VERSION', value: '1.2.3', secret: false, isOutput: true },
      { name: 'JRELEASER_TAG_NAME', value: 'v1.2.3', secret: false, isOutput: true },
      { name: 'JRELEASER_TIMESTAMP', value: '2026-05-21T12:00:00Z', secret: false, isOutput: true },
      { name: 'JRELEASER_RELEASE_NAME', value: 'Release Candidate', secret: false, isOutput: true },
      { name: 'JRELEASER_ARTIFACT_PATH', value: '/tmp/jreleaser/app.zip', secret: false, isOutput: true },
    ]);
    assert.equal(
      warnings.some(message => message.includes('github.token')),
      true,
    );
    assert.equal(
      debugMessages.some(message => message.includes('1.2.3')),
      false,
    );
  });

  it('uses the config file directory when base directory is not supplied', t => {
    const { ctx, logger, variables } = createFixture(t, 'project.version=1.2.3\n');
    ctx.configFile = path.join(ctx.baseDirectory, 'jreleaser.yml');
    ctx.baseDirectory = '';

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, [{ name: 'JRELEASER_PROJECT_VERSION', value: '1.2.3', secret: false, isOutput: true }]);
  });

  it('skips duplicate output variable names after normalization', t => {
    const { ctx, logger, variables, warnings } = createFixture(t, 'foo.bar=first\nfoo-bar=second');

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, [{ name: 'JRELEASER_FOO_BAR', value: 'first', secret: false, isOutput: true }]);
    assert.equal(
      warnings.some(message => message.includes('foo-bar') && message.includes('JRELEASER_FOO_BAR')),
      true,
    );
  });

  it('does not export output properties after failed command response', t => {
    const { ctx, logger, variables } = createFixture(t, 'project.version=1.2.3\n');

    exportOutputPropertiesIfSuccessful(new CommandResponse(CommandStatus.Failed, 'test command'), ctx, logger);

    assert.deepEqual(variables, []);
  });

  it('does not export output properties for custom command', t => {
    const { ctx, logger, variables, warnings } = createFixture(t, 'project.version=1.2.3\n');
    ctx.command = 'custom';

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, []);
    assert.equal(
      warnings.some(message => message.includes('custom command')),
      true,
    );
  });

  it('warns instead of failing when output properties are missing', t => {
    const { ctx, logger, variables, warnings } = createFixture(t, null);

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, []);
    assert.equal(
      warnings.some(message => message.includes('output.properties')),
      true,
    );
  });
});
