import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import type { TaskLibAnswers } from 'azure-pipelines-task-lib/mock-answer';
import { TaskMockRunner } from 'azure-pipelines-task-lib/mock-run';

const taskRunner = new TaskMockRunner(path.join(__dirname, '../installer.js'));
const tempDirectory = process.env.AGENT_TEMPDIRECTORY;
assert.ok(tempDirectory);
const callOrder: string[] = [];
const findLocalToolCalls: unknown[][] = [];
const releaseName = 'jreleaser-standalone-1.7.0-linux-x86_64';
const archivePath = path.join(tempDirectory, releaseName + '.zip');
const extractedDirectory = path.join(tempDirectory, 'extracted');
const installedBin = path.join(extractedDirectory, releaseName, 'bin');
const installedExecutable = path.join(installedBin, 'jreleaser');

taskRunner.setInput('version', '1.7.0');
taskRunner.registerMock('./utils', {
  getJReleaserRelease: async () => ({
    version: '1.7.0',
    platform: 'linux-x86_64',
    name: releaseName,
    releaseUrl: 'https://example.test/archive',
    checksumUrl: 'https://example.test/checksum',
  }),
  downloadJReleaserRelease: async () => {
    assert.deepEqual(findLocalToolCalls, [['jreleaser', '1.7.0', 'linux-x86_64']]);
    callOrder.push('download');
    return archivePath;
  },
  verifyJReleaserReleaseChecksum: async () => {
    callOrder.push('verify');
  },
  unzipJReleaserRelease: async () => {
    callOrder.push('unzip');
    assert.deepEqual(callOrder, ['download', 'verify', 'cache', 'unzip']);
    return extractedDirectory;
  },
});

taskRunner.registerMock('azure-pipelines-tool-lib/tool', {
  findLocalTool: (toolName, version, cacheArch) => {
    findLocalToolCalls.push([toolName, version, cacheArch]);
    assert.deepEqual([toolName, version, cacheArch], ['jreleaser', '1.7.0', 'linux-x86_64']);
    return '';
  },
  cacheFile: async (downloadFile, targetName, toolName, version, cacheArch) => {
    assert.equal(downloadFile, archivePath);
    assert.equal(targetName, releaseName);
    assert.equal(toolName, 'jreleaser');
    assert.equal(version, '1.7.0');
    assert.equal(cacheArch, 'linux-x86_64');
    callOrder.push('cache');
    return path.join(tempDirectory, 'cache');
  },
  prependPath: binDirectory => {
    assert.equal(binDirectory, installedBin);
    assert.deepEqual(callOrder, ['download', 'verify', 'cache', 'unzip', 'execute']);
    console.log('JRELEASER_INSTALL_VERIFIED');
  },
});

taskRunner.registerMockExport('tool', executable => {
  assert.equal(executable, installedExecutable);
  return {
    arg: value => assert.equal(value, '--version'),
    exec: async () => {
      callOrder.push('execute');
      return 0;
    },
  };
});

const answers: TaskLibAnswers = {
  checkPath: { [installedExecutable]: true },
  which: { [installedExecutable]: installedExecutable },
};
taskRunner.setAnswers(answers);
taskRunner.run();
