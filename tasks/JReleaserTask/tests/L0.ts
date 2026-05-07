import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import type { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import { ITaskContext } from '../context';
import { JReleaserCustom } from '../commands/custom';
import { JReleaserRelease } from '../commands/release';
import { JReleaserTemplateGenerate } from '../commands/templateGenerate';

function createContext(argumentsValue: string, overrides: Partial<ITaskContext> = {}): ITaskContext {
  return Object.assign({
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
  }, overrides);
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

  it('does not define a false default for the properties string input', () => {
    const taskDefinition = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'task.json'), 'utf8'));
    const propertiesInput = taskDefinition.inputs.find((input: { name: string }) => input.name === 'properties');

    assert.ok(propertiesInput);
    assert.equal(propertiesInput.defaultValue ?? '', '');
  });

  it('does not add set-property when properties input is empty', () => {
    const command = new JReleaserRelease({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'release',
      configFile: '/tmp/jreleaser.yml',
      properties: '',
    }));

    assert.equal(command.options.includes('--set-property'), false);
  });

  it('adds set-property when properties input is set', () => {
    const command = new JReleaserRelease({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'release',
      configFile: '/tmp/jreleaser.yml',
      properties: 'project.version=1.2.3',
    }));

    assert.ok(command.options.includes('--set-property'));
    assert.deepEqual(
      command.options.slice(command.options.indexOf('--set-property')),
      ['--set-property', 'project.version=1.2.3'],
    );
  });

  it('does not add unsupported exclude options to template generate', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'templateGenerate',
      distribution: 'app',
      packager: 'brew',
      excludeDistribution: 'oldapp',
      excludePackager: 'scoop',
    }));

    assert.ok(command.options.includes('--distribution'));
    assert.ok(command.options.includes('--packager'));
    assert.equal(command.options.includes('--exclude-distribution'), false);
    assert.equal(command.options.includes('--exclude-packager'), false);
  });

  it('does not show exclude inputs for template generate', () => {
    const taskDefinition = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'task.json'), 'utf8'));
    const excludeDistributionInput = taskDefinition.inputs.find(
      (input: { name: string }) => input.name === 'excludeDistribution',
    );
    const excludePackagerInput = taskDefinition.inputs.find((input: { name: string }) => input.name === 'excludePackager');

    assert.ok(excludeDistributionInput);
    assert.ok(excludePackagerInput);
    assert.equal(excludeDistributionInput.visibleRule.includes('templateGenerate'), false);
    assert.equal(excludePackagerInput.visibleRule.includes('templateGenerate'), false);
  });
});
