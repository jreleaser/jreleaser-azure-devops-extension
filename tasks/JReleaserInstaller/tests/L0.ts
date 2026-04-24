import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import { getJReleaserRelease, verifyJReleaserReleaseChecksum } from '../utils';

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
