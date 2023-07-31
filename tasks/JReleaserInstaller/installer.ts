import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as tl from 'azure-pipelines-task-lib/task';
import * as webClient from 'azure-pipelines-tasks-azure-arm-rest-v2/webClient';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';

var packagejson = require('./package.json');

const osPlat: string = os.platform();
const osArch: string = os.arch();

async function run() {
  try {
    const standAlone = true;
    let version = tl.getInput('version', true).trim();
    if (version === 'latest') {
      version = await getlatestVersion();
    }
    tl.debug('version: ' + version);
    await getJReleaser(version, standAlone);
  } catch (error) {
    tl.setResult(tl.TaskResult.Failed, error);
  }
}

async function getJReleaser(version: string, standAlone: boolean) {
  let toolPath: string;
  toolPath = toolLib.findLocalTool('jreleaser', version);

  if (!toolPath) {
    toolPath = await acquireJReleaser(version, standAlone);
    tl.debug('JReleaser is cached under ' + toolPath);
  }

  toolPath = path.join(toolPath, 'bin');
  toolLib.prependPath(toolPath);
}

async function acquireJReleaser(
  version: string,
  standAlone: boolean,
): Promise<string> {
  const fileName: string = getFileName(version, standAlone);
  const fileNameWithoutExt: string = fileName.replace('.zip', '');
  tl.debug('fileName: ' + fileName);
  const downloadUrl: string = getDownloadUrl(version, fileName);
  tl.debug('downloadUrl: ' + downloadUrl);
  let downloadPath: string = null;

  try {
    downloadPath = await toolLib.downloadTool(downloadUrl);
  } catch (error) {
    tl.debug(error);
    throw util.format(
      'Failed to download version %s. Please verify that the version is valid and resolve any other issues. %s',
      version,
      error,
    );
  }

  let extPath: string;
  if (standAlone === true) {
    extPath = await toolLib.extractZip(downloadPath);
    tl.debug('Extracted JReleaser to ' + extPath);
  }
  const toolRoot = path.join(extPath, fileNameWithoutExt);
  return await toolLib.cacheDir(toolRoot, 'jreleaser', version);
}

function getFileName(version: string, standAlone: boolean): string {
  if (!standAlone) {
    return 'jreleaser-tool-provider-' + version + '.jar';
  }

  let platform: string;
  switch (osPlat) {
    case 'win32':
      platform = 'windows';
      break;
    case 'darwin':
      platform = 'osx';
      break;
    case 'linux':
      platform = 'linux';
      break;
    default:
      throw new Error(util.format("Unexpected OS '%s'", osPlat));
  }

  let arch: string;
  switch (osArch) {
    case 'x64':
      arch = 'x86_64';
      break;
    case 'arm':
      arch = 'aarch64';
      break;
    default:
      throw new Error(util.format("Unexpected architecture '%s'", osArch));
  }

  const filename: string = util.format(
    'jreleaser-standalone-%s-%s-%s.%s',
    version,
    platform,
    arch,
    'zip',
  );
  return filename.replace(/[\n\r]+/g, '');
}

function getDownloadUrl(version: string, filename: string): string {
  const tagVersion = version === 'early-access' ? version : 'v' + version;
  return util.format(
    'https://github.com/jreleaser/jreleaser/releases/download/%s/%s',
    tagVersion,
    filename,
  );
}

async function getlatestVersion(): Promise<string> {
  const url = 'https://jreleaser.org/releases/latest/download/VERSION';
  let request = new webClient.WebRequest();
  request.uri = url;
  request.method = 'GET';
  request.headers = request.headers || {};
  request.headers['User-Agent'] = 'jreleaser-installer-task' + packagejson.version;
  // const version = await axios.get(url).then(response => response.data);
  const response = await webClient.sendRequest(request);
  const version = response.body;
  return version.replace(/[\n\r]+/g, '');
}

run();
