import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as tl from 'azure-pipelines-task-lib/task';
import * as path from 'path';

import {
  getLatestVersion,
  getJReleaserRelease,
  downloadJReleaserRelease,
  unzipJReleaserRelease,
  JReleaserRelease,
} from './utils';

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
  let toolFilePath: string;
  if (toolPath) {
    console.log(`JReleaser ${version} was found in the local cache`);
    toolFilePath = path.join(toolPath, jreleaserRelease.name);
  } else {
    console.log(`JReleaser ${version} was not found in the local cache, downloading...`);
    let downloadFile: string = await downloadJReleaserRelease(jreleaserRelease);
    console.log(`JReleaser ${version} was downloaded to ${downloadFile}`);
    toolFilePath = path.join(
      await toolLib.cacheFile(downloadFile, jreleaserRelease.name, TOOL_NAME, version),
      jreleaserRelease.name,
    );
  }

  if (standAlone) {
    const unzipPath: string = await unzipJReleaserRelease(path.join(toolFilePath));

    console.log(`ADD ToolLib Path: ${path.join(unzipPath, jreleaserRelease.name, 'bin')}`);
    toolLib.prependPath(path.join(unzipPath, jreleaserRelease.name, 'bin'));
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

run()
  .then(() => verifyJReleaser())
  .catch(error => {
    tl.setResult(tl.TaskResult.Failed, error);
  });
