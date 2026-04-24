import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import axios from 'axios';
import * as tl from 'azure-pipelines-task-lib/task';

const userAgent: string = 'kubelogin-installer-task';
const checksumAssetName = 'checksums_sha256.txt';

export type Platform =
  | 'osx-aarch64'
  | 'osx-x86_64'
  | 'linux-aarch64'
  | 'linux-x86_64'
  | 'windows-aarch64'
  | 'windows-x86_64';

export interface JReleaserRelease {
  readonly version: string;
  readonly platform: Platform;
  readonly name: string;
  readonly releaseUrl: string;
  readonly checksumUrl: string;
}

export interface JReleaserReleaseAsset {
  readonly name: string;
  readonly browser_download_url: string;
}

export function resolvePlatform(): Platform {
  const platform: string = os.platform();
  const arch: string = os.arch();
  if (platform === 'darwin' && arch === 'x64') {
    return 'osx-x86_64';
  } else if (platform === 'darwin' && arch === 'arm64') {
    return 'osx-aarch64';
  } else if (platform === 'linux' && arch === 'x64') {
    return 'linux-x86_64';
  } else if (platform === 'linux' && arch === 'arm64') {
    return 'linux-aarch64';
  } else if (platform === 'win32' && arch === 'x64') {
    return 'windows-x86_64';
  } else if (platform === 'win32' && arch === 'arm64') {
    return 'windows-aarch64';
  } else {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }
}

export async function getLatestVersion(): Promise<string> {
  const response = await axios.get('https://api.github.com/repos/jreleaser/jreleaser/releases/latest', {
    headers: {
      'User-Agent': userAgent,
    },
  });
  tl.debug(`Latest JReleaser version: ${response.data['tag_name']}`);
  return response.data['tag_name'].replace('v', '');
}

export async function getJReleaserRelease(
  version: string,
  standalone: boolean,
  platform?: Platform,
  releaseAssets?: JReleaserReleaseAsset[],
): Promise<JReleaserRelease> {
  let tagVersion = version;
  if (version === 'latest') {
    version = await getLatestVersion();
  }

  version = toolLib.cleanVersion(version);
  if (!version) {
    throw new Error(`Invalid version ${version}`);
  }

  if (!version.startsWith('v')) {
    tagVersion = 'v' + version;
  }

  platform = platform || resolvePlatform();

  const releaseName = standalone ? `jreleaser-standalone-${version}-${platform}` : `jreleaser-tool-provider-${version}`;
  const releaseAssetName = `${releaseName}.zip`;

  if (!releaseAssets) {
    try {
      const response = await axios.get(`https://api.github.com/repos/jreleaser/jreleaser/releases/tags/${tagVersion}`, {
        headers: {
          'User-Agent': userAgent,
        },
      });
      releaseAssets = response.data['assets'] || [];
    } catch (error) {
      tl.debug(`Failed to get JReleaser release: ${error}`);
      throw new Error(`Failed to get JReleaser release: ${error}`);
    }
  }

  const releaseUrl: string =
    releaseAssets.find((asset: JReleaserReleaseAsset) => asset.name === releaseAssetName)?.browser_download_url || '';
  const chksumUrl: string =
    releaseAssets.find((asset: JReleaserReleaseAsset) => asset.name === checksumAssetName)?.browser_download_url || '';

  if (!releaseUrl) {
    throw new Error(`JReleaser release asset not found: ${releaseAssetName}`);
  }
  if (!chksumUrl) {
    throw new Error(`JReleaser checksum asset not found: ${checksumAssetName}`);
  }

  return {
    version: version,
    platform: platform,
    name: releaseName,
    releaseUrl: releaseUrl,
    checksumUrl: chksumUrl,
  };
}

export async function downloadJReleaserRelease(release: JReleaserRelease): Promise<string> {
  try {
    let downloadPath = await toolLib.downloadTool(release.releaseUrl, release.name);
    tl.debug(`Downloaded JReleaser release: ${downloadPath}`);
    return downloadPath;
  } catch (error) {
    tl.debug(`Failed to download JReleaser release: ${error}`);
    throw new Error(`Failed to download JReleaser release: ${error}`);
  }
}

export async function verifyJReleaserReleaseChecksum(
  release: JReleaserRelease,
  downloadPath: string,
  checksumText?: string,
): Promise<void> {
  const archiveName = `${release.name}.zip`;

  if (!checksumText) {
    try {
      const response = await axios.get(release.checksumUrl, {
        headers: {
          'User-Agent': userAgent,
        },
      });
      checksumText = String(response.data);
    } catch (error) {
      tl.debug(`Failed to download JReleaser checksums: ${error}`);
      throw new Error(`Failed to download JReleaser checksums: ${error}`);
    }
  }

  const expectedChecksum = checksumText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(/\s+/))
    .find(parts => parts.length >= 2 && parts[1].replace(/^\*/, '') === archiveName)?.[0];

  if (!expectedChecksum) {
    throw new Error(`Checksum entry not found for ${archiveName}`);
  }

  const actualChecksum = crypto.createHash('sha256').update(fs.readFileSync(downloadPath)).digest('hex');
  if (actualChecksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
    throw new Error(`Checksum mismatch for ${archiveName}: expected ${expectedChecksum}, got ${actualChecksum}`);
  }

  tl.debug(`Verified JReleaser release checksum for ${archiveName}`);
}

export async function unzipJReleaserRelease(downloadPath: string): Promise<string> {
  if (!tl.exist(downloadPath)) {
    throw new Error(`JReleaser release not found at ${downloadPath}`);
  }
  try {
    const extPath = await toolLib.extractZip(downloadPath);
    tl.debug(`Extracted JReleaser release: ${extPath}`);
    return extPath;
  } catch (error) {
    tl.debug(`Failed to extract JReleaser release: ${error}`);
    throw new Error(`Failed to extract JReleaser release: ${error}`);
  }
}
