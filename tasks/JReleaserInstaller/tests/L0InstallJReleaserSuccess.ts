import * as path from 'path';
import * as ma from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as fs from 'fs';


let taskPath = path.join(__dirname, '..', 'installer.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const tempDir = path.join(__dirname, 'temp');

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
      resolve("1.7.0");
    });
  },
  getJReleaserRelease: function (A, B) {
    return new Promise(async (resolve, reject) => {
      resolve({
        version: "1.7.0",
        platform: "linux-x86_64",
        name: "jreleaser-1.7.0-linux-x86_64.zip",
        releaseUrl: "https://github.com/jreleaser/jreleaser/releases/download/v1.7.0/jreleaser-1.7.0-linux-x86_64.zip",
        checksumUrl: "https://github.com/jreleaser/jreleaser/releases/download/v1.7.0/checksums_sha256.txt"
      });
    });
  },
  downloadJReleaserRelease: function (A) {
    return new Promise(async (resolve, reject) => {
      fs.writeFileSync(path.join(tempDir, 'jreleaser.zip'), 'fake zip file');
      resolve(path.join(tempDir, 'jreleaser.zip'));
    });
  },
  unzipJReleaserRelease: function (A) {
    return new Promise(async (resolve, reject) => {
      const extractDir = path.join(tempDir, 'jreleaser','1.7.0','x64');
      fs.mkdirSync(path.join(extractDir,'bin'), { recursive: true });
      resolve(extractDir);
    });
  }
});

const mtl = require("azure-pipelines-tool-lib/tool")
const mtlCopy = Object.assign({}, mtl);
mtlCopy.prependPath = function(A) {
  return new Promise(async (resolve, reject) => {
    resolve(A);
  });
};      
tmr.registerMock('azure-pipelines-tool-lib/tool', mtlCopy);

const tl = require('azure-pipelines-task-lib/mock-task');
const tlCopy = Object.assign({}, tl);
tlCopy.tool = function(A) {
  if(A == 'jreleaser') {
    return {
      arg: function() {
    },
    exec: function() {
      return new Promise(async (resolve, reject) => {
        resolve({
          code: 0,
          stdout: '1.7.0'
        });
      });
    }
  }
}};
tmr.registerMock('azure-pipelines-task-lib/mock-task', tlCopy);        

const a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
  stats: {
    [tempDir]: true,
  },
  checkPath: {
    'jreleaser': true,
  },
  exist: {
    [path.join(tempDir, 'jreleaser.zip')]: true,
  },
  which: {
    jreleaser: 'jreleaser'
  },
};
tmr.setAnswers(a);

tmr.run();