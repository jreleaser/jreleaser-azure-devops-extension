import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import { ITaskContext } from '../context';
import { JReleaserCustom } from '../commands/custom';

function createContext(argumentsValue: string): ITaskContext {
  return {
    command: 'custom',
    baseDirectory: '',
    logLevel: '',
    arguments: argumentsValue,
    dryRun: false,
    configFile: '',
    strict: false,
    gitRootSearch: false,
    properties: '',
    selectCurrentPlatform: false,
    selectPlatform: '',
    rejectPlatform: '',
    distribution: '',
    packager: '',
    excludeDistribution: '',
    excludePackager: '',
    initFormat: '',
    initOverwrite: false,
    configType: '',
    configFull: false,
    templateEvalTargetDirectory: '',
    templateEvalOverwrite: false,
    templateInputType: '',
    templateEvalInput: '',
    templateEvalType: '',
  };
}

describe('JReleaserTask L0 Suite', () => {
  it('Does a basic hello world test', () => {
    assert.ok(true);
  });

  it('parses simple custom arguments', () => {
    const command = new JReleaserCustom({} as ToolRunner);

    command.initialize(createContext('--debug --dry-run'));

    assert.deepEqual(command.options, ['--debug', '--dry-run']);
  });

  it('preserves spaces inside quoted custom argument values', () => {
    const command = new JReleaserCustom({} as ToolRunner);

    command.initialize(createContext('--set-property project.name="My App"'));

    assert.deepEqual(command.options, ['--set-property', 'project.name=My App']);
  });

  it('preserves spaces inside quoted custom argument paths', () => {
    const command = new JReleaserCustom({} as ToolRunner);

    command.initialize(createContext('--config-file "/tmp/My Project/jreleaser.yml"'));

    assert.deepEqual(command.options, ['--config-file', '/tmp/My Project/jreleaser.yml']);
  });
});
