import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { CommandResponse, CommandStatus } from '../commands';
import { ITaskContext } from '../context';
import { exportOutputProperties, exportOutputPropertiesIfSuccessful } from '../outputProperties';

type OutputPropertiesTestContext = Pick<
  ITaskContext,
  'command' | 'arguments' | 'baseDirectory' | 'configFile' | 'exportOutputProperties' | 'setVariable'
>;

class TestLogger {
  public warnings: string[] = [];
  public debugMessages: string[] = [];

  command(): void {}
  error(): void {}
  warning(message: string): void {
    this.warnings.push(message);
  }
  debug(message: string): void {
    this.debugMessages.push(message);
  }
}

function createContext(overrides: Partial<OutputPropertiesTestContext> = {}): OutputPropertiesTestContext {
  return {
    command: 'release',
    arguments: '',
    baseDirectory: '',
    configFile: '',
    exportOutputProperties: false,
    setVariable: () => {},
    ...overrides,
  };
}

describe('JReleaser output properties', () => {
  let previousBaseDirectory: string | undefined;

  beforeEach(() => {
    previousBaseDirectory = process.env['JRELEASER_BASEDIR'];
    delete process.env['JRELEASER_BASEDIR'];
  });

  afterEach(() => {
    if (previousBaseDirectory === undefined) {
      delete process.env['JRELEASER_BASEDIR'];
    } else {
      process.env['JRELEASER_BASEDIR'] = previousBaseDirectory;
    }
  });

  it('exports output properties as normalized Azure output variables', () => {
    const baseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-output-'));
    const outputDirectory = path.join(baseDirectory, 'out', 'jreleaser');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(outputDirectory, 'output.properties'),
      [
        'project.version=1.2.3',
        'tag.name=v1.2.3',
        'timestamp=2026-05-21T12:00:00Z',
        'release.name=Release Candidate',
        'artifact.path=/tmp/jreleaser/app.zip',
        'github.token=should-not-export',
      ].join('\n'),
    );

    const variables: Array<{ name: string; value: string; secret?: boolean; isOutput?: boolean }> = [];
    const logger = new TestLogger();
    const ctx = createContext({
      baseDirectory,
      exportOutputProperties: true,
      setVariable: (name: string, value: string, secret?: boolean, isOutput?: boolean) => {
        variables.push({ name, value, secret, isOutput });
      },
    });

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, [
      { name: 'JRELEASER_PROJECT_VERSION', value: '1.2.3', secret: false, isOutput: true },
      { name: 'JRELEASER_TAG_NAME', value: 'v1.2.3', secret: false, isOutput: true },
      { name: 'JRELEASER_TIMESTAMP', value: '2026-05-21T12:00:00Z', secret: false, isOutput: true },
      { name: 'JRELEASER_RELEASE_NAME', value: 'Release Candidate', secret: false, isOutput: true },
      { name: 'JRELEASER_ARTIFACT_PATH', value: '/tmp/jreleaser/app.zip', secret: false, isOutput: true },
    ]);
    assert.equal(
      logger.warnings.some(message => message.includes('github.token')),
      true,
    );
    assert.equal(
      logger.debugMessages.some(message => message.includes('1.2.3')),
      false,
    );
  });

  it('exports output properties after successful command response', () => {
    const baseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-task-output-'));
    const outputDirectory = path.join(baseDirectory, 'out', 'jreleaser');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(path.join(outputDirectory, 'output.properties'), 'project.version=1.2.3\n');
    const variables: Array<{ name: string; value: string; secret?: boolean; isOutput?: boolean }> = [];
    const logger = new TestLogger();
    const ctx = createContext({
      baseDirectory,
      exportOutputProperties: true,
      setVariable: (name: string, value: string, secret?: boolean, isOutput?: boolean) => {
        variables.push({ name, value, secret, isOutput });
      },
    });

    exportOutputPropertiesIfSuccessful(new CommandResponse(CommandStatus.Success, 'test command'), ctx, logger);

    assert.deepEqual(variables, [{ name: 'JRELEASER_PROJECT_VERSION', value: '1.2.3', secret: false, isOutput: true }]);
  });

  it('uses the config file directory when base directory is not supplied', () => {
    const configDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-config-output-'));
    const outputDirectory = path.join(configDirectory, 'out', 'jreleaser');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(path.join(outputDirectory, 'output.properties'), 'project.version=1.2.3\n');
    const variables: Array<{ name: string; value: string; secret?: boolean; isOutput?: boolean }> = [];
    const logger = new TestLogger();
    const ctx = createContext({
      configFile: path.join(configDirectory, 'jreleaser.yml'),
      exportOutputProperties: true,
      setVariable: (name: string, value: string, secret?: boolean, isOutput?: boolean) => {
        variables.push({ name, value, secret, isOutput });
      },
    });

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, [
      { name: 'JRELEASER_PROJECT_VERSION', value: '1.2.3', secret: false, isOutput: true },
    ]);
  });

  it('skips duplicate output variable names after normalization', () => {
    const baseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-duplicate-output-'));
    const outputDirectory = path.join(baseDirectory, 'out', 'jreleaser');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(path.join(outputDirectory, 'output.properties'), ['foo.bar=first', 'foo-bar=second'].join('\n'));
    const variables: Array<{ name: string; value: string; secret?: boolean; isOutput?: boolean }> = [];
    const logger = new TestLogger();
    const ctx = createContext({
      baseDirectory,
      exportOutputProperties: true,
      setVariable: (name: string, value: string, secret?: boolean, isOutput?: boolean) => {
        variables.push({ name, value, secret, isOutput });
      },
    });

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, [{ name: 'JRELEASER_FOO_BAR', value: 'first', secret: false, isOutput: true }]);
    assert.equal(
      logger.warnings.some(message => message.includes('foo-bar') && message.includes('JRELEASER_FOO_BAR')),
      true,
    );
  });

  it('does not export output properties after failed command response', () => {
    const baseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-task-failed-output-'));
    const outputDirectory = path.join(baseDirectory, 'out', 'jreleaser');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(path.join(outputDirectory, 'output.properties'), 'project.version=1.2.3\n');
    const variables: Array<{ name: string; value: string }> = [];
    const logger = new TestLogger();
    const ctx = createContext({
      baseDirectory,
      exportOutputProperties: true,
      setVariable: (name: string, value: string) => {
        variables.push({ name, value });
      },
    });

    exportOutputPropertiesIfSuccessful(new CommandResponse(CommandStatus.Failed, 'test command'), ctx, logger);

    assert.deepEqual(variables, []);
  });

  it('does not export output properties for custom command', () => {
    const baseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-custom-output-'));
    const outputDirectory = path.join(baseDirectory, 'out', 'jreleaser');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(path.join(outputDirectory, 'output.properties'), 'project.version=1.2.3\n');
    const variables: Array<{ name: string; value: string }> = [];
    const logger = new TestLogger();
    const ctx = createContext({
      command: 'custom',
      baseDirectory,
      exportOutputProperties: true,
      setVariable: (name: string, value: string) => {
        variables.push({ name, value });
      },
    });

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, []);
    assert.equal(
      logger.warnings.some(message => message.includes('custom command')),
      true,
    );
  });

  it('warns instead of failing when output properties are missing', () => {
    const baseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-output-missing-'));
    const variables: Array<{ name: string; value: string }> = [];
    const logger = new TestLogger();
    const ctx = createContext({
      baseDirectory,
      exportOutputProperties: true,
      setVariable: (name: string, value: string) => {
        variables.push({ name, value });
      },
    });

    exportOutputProperties(ctx, logger);

    assert.deepEqual(variables, []);
    assert.equal(
      logger.warnings.some(message => message.includes('output.properties')),
      true,
    );
  });
});
