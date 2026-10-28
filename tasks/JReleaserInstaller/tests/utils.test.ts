import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import {
  downloadJReleaserRelease,
  getJReleaserRelease,
  isMuslLinux,
  resolvePlatform,
  verifyJReleaserReleaseChecksum,
} from '../utils';

function createTempFile(t: TestContext, contents: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-installer-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const filePath = path.join(tempDir, 'downloaded-release');
  fs.writeFileSync(filePath, contents);
  return filePath;
}

function sha256(contents: string): string {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

describe('JReleaserInstaller L0 utilities', () => {
  it('detects musl from the glibc report and loader presence', () => {
    for (const [header, loaderExists, expected] of [
      [{}, true, true],
      [{ glibcVersionRuntime: '2.35' }, true, false],
      [{}, false, false],
    ] as const) {
      assert.equal(
        isMuslLinux(
          'x64',
          filePath => loaderExists && filePath === '/lib/ld-musl-x86_64.so.1',
          () => ({ header }),
        ),
        expected,
        JSON.stringify({ header, loaderExists }),
      );
    }
  });

  it('selects Linux archives for each architecture and libc', () => {
    for (const [arch, musl, expected] of [
      ['x64', true, 'linux_musl-x86_64'],
      ['arm64', true, 'linux_musl-aarch64'],
      ['x64', false, 'linux-x86_64'],
      ['arm64', false, 'linux-aarch64'],
    ] as const) {
      assert.equal(resolvePlatform('linux', arch, musl), expected, `${arch}, musl=${musl}`);
    }
  });

  it('selects the exact platform archive and checksum from mixed assets', async () => {
    const assets = [
      'jreleaser-standalone-1.23.0-linux-x86_64.zip.asc',
      'jreleaser-standalone-1.23.0-linux_musl-x86_64.zip.asc',
      'jreleaser-standalone-1.23.0-linux-x86_64.zip',
      'jreleaser-standalone-1.23.0-linux_musl-x86_64.zip',
      'checksums_sha256.txt.asc',
      'checksums_sha256.txt',
    ].map(name => ({ name, browser_download_url: `https://example.test/${name}` }));
    for (const platform of ['linux-x86_64', 'linux_musl-x86_64'] as const) {
      const release = await getJReleaserRelease('1.23.0', true, platform, assets);
      const name = `jreleaser-standalone-1.23.0-${platform}`;
      assert.equal(release.name, name);
      assert.equal(release.releaseUrl, `https://example.test/${name}.zip`);
      assert.equal(release.checksumUrl, 'https://example.test/checksums_sha256.txt');
    }
  });

  it('downloads release without reusing the archive name as the temp file name', async () => {
    const originalDownloadTool = toolLib.downloadTool;
    const calls: unknown[][] = [];

    Object.defineProperty(toolLib, 'downloadTool', {
      value: async (...args: unknown[]) => {
        calls.push(args);
        return '/agent/_temp/generated-download-id';
      },
      configurable: true,
    });

    try {
      const downloadPath = await downloadJReleaserRelease({
        version: '1.23.0',
        platform: 'linux-x86_64',
        name: 'jreleaser-standalone-1.23.0-linux-x86_64',
        releaseUrl: 'https://example.test/archive',
        checksumUrl: 'https://example.test/checksum',
      });

      assert.equal(downloadPath, '/agent/_temp/generated-download-id');
      assert.deepEqual(calls, [['https://example.test/archive']]);
    } finally {
      Object.defineProperty(toolLib, 'downloadTool', {
        value: originalDownloadTool,
        configurable: true,
      });
    }
  });

  it('fails when the release archive asset is missing', async () => {
    await assert.rejects(
      () =>
        getJReleaserRelease('1.23.0', true, 'linux-x86_64', [
          {
            name: 'jreleaser-standalone-1.23.0-linux-x86_64.zip.asc',
            browser_download_url: 'https://example.test/signature',
          },
          {
            name: 'checksums_sha256.txt',
            browser_download_url: 'https://example.test/checksum',
          },
        ]),
      /JReleaser release asset not found: jreleaser-standalone-1\.23\.0-linux-x86_64\.zip/,
    );
  });

  it('fails when the checksum asset is missing', async () => {
    await assert.rejects(
      () =>
        getJReleaserRelease('1.23.0', true, 'linux-x86_64', [
          {
            name: 'jreleaser-standalone-1.23.0-linux-x86_64.zip',
            browser_download_url: 'https://example.test/archive',
          },
          {
            name: 'checksums_sha256.txt.asc',
            browser_download_url: 'https://example.test/checksum-signature',
          },
        ]),
      /JReleaser checksum asset not found: checksums_sha256\.txt/,
    );
  });

  it('verifies a downloaded archive against checksums_sha256.txt', async t => {
    const downloadedFile = createTempFile(t, 'valid archive contents');

    await verifyJReleaserReleaseChecksum(
      {
        version: '1.23.0',
        platform: 'linux-x86_64',
        name: 'jreleaser-standalone-1.23.0-linux-x86_64',
        releaseUrl: 'https://example.test/archive',
        checksumUrl: 'https://example.test/checksum',
      },
      downloadedFile,
      `${sha256('valid archive contents')}  jreleaser-standalone-1.23.0-linux-x86_64.zip\n`,
    );
  });

  it('honors proxy exclusions when downloading release checksums', { timeout: 10000 }, async t => {
    const downloadedFile = createTempFile(t, 'archive contents');
    const archiveName = 'jreleaser-standalone-1.26.0-linux-x86_64';
    const checksum = `${sha256('archive contents')}  ${archiveName}.zip\n`;
    let directRequests = 0;
    let proxyRequests = 0;
    const direct = createServer((_req, res) => {
      directRequests++;
      res.end(checksum);
    });
    const proxy = createServer((_req, res) => {
      proxyRequests++;
      res.end(checksum);
    });
    const keys = ['HTTP_PROXY', 'http_proxy', 'NO_PROXY', 'no_proxy'];
    const saved = keys.map(key => process.env[key]);
    const listen = (server: Server): Promise<number> =>
      new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
      });
    try {
      const port = await listen(direct);
      const proxyPort = await listen(proxy);
      process.env.HTTP_PROXY = process.env.http_proxy = `http://127.0.0.1:${proxyPort}`;
      const release = {
        version: '1.26.0',
        platform: 'linux-x86_64' as const,
        name: archiveName,
        releaseUrl: 'https://example.test/archive',
        checksumUrl: `http://127.0.0.1:${port}/checksums_sha256.txt`,
      };
      // CIDR and /32 exclusions must keep checksum traffic off the proxy.
      // Exact-host exclusions and a nonmatching range cover normal proxy behavior.
      for (const exclusion of ['127.0.0.0/8', '127.0.0.1/32', '127.0.0.1']) {
        process.env.NO_PROXY = process.env.no_proxy = exclusion;
        await verifyJReleaserReleaseChecksum(release, downloadedFile);
      }
      assert.equal(directRequests, 3);
      assert.equal(proxyRequests, 0);
      process.env.NO_PROXY = process.env.no_proxy = '192.0.2.0/24';
      await verifyJReleaserReleaseChecksum(release, downloadedFile);
      assert.equal(directRequests, 3);
      assert.equal(proxyRequests, 1);
    } finally {
      keys.forEach((key, i) => {
        if (saved[i] === undefined) delete process.env[key];
        else process.env[key] = saved[i];
      });
      await Promise.all([direct, proxy].map(server => new Promise<void>(resolve => server.close(() => resolve()))));
    }
  });

  it('fails checksum verification when the archive hash differs', async t => {
    const downloadedFile = createTempFile(t, 'corrupted archive contents');

    await assert.rejects(
      () =>
        verifyJReleaserReleaseChecksum(
          {
            version: '1.23.0',
            platform: 'linux-x86_64',
            name: 'jreleaser-standalone-1.23.0-linux-x86_64',
            releaseUrl: 'https://example.test/archive',
            checksumUrl: 'https://example.test/checksum',
          },
          downloadedFile,
          `${sha256('valid archive contents')}  jreleaser-standalone-1.23.0-linux-x86_64.zip\n`,
        ),
      /Checksum mismatch for jreleaser-standalone-1\.23\.0-linux-x86_64\.zip/,
    );
  });

  it('fails checksum verification when the archive entry is absent', async t => {
    const downloadedFile = createTempFile(t, 'valid archive contents');

    await assert.rejects(
      () =>
        verifyJReleaserReleaseChecksum(
          {
            version: '1.23.0',
            platform: 'linux-x86_64',
            name: 'jreleaser-standalone-1.23.0-linux-x86_64',
            releaseUrl: 'https://example.test/archive',
            checksumUrl: 'https://example.test/checksum',
          },
          downloadedFile,
          `${sha256('valid archive contents')}  jreleaser-standalone-1.23.0-osx-aarch64.zip\n`,
        ),
      /Checksum entry not found for jreleaser-standalone-1\.23\.0-linux-x86_64\.zip/,
    );
  });
});
