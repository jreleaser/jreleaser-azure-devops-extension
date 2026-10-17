import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execFileSync } from 'node:child_process';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import {
  downloadJReleaserRelease,
  getJReleaserRelease,
  isMuslLinux,
  resolvePlatform,
  verifyJReleaserReleaseChecksum,
} from '../utils';

function createTempFile(contents: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jreleaser-installer-'));
  const filePath = path.join(tempDir, 'downloaded-release');
  fs.writeFileSync(filePath, contents);
  return filePath;
}

function sha256(contents: string): string {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

describe('JReleaserInstaller utility suite', () => {
  it('reads task input after loading tool-lib', () => {
    const stdout = execFileSync(
      process.execPath,
      [
        '-e',
        `
          try {
            require('azure-pipelines-tool-lib/tool');
            const task = require('azure-pipelines-task-lib/task');
            require('node:assert/strict').equal(task.getInput('version', true), '1.25.0');
            console.log('JRELEASER_INPUT_VERIFIED');
          } catch (error) {
            // task-lib's uncaught exception handler can report failure but exit with code 0.
            console.error(error);
            process.exitCode = 1;
          }
        `,
      ],
      {
        cwd: path.resolve(__dirname, '..', '..'),
        env: { ...process.env, INPUT_VERSION: '1.25.0' },
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    assert.match(stdout, /^JRELEASER_INPUT_VERIFIED$/m);
    assert.doesNotMatch(stdout, /##vso\[task\.complete result=Failed[;\]]/);
  });

  it('detects musl only when glibc is not reported and the musl loader exists for the current arch', () => {
    const existsSync = (filePath: fs.PathLike): boolean => filePath === '/lib/ld-musl-x86_64.so.1';

    assert.equal(
      isMuslLinux('x64', existsSync, () => ({ header: {} })),
      true,
    );
  });

  it('does not detect musl when Node reports glibc', () => {
    const existsSync = (filePath: fs.PathLike): boolean => filePath === '/lib/ld-musl-x86_64.so.1';

    assert.equal(
      isMuslLinux('x64', existsSync, () => ({ header: { glibcVersionRuntime: '2.35' } })),
      false,
    );
  });

  it('does not detect musl when the musl loader is absent', () => {
    assert.equal(
      isMuslLinux(
        'x64',
        () => false,
        () => ({ header: {} }),
      ),
      false,
    );
  });

  it('selects musl Linux archives when the Linux agent uses musl libc', () => {
    assert.equal(resolvePlatform('linux', 'x64', true), 'linux_musl-x86_64');
    assert.equal(resolvePlatform('linux', 'arm64', true), 'linux_musl-aarch64');
  });

  it('keeps selecting glibc Linux archives when the Linux agent does not use musl libc', () => {
    assert.equal(resolvePlatform('linux', 'x64', false), 'linux-x86_64');
    assert.equal(resolvePlatform('linux', 'arm64', false), 'linux-aarch64');
  });

  it('selects the exact musl release archive asset', async () => {
    const release = await getJReleaserRelease('1.24.0', true, 'linux_musl-x86_64', [
      {
        name: 'jreleaser-standalone-1.24.0-linux-x86_64.zip',
        browser_download_url: 'https://example.test/glibc-archive',
      },
      {
        name: 'jreleaser-standalone-1.24.0-linux_musl-x86_64.zip',
        browser_download_url: 'https://example.test/musl-archive',
      },
      {
        name: 'checksums_sha256.txt',
        browser_download_url: 'https://example.test/checksum',
      },
    ]);

    assert.equal(release.name, 'jreleaser-standalone-1.24.0-linux_musl-x86_64');
    assert.equal(release.releaseUrl, 'https://example.test/musl-archive');
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

  it('selects the exact release archive asset and ignores the signature asset', async () => {
    const release = await getJReleaserRelease('1.23.0', true, 'linux-x86_64', [
      {
        name: 'jreleaser-standalone-1.23.0-linux-x86_64.zip.asc',
        browser_download_url: 'https://example.test/signature',
      },
      {
        name: 'jreleaser-standalone-1.23.0-linux-x86_64.zip',
        browser_download_url: 'https://example.test/archive',
      },
      {
        name: 'checksums_sha256.txt',
        browser_download_url: 'https://example.test/checksum',
      },
    ]);

    assert.equal(release.name, 'jreleaser-standalone-1.23.0-linux-x86_64');
    assert.equal(release.releaseUrl, 'https://example.test/archive');
  });

  it('selects the exact checksum asset and ignores the signature asset', async () => {
    const release = await getJReleaserRelease('1.23.0', true, 'linux-x86_64', [
      {
        name: 'jreleaser-standalone-1.23.0-linux-x86_64.zip',
        browser_download_url: 'https://example.test/archive',
      },
      {
        name: 'checksums_sha256.txt.asc',
        browser_download_url: 'https://example.test/checksum-signature',
      },
      {
        name: 'checksums_sha256.txt',
        browser_download_url: 'https://example.test/checksum',
      },
    ]);

    assert.equal(release.checksumUrl, 'https://example.test/checksum');
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

  it('verifies a downloaded archive against checksums_sha256.txt', async () => {
    const downloadedFile = createTempFile('valid archive contents');

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

  it('honors proxy exclusions when downloading release checksums', { timeout: 10000 }, async () => {
    const downloadedFile = createTempFile('archive contents');
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
    const listen = (server: Server): Promise<number> => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
    });
    try {
      const port = await listen(direct);
      const proxyPort = await listen(proxy);
      process.env.HTTP_PROXY = process.env.http_proxy = `http://127.0.0.1:${proxyPort}`;
      const release = {
        version: '1.26.0', platform: 'linux-x86_64' as const, name: archiveName,
        releaseUrl: 'https://example.test/archive', checksumUrl: `http://127.0.0.1:${port}/checksums_sha256.txt`,
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
      fs.rmSync(path.dirname(downloadedFile), { recursive: true });
    }
  });

  it('fails checksum verification when the archive hash differs', async () => {
    const downloadedFile = createTempFile('corrupted archive contents');

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

  it('fails checksum verification when the archive entry is absent', async () => {
    const downloadedFile = createTempFile('valid archive contents');

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

describe('JReleaserInstaller L0 Suite', () => {
  it('should install JReleaser successfully', { timeout: 10000 }, async () => {
    let tp = path.join(__dirname, 'L0InstallJReleaserSuccess.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true);
  });
});
