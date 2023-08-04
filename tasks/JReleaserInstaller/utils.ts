import * as os from 'os';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import axios from 'axios';
import * as tl from 'azure-pipelines-task-lib/task';

const userAgent: string = 'kubelogin-installer-task';

export type Platform = 'osx-aarch64' | 'osx-x86_64' | 'linux-aarch64' | 'linux-x86_64' | 'windows-aarch64' | 'windows-x86_64';

export interface JReleaserRelease {
  readonly version: string;
  readonly platform: Platform;
  readonly name: string;
  readonly releaseUrl: string;
  readonly checksumUrl: string;
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
        'User-Agent': userAgent
      }
    });
    tl.debug(`Latest JReleaser version: ${response.data['tag_name']}`);
    return response.data['tag_name'].replace('v', '');
  }

  export async function getJReleaserRelease(version: string, standalone: boolean, platform?: Platform, ): Promise<JReleaserRelease> {
    let tagVersion = version;
    if (version === 'latest') {
      version = await getLatestVersion();
    } 

    version = toolLib.cleanVersion(version);
    if(!version) {
      throw new Error(`Invalid version ${version}`);
    }

    if(!version.startsWith('v')) {
      tagVersion = 'v' + version;
    }

    platform = platform || resolvePlatform();

    const releaseName = standalone ? `jreleaser-standalone-${version}-${platform}` : `jreleaser-tool-provider-${version}`;
    const chksum = 'checksums_sha256'

    try{
      const response = await axios.get(`https://api.github.com/repos/jreleaser/jreleaser/releases/tags/${tagVersion}`, {
        headers: {
          'User-Agent': userAgent
        }
      });

      const releaseUrl: string = response.data['assets'].find((asset: any ) => asset.name.includes(releaseName))?.browser_download_url || '';
      const chksumUrl: string = response.data['assets'].find((asset: any ) => asset.name.includes(chksum))?.browser_download_url || '';

      return {
        version: version,
        platform: platform,
        name: releaseName,
        releaseUrl: releaseUrl,
        checksumUrl: chksumUrl
      };
    } catch (error) {
      tl.debug(`Failed to get JReleaser release: ${error}`);
      throw new Error(`Failed to get JReleaser release: ${error}`);
    }
  }

  export async function downloadJReleaserRelease(release: JReleaserRelease): Promise<string> {
    try{
      let downloadPath = await toolLib.downloadTool(release.releaseUrl, release.name);
      tl.debug(`Downloaded JReleaser release: ${downloadPath}`);
      return downloadPath;
    } catch (error) {
      tl.debug(`Failed to download JReleaser release: ${error}`);
      throw new Error(`Failed to download JReleaser release: ${error}`);
    }
  }

  export async function unzipJReleaserRelease(downloadPath: string): Promise<string> {
    if(!tl.exist(downloadPath)) {
      throw new Error(`JReleaser release not found at ${downloadPath}`);
    }
    try{
      const extPath = await toolLib.extractZip(downloadPath);
      tl.debug(`Extracted JReleaser release: ${extPath}`);
      return extPath;
    } catch (error) {
      tl.debug(`Failed to extract JReleaser release: ${error}`);
      throw new Error(`Failed to extract JReleaser release: ${error}`);
    }
  }