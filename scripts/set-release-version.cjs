#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const extensionVersion = process.argv[2] || process.env.EXTENSION_VERSION;

// Checked-in manifests use 0.0.0 as a baseline; release tags provide the packaged version.
if (!extensionVersion) {
  throw new Error('Usage: node scripts/set-release-version.cjs <version>');
}

const normalizedExtensionVersion = extensionVersion.replace(/^v/, '');
const taskVersionMatch = normalizedExtensionVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);

if (!taskVersionMatch) {
  throw new Error(`Invalid extension version: ${extensionVersion}`);
}

const taskVersion = {
  Major: taskVersionMatch[1],
  Minor: taskVersionMatch[2],
  Patch: taskVersionMatch[3],
};

function updateJson(file, updater) {
  const filePath = path.join(rootDir, file);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  updater(json);
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

updateJson('jreleaser-azure-devops-extension.json', manifest => {
  manifest.version = normalizedExtensionVersion;
});

for (const taskJson of ['tasks/JReleaserInstaller/task.json', 'tasks/JReleaserTask/task.json']) {
  updateJson(taskJson, task => {
    task.version = { ...task.version, ...taskVersion };
  });
}

console.log(`Updated extension manifest to ${normalizedExtensionVersion}`);
console.log(`Updated task versions to ${taskVersion.Major}.${taskVersion.Minor}.${taskVersion.Patch}`);
