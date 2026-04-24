import * as path from 'path';
import * as ma from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as fs from 'fs';
import * as assert from 'node:assert/strict';

let taskPath = path.join(__dirname, '..', 'installer.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const tempDir = path.join(__dirname, 'temp');
const callOrder: string[] = [];

process.env['AGENT_TOOLSDIRECTORY'] = tempDir;
process.env['AGENT_TEMPDIRECTORY'] = tempDir;

tmr.setInput('version', '1.7.0');
tmr.setInput('standalone', 'true');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
} else {
  fs.rmdirSync(tempDir, { recursive: true });
  fs.mkdirSync(tempDir);
}

tmr.registerMock(`./utils`, {
  getLatestVersion: function () {
    return new Promise(async (resolve, reject) => {
      resolve('1.7.0');
    });
  },
  getJReleaserRelease: function (A, B) {
    return new Promise(async (resolve, reject) => {
      resolve({
        version: '1.7.0',
        platform: 'linux-x86_64',
        name: 'jreleaser-1.7.0-linux-x86_64.zip',
        releaseUrl: 'https://github.com/jreleaser/jreleaser/releases/download/v1.7.0/jreleaser-1.7.0-linux-x86_64.zip',
        checksumUrl: 'https://github.com/jreleaser/jreleaser/releases/download/v1.7.0/checksums_sha256.txt',
      });
    });
  },
  downloadJReleaserRelease: function (A) {
    return new Promise(async (resolve, reject) => {
      callOrder.push('download');
      fs.writeFileSync(path.join(tempDir, 'jreleaser-standalone-1.7.0-linux-x86_64.zip'), 'fake zip file');
      resolve(path.join(tempDir, 'jreleaser-standalone-1.7.0-linux-x86_64.zip'));
    });
  },
  verifyJReleaserReleaseChecksum: function (A, B) {
    return new Promise(async resolve => {
      callOrder.push('verify');
      resolve(undefined);
    });
  },
  unzipJReleaserRelease: function (A) {
    return new Promise(async (resolve, reject) => {
      callOrder.push('unzip');
      assert.deepEqual(callOrder, ['download', 'verify', 'cache', 'unzip']);
      const extractDir = path.join(tempDir, 'jreleaser', '1.7.0', 'x64');
      fs.mkdirSync(path.join(extractDir, 'bin'), { recursive: true });
      resolve(extractDir);
    });
  },
});

tmr.registerMock('azure-pipelines-tool-lib/tool', {
  findLocalTool: function () {
    return '';
  },
  cacheFile: function () {
    return new Promise(async resolve => {
      callOrder.push('cache');
      resolve(path.join(tempDir, 'cache'));
    });
  },
  prependPath: function (A) {
    return new Promise(async resolve => {
      resolve(A);
    });
  },
});

tmr.registerMockExport('tool', function (A) {
  if (A == 'jreleaser') {
    return {
      arg: function () {},
      exec: function () {
        return new Promise(async resolve => {
          resolve({
            code: 0,
            stdout: '1.7.0',
          });
        });
      },
    };
  }
});

const a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
  stats: {
    [tempDir]: true,
  },
  checkPath: {
    jreleaser: true,
  },
  exist: {
    [path.join(tempDir, 'jreleaser-standalone-1.7.0-windows-x86_64')]: true,
    [path.join(tempDir, 'jreleaser-standalone-1.7.0-linux-x86_64')]: true,
    [path.join(tempDir, 'jreleaser-standalone-1.7.0-osx-x86_64')]: true,
  },
  which: {
    jreleaser: 'jreleaser',
  },
};
tmr.setAnswers(a);

tmr.run();
