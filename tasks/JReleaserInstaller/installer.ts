import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as tl from 'azure-pipelines-task-lib/task';
import * as webClient from 'azure-pipelines-tasks-azure-arm-rest-v2/webClient';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';

import { getLatestVersion, getJReleaserRelease, downloadJReleaserRelease, unzipJReleaserRelease, JReleaserRelease  } from './utils';

const TOOL_NAME = 'jreleaser';

async function run() {
    const standAlone: boolean = true; // TODO: Add support for jreleaser-tool-provider
    let version = tl.getInput('version', true).trim();
    if (version === 'latest') {
      version = await getLatestVersion();
    }

    const jreleaserRelease: JReleaserRelease = await getJReleaserRelease(version, standAlone);
    console.log(`Downloading JReleaser ${jreleaserRelease.name}`);
    console.log(`Release URL: ${jreleaserRelease.releaseUrl}`);
    console.log(`Checksum URL: ${jreleaserRelease.checksumUrl}`);

    let toolPath: string = toolLib.findLocalTool(TOOL_NAME, version);
    if(toolPath) {
      console.log(`JReleaser ${version} was found in the local cache`);
    } else {
      console.log(`JReleaser ${version} was not found in the local cache, downloading...`);
      toolPath = await downloadJReleaserRelease(jreleaserRelease);
      console.log(`JReleaser ${version} was downloaded to ${toolPath}`);
      toolLib.cacheFile(toolPath, jreleaserRelease.name, TOOL_NAME, version);
    }

    if(standAlone) {
      const unzipPath: string = await unzipJReleaserRelease(toolPath);
      toolLib.prependPath(path.join(unzipPath, 'bin'));
    } else {
      console.log('TODO: Add support for jreleaser-tool-provider');
      // TODO: Add support for jreleaser-tool-provider
    }
}

async function verifyJReleaser() {
  console.log('Verifying JReleaser installation');
  const jreleaserPath = tl.which('jreleaser', true);
  const jreleaser = tl.tool(jreleaserPath);
  jreleaser.arg('--version');
  return jreleaser.exec();
}

run().then(() => verifyJReleaser())
.catch((error) => {
  tl.setResult(tl.TaskResult.Failed, error);
});
