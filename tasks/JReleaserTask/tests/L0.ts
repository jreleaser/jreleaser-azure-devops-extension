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
    templateGenerateType: 'packager',
    templateGenerateAnnouncer: '',
    templateGenerateAssemblerType: '',
    templateGenerateAssemblerName: '',
    templateGenerateDistribution: '',
    templateGeneratePackager: '',
    templateGenerateDistributionType: '',
    templateGenerateOverwrite: false,
    templateGenerateSnapshot: false,
    templateGenerateOutputDirectory: '',
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

  it('builds template generate packager arguments', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'templateGenerate',
      templateGenerateType: 'packager',
      templateGenerateDistribution: 'app',
      templateGeneratePackager: 'brew',
      templateGenerateDistributionType: 'JAVA_BINARY',
    }));

    assert.deepEqual(
      command.options.filter(option => option !== undefined),
      [
        'template',
        'generate',
        '--distribution',
        'app',
        '--packager',
        'brew',
        '--distribution-type',
        'JAVA_BINARY',
      ],
    );
  });

  it('builds template generate announcer arguments', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'templateGenerate',
      templateGenerateType: 'announcer',
      templateGenerateAnnouncer: 'slack',
    }));

    assert.deepEqual(
      command.options.filter(option => option !== undefined),
      ['template', 'generate', '--announcer', 'slack'],
    );
  });

  it('builds template generate assembler arguments', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'templateGenerate',
      templateGenerateType: 'assembler',
      templateGenerateAssemblerType: 'archive',
      templateGenerateAssemblerName: 'app',
    }));

    assert.deepEqual(
      command.options.filter(option => option !== undefined),
      [
        'template',
        'generate',
        '--assembler-type',
        'archive',
        '--assembler-name',
        'app',
      ],
    );
  });

  it('builds template generate common options', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'templateGenerate',
      templateGenerateType: 'packager',
      templateGenerateDistribution: 'app',
      templateGeneratePackager: 'brew',
      templateGenerateOverwrite: true,
      templateGenerateSnapshot: true,
      templateGenerateOutputDirectory: '/tmp/templates',
    }));

    assert.ok(command.options.includes('--overwrite'));
    assert.ok(command.options.includes('--snapshot'));
    const outputDirectoryIndex = command.options.indexOf('--output-directory');

    assert.deepEqual(
      command.options.slice(outputDirectoryIndex, outputDirectoryIndex + 2),
      ['--output-directory', '/tmp/templates'],
    );
  });

  it('fails template generate packager mode when required inputs are missing', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    assert.throws(
      () =>
        command.initialize(createContext('', {
          command: 'templateGenerate',
          templateGenerateType: 'packager',
          templateGenerateDistribution: 'app',
          templateGeneratePackager: '',
        })),
      /templateGenerate packager mode requires distribution and packager/,
    );
  });

  it('fails template generate announcer mode when announcer is missing', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    assert.throws(
      () =>
        command.initialize(createContext('', {
          command: 'templateGenerate',
          templateGenerateType: 'announcer',
          templateGenerateAnnouncer: '',
        })),
      /templateGenerate announcer mode requires templateGenerateAnnouncer/,
    );
  });

  it('fails template generate assembler mode when assembler inputs are missing', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    assert.throws(
      () =>
        command.initialize(createContext('', {
          command: 'templateGenerate',
          templateGenerateType: 'assembler',
          templateGenerateAssemblerType: 'archive',
          templateGenerateAssemblerName: '',
        })),
      /templateGenerate assembler mode requires templateGenerateAssemblerType and templateGenerateAssemblerName/,
    );
  });

  it('trims template generate input values before adding options', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'templateGenerate',
      templateGenerateType: ' packager ',
      templateGenerateDistribution: ' app ',
      templateGeneratePackager: ' brew ',
      templateGenerateDistributionType: ' JAVA_BINARY ',
      templateGenerateOutputDirectory: ' /tmp/templates ',
    }));

    assert.deepEqual(
      command.options.filter(option => option !== undefined),
      [
        'template',
        'generate',
        '--distribution',
        'app',
        '--packager',
        'brew',
        '--distribution-type',
        'JAVA_BINARY',
        '--output-directory',
        '/tmp/templates',
      ],
    );
  });

  it('allows custom arguments to bypass template generate mode validation', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('--announcer slack', {
      command: 'templateGenerate',
      templateGenerateType: 'packager',
      templateGenerateDistribution: '',
      templateGeneratePackager: '',
    }));

    assert.deepEqual(
      command.options.filter(option => option !== undefined),
      ['template', 'generate', '--announcer', 'slack'],
    );
  });

  it('keeps selected mode inputs when custom arguments are present', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('--snapshot', {
      command: 'templateGenerate',
      templateGenerateType: 'announcer',
      templateGenerateAnnouncer: 'slack',
    }));

    assert.deepEqual(
      command.options.filter(option => option !== undefined),
      ['template', 'generate', '--snapshot', '--announcer', 'slack'],
    );
  });

  it('keeps legacy template generate distribution and packager inputs working', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(createContext('', {
      command: 'templateGenerate',
      templateGenerateType: 'packager',
      distribution: 'app',
      packager: 'brew',
    }));

    assert.deepEqual(
      command.options.filter(option => option !== undefined),
      ['template', 'generate', '--distribution', 'app', '--packager', 'brew'],
    );
  });

  it('does not require template generate mode inputs in task json', () => {
    const taskDefinition = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'task.json'), 'utf8'));
    const optionalInputNames = [
      'templateGenerateAnnouncer',
      'templateGenerateAssemblerType',
      'templateGenerateAssemblerName',
      'templateGenerateDistribution',
      'templateGeneratePackager',
    ];

    for (const inputName of optionalInputNames) {
      const input = taskDefinition.inputs.find((taskInput: { name: string }) => taskInput.name === inputName);

      assert.ok(input);
      assert.equal(input.required, false);
    }
  });

  it('uses dedicated template generate packager inputs in task json', () => {
    const taskDefinition = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'task.json'), 'utf8'));
    const templateGenerateDistributionInput = taskDefinition.inputs.find(
      (input: { name: string }) => input.name === 'templateGenerateDistribution',
    );
    const templateGeneratePackagerInput = taskDefinition.inputs.find(
      (input: { name: string }) => input.name === 'templateGeneratePackager',
    );
    const distributionInput = taskDefinition.inputs.find((input: { name: string }) => input.name === 'distribution');
    const packagerInput = taskDefinition.inputs.find((input: { name: string }) => input.name === 'packager');

    assert.equal(
      templateGenerateDistributionInput.visibleRule,
      'command = templateGenerate && templateGenerateType = packager',
    );
    assert.equal(
      templateGeneratePackagerInput.visibleRule,
      'command = templateGenerate && templateGenerateType = packager',
    );
    assert.equal(distributionInput.visibleRule.includes('templateGenerate'), false);
    assert.equal(packagerInput.visibleRule.includes('templateGenerate'), false);
  });
});
