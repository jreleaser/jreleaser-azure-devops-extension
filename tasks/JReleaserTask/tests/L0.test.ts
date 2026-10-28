import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import type { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import type { ITaskContext } from '../context';
import { JReleaserCustom } from '../commands/custom';
import { JReleaserRelease } from '../commands/release';
import { JReleaserTemplateGenerate } from '../commands/templateGenerate';
import { getOutputPropertiesBaseDirectory } from '../baseDirectory';

function createContext(argumentsValue: string, overrides: Partial<ITaskContext> = {}): ITaskContext {
  return {
    command: 'custom',
    baseDirectory: '',
    logLevel: '',
    arguments: argumentsValue,
    dryRun: false,
    exportOutputProperties: false,
    setVariable: () => {},
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
    ...overrides,
  };
}

describe('JReleaserTask L0 Suite', () => {
  it('parses custom flags and preserves quoted values and paths', () => {
    const command = new JReleaserCustom({} as ToolRunner);
    command.initialize(
      createContext(
        '--debug --dry-run --set-property project.name="My App" --config-file "/tmp/My Project/jreleaser.yml"',
      ),
    );
    assert.deepEqual(command.options, [
      '--debug',
      '--dry-run',
      '--set-property',
      'project.name=My App',
      '--config-file',
      '/tmp/My Project/jreleaser.yml',
    ]);
  });

  it('matches the task input defaults, required fields and visibility contract', () => {
    const taskDefinition = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'task.json'), 'utf8'));
    const input = (name: string) => {
      const found = taskDefinition.inputs.find((candidate: { name: string }) => candidate.name === name);
      assert.ok(found, `Missing task input: ${name}`);
      return found;
    };
    for (const name of ['properties', 'baseDirectory']) {
      assert.equal(input(name).defaultValue ?? '', '', name);
    }
    for (const name of [
      'templateGenerateAnnouncer',
      'templateGenerateAssemblerType',
      'templateGenerateAssemblerName',
      'templateGenerateDistribution',
      'templateGeneratePackager',
    ]) {
      assert.equal(input(name).required, false, name);
    }
    for (const name of ['templateGenerateDistribution', 'templateGeneratePackager']) {
      assert.equal(input(name).visibleRule, 'command = templateGenerate && templateGenerateType = packager', name);
    }
    for (const name of ['distribution', 'packager', 'excludeDistribution', 'excludePackager']) {
      assert.equal(input(name).visibleRule.includes('templateGenerate'), false, name);
    }
  });

  it('resolves output properties basedir with JReleaser precedence', () => {
    const previousBaseDirectory = process.env['JRELEASER_BASEDIR'];
    const argumentBaseDirectory = path.resolve('argument-project');
    const inputBaseDirectory = path.resolve('input-project');
    const environmentBaseDirectory = path.resolve('environment-project');
    const configBaseDirectory = path.resolve('config-project');

    try {
      process.env['JRELEASER_BASEDIR'] = environmentBaseDirectory;

      assert.equal(
        getOutputPropertiesBaseDirectory(
          createContext(`--basedir "${argumentBaseDirectory}"`, {
            command: 'release',
            baseDirectory: inputBaseDirectory,
            configFile: path.join(configBaseDirectory, 'jreleaser.yml'),
          }),
        ),
        argumentBaseDirectory,
      );
      assert.equal(
        getOutputPropertiesBaseDirectory(
          createContext('', {
            command: 'release',
            baseDirectory: inputBaseDirectory,
            configFile: path.join(configBaseDirectory, 'jreleaser.yml'),
          }),
        ),
        inputBaseDirectory,
      );
      assert.equal(
        getOutputPropertiesBaseDirectory(
          createContext('', {
            command: 'release',
            configFile: path.join(configBaseDirectory, 'jreleaser.yml'),
          }),
        ),
        environmentBaseDirectory,
      );

      delete process.env['JRELEASER_BASEDIR'];
      assert.equal(
        getOutputPropertiesBaseDirectory(
          createContext('', {
            command: 'release',
            configFile: path.join(configBaseDirectory, 'jreleaser.yml'),
          }),
        ),
        configBaseDirectory,
      );
    } finally {
      if (previousBaseDirectory === undefined) {
        delete process.env['JRELEASER_BASEDIR'];
      } else {
        process.env['JRELEASER_BASEDIR'] = previousBaseDirectory;
      }
    }
  });

  it('adds set-property only when properties input is supplied', () => {
    for (const [properties, expected] of [
      ['', []],
      ['project.version=1.2.3', ['--set-property', 'project.version=1.2.3']],
    ] as const) {
      const command = new JReleaserRelease({} as ToolRunner);
      command.initialize(
        createContext('', {
          command: 'release',
          configFile: '/tmp/jreleaser.yml',
          properties,
        }),
      );
      assert.deepEqual(
        command.options,
        ['release', '--config-file', '/tmp/jreleaser.yml', ...expected],
        `properties=${JSON.stringify(properties)}`,
      );
    }
  });

  it('keeps packager output-directory independent of overwrite and snapshot flags', () => {
    for (const [overwrite, snapshot, expectedFlags] of [
      [false, false, []],
      [true, false, ['--overwrite']],
      [false, true, ['--snapshot']],
      [true, true, ['--overwrite', '--snapshot']],
    ] as const) {
      const command = new JReleaserTemplateGenerate({} as ToolRunner);
      command.initialize(
        createContext('', {
          command: 'templateGenerate',
          templateGenerateType: ' packager ',
          templateGenerateDistribution: ' app ',
          templateGeneratePackager: ' brew ',
          templateGenerateDistributionType: ' JAVA_BINARY ',
          templateGenerateOverwrite: overwrite,
          templateGenerateSnapshot: snapshot,
          templateGenerateOutputDirectory: ' /tmp/templates ',
          excludeDistribution: 'oldapp',
          excludePackager: 'scoop',
        }),
      );
      assert.deepEqual(
        command.options,
        [
          'template',
          'generate',
          '--distribution',
          'app',
          '--packager',
          'brew',
          '--distribution-type',
          'JAVA_BINARY',
          ...expectedFlags,
          '--output-directory',
          '/tmp/templates',
        ],
        `overwrite=${overwrite}, snapshot=${snapshot}`,
      );
    }
  });

  it('builds template generate announcer arguments', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(
      createContext('', {
        command: 'templateGenerate',
        templateGenerateType: 'announcer',
        templateGenerateAnnouncer: 'slack',
      }),
    );

    assert.deepEqual(command.options, ['template', 'generate', '--announcer', 'slack']);
  });

  it('adds the selected log level to template generate arguments', () => {
    for (const logLevel of ['debug', 'info', 'warn', 'quiet']) {
      const command = new JReleaserTemplateGenerate({} as ToolRunner);
      command.initialize(
        createContext('', {
          command: 'templateGenerate',
          templateGenerateType: 'announcer',
          templateGenerateAnnouncer: 'slack',
          logLevel,
        }),
      );
      assert.deepEqual(command.options, ['template', 'generate', '--announcer', 'slack', `--${logLevel}`]);
    }
  });

  it('builds template generate assembler arguments', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(
      createContext('', {
        command: 'templateGenerate',
        templateGenerateType: 'assembler',
        templateGenerateAssemblerType: 'archive',
        templateGenerateAssemblerName: 'app',
      }),
    );

    assert.deepEqual(command.options, [
      'template',
      'generate',
      '--assembler-type',
      'archive',
      '--assembler-name',
      'app',
    ]);
  });

  it('rejects missing required inputs for each template generate mode', () => {
    for (const [inputs, expectedError] of [
      [
        { templateGenerateType: 'packager', templateGenerateDistribution: 'app', templateGeneratePackager: '' },
        /templateGenerate packager mode requires distribution and packager/,
      ],
      [
        { templateGenerateType: 'announcer', templateGenerateAnnouncer: '' },
        /templateGenerate announcer mode requires templateGenerateAnnouncer/,
      ],
      [
        {
          templateGenerateType: 'assembler',
          templateGenerateAssemblerType: 'archive',
          templateGenerateAssemblerName: '',
        },
        /templateGenerate assembler mode requires templateGenerateAssemblerType and templateGenerateAssemblerName/,
      ],
    ] as const) {
      const command = new JReleaserTemplateGenerate({} as ToolRunner);
      assert.throws(
        () => command.initialize(createContext('', { command: 'templateGenerate', ...inputs })),
        expectedError,
        inputs.templateGenerateType,
      );
    }
  });

  it('allows custom arguments to bypass template generate mode validation', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(
      createContext('--announcer slack', {
        command: 'templateGenerate',
        templateGenerateType: 'packager',
        templateGenerateDistribution: '',
        templateGeneratePackager: '',
      }),
    );

    assert.deepEqual(command.options, ['template', 'generate', '--announcer', 'slack']);
  });

  it('keeps selected mode inputs when custom arguments are present', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(
      createContext('--snapshot', {
        command: 'templateGenerate',
        templateGenerateType: 'announcer',
        templateGenerateAnnouncer: 'slack',
      }),
    );

    assert.deepEqual(command.options, ['template', 'generate', '--snapshot', '--announcer', 'slack']);
  });

  it('keeps legacy template generate distribution and packager inputs working', () => {
    const command = new JReleaserTemplateGenerate({} as ToolRunner);

    command.initialize(
      createContext('', {
        command: 'templateGenerate',
        templateGenerateType: 'packager',
        distribution: 'app',
        packager: 'brew',
      }),
    );

    assert.deepEqual(command.options, ['template', 'generate', '--distribution', 'app', '--packager', 'brew']);
  });
});
