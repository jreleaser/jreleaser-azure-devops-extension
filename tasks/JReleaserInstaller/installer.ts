import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as tl from 'azure-pipelines-task-lib/task';
import * as path from 'path';

import {
  getLatestVersion,
  getJReleaserRelease,
  downloadJReleaserRelease,
  verifyJReleaserReleaseChecksum,
  unzipJReleaserRelease,
  JReleaserRelease,
} from './utils';

const TOOL_NAME = 'jreleaser';

async function run() {
  let version = tl.getInput('version', true).trim();
  if (version === 'latest') {
    version = await getLatestVersion();
  }

  const jreleaserRelease: JReleaserRelease = await getJReleaserRelease(version, true);
  console.log(`Downloading JReleaser ${jreleaserRelease.name}`);
  console.log(`Release URL: ${jreleaserRelease.releaseUrl}`);
  console.log(`Checksum URL: ${jreleaserRelease.checksumUrl}`);

  const cacheArch = jreleaserRelease.platform;
  let toolPath: string = toolLib.findLocalTool(TOOL_NAME, version, cacheArch);
  let toolFilePath: string | undefined;
  if (toolPath && tl.exist(path.join(toolPath, jreleaserRelease.name))) {
    console.log(`JReleaser ${version} was found in the local cache`);
    toolFilePath = path.join(toolPath, jreleaserRelease.name);
  } else if (toolPath) {
    console.log(`Ignoring incomplete JReleaser ${version} cache for ${cacheArch}`);
  }

  if (!toolFilePath) {
    console.log(`JReleaser ${version} was not found in the local cache, downloading...`);
    let downloadFile: string = await downloadJReleaserRelease(jreleaserRelease);
    console.log(`JReleaser ${version} was downloaded to ${downloadFile}`);
    await verifyJReleaserReleaseChecksum(jreleaserRelease, downloadFile);
    toolFilePath = path.join(
      await toolLib.cacheFile(downloadFile, jreleaserRelease.name, TOOL_NAME, version, cacheArch),
      jreleaserRelease.name,
    );
  }

  const unzipPath: string = await unzipJReleaserRelease(toolFilePath);
  const binDirectory = path.join(unzipPath, jreleaserRelease.name, 'bin');
  await verifyJReleaser(binDirectory);
  toolLib.prependPath(binDirectory);
}

async function verifyJReleaser(binDirectory: string) {
  console.log('Verifying JReleaser installation');
  const jreleaserPath = tl.which(path.join(binDirectory, 'jreleaser'), true);
  const jreleaser = tl.tool(jreleaserPath);
  jreleaser.arg('--version');
  return jreleaser.exec();
}

run().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});
