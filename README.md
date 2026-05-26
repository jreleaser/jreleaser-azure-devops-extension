# JReleaser Azure Pipelines Extension

Build: ![Build Status](https://dev.azure.com/JReleaser/jreleaser-azure-devops-extension/_apis/build/status/Build)

## Overview

This extension provides Azure Pipelines tasks for installing and running
[JReleaser](https://jreleaser.org/guide/latest/index.html).

JReleaser automates releases, checksums, signatures, changelogs, package descriptors, and published artifacts for
projects written in Java, Node, Rust, Go, Python, C/C++, C#, and other languages.

## Prerequisites

- A `jreleaser.yml`, `jreleaser.toml`, or `jreleaser.json` configuration file in your repository.
- Azure Pipeline secret variables for credentials such as `JRELEASER_GITHUB_TOKEN`.

`JReleaserInstaller@0` installs the standalone JReleaser distribution, which includes its own Java runtime.

## Quick Start

Start with a dry run to validate your configuration before performing remote release, upload, deploy, publish, or
announce operations.

```yaml
steps:
- task: JReleaserInstaller@0
  inputs:
    version: '1.23.0'

- task: JReleaserInvoker@0
  inputs:
    command: 'fullRelease'
    configFile: '$(System.DefaultWorkingDirectory)/jreleaser.yml'
    dryRun: true
    logLevel: 'info'
```

## Run a Release

Remove `dryRun` after the release configuration has been validated. Pass credentials through `env`.

```yaml
steps:
- task: JReleaserInstaller@0
  inputs:
    version: '1.23.0'

- task: JReleaserInvoker@0
  env:
    JRELEASER_GITHUB_TOKEN: $(JRELEASER_GITHUB_TOKEN)
    JRELEASER_PROJECT_VERSION: $(Build.BuildNumber)
    JRELEASER_TAG_NAME: $(JRELEASER_TAG_NAME)
  inputs:
    command: 'fullRelease'
    configFile: '$(System.DefaultWorkingDirectory)/jreleaser.yml'
    logLevel: 'info'
```

## Pass Secrets Safely

Pass tokens and credentials through Azure Pipeline secret variables and the task `env` block. Do not put secrets in
`arguments` or `properties`, because command-line arguments can appear in logs.

```yaml
steps:
- task: JReleaserInvoker@0
  env:
    JRELEASER_GITHUB_TOKEN: $(JRELEASER_GITHUB_TOKEN)
    JRELEASER_GPG_PASSPHRASE: $(JRELEASER_GPG_PASSPHRASE)
  inputs:
    command: 'release'
    configFile: '$(System.DefaultWorkingDirectory)/jreleaser.yml'
```

## Pass Additional Arguments

Use `arguments` for options that are not exposed as first-class task inputs.

```yaml
steps:
- task: JReleaserInvoker@0
  inputs:
    command: 'release'
    configFile: '$(System.DefaultWorkingDirectory)/jreleaser.yml'
    arguments: '--settings-file "$(System.DefaultWorkingDirectory)/jreleaser.properties"'
    logLevel: 'info'
```

For a fully custom command, include the JReleaser command name in `arguments`.

```yaml
steps:
- task: JReleaserInvoker@0
  inputs:
    command: 'custom'
    arguments: 'env --settings-file "$(System.DefaultWorkingDirectory)/jreleaser.properties"'
```

## Use Output Properties

Enable `exportOutputProperties` to export values from `out/jreleaser/output.properties` as Azure Pipelines output
variables after a successful command. Property keys are normalized and prefixed with `JRELEASER_`, for example
`project.version` becomes `JRELEASER_PROJECT_VERSION`.

The task logs exported variable names only. Azure Pipelines output variables are still set through the standard
`task.setvariable` command, so the variable value is passed to Azure Pipelines as part of that command. Do not use this
for sensitive values; keys that look secret-like are skipped automatically.

`exportOutputProperties` is not supported with the `custom` command because custom arguments can choose a different base
directory. The task logs a warning and skips export in that case.

```yaml
steps:
- task: JReleaserInvoker@0
  name: jreleaser
  inputs:
    command: 'fullRelease'
    configFile: '$(System.DefaultWorkingDirectory)/jreleaser.yml'
    exportOutputProperties: true

- script: echo "$(jreleaser.JRELEASER_PROJECT_VERSION)"
```

For a downstream job, map the output through `dependencies`:

```yaml
jobs:
- job: release
  steps:
  - task: JReleaserInvoker@0
    name: jreleaser
    inputs:
      command: 'fullRelease'
      configFile: '$(System.DefaultWorkingDirectory)/jreleaser.yml'
      exportOutputProperties: true

- job: notify
  dependsOn: release
  variables:
    jreleaserVersion: $[ dependencies.release.outputs['jreleaser.JRELEASER_PROJECT_VERSION'] ]
  steps:
  - script: echo "$(jreleaserVersion)"
```

## Tasks

### JReleaser Installer

`JReleaserInstaller@0` downloads a JReleaser distribution from the official JReleaser GitHub releases. On a cache miss,
it verifies the downloaded archive checksum, caches the archive in the Azure Pipelines tool cache, and adds `jreleaser`
to `PATH`.

```yaml
steps:
- task: JReleaserInstaller@0
  inputs:
    version: 'latest'
```

Pin a specific JReleaser version for repeatable builds:

```yaml
steps:
- task: JReleaserInstaller@0
  inputs:
    version: '1.23.0'
```

### JReleaser Invoker

`JReleaserInvoker@0` runs a JReleaser command. Use it after `JReleaserInstaller@0` or after another step has made
`jreleaser` available on `PATH`.

Common inputs:

| Input | Description |
| --- | --- |
| `command` | JReleaser command to run. |
| `configFile` | Path to the JReleaser configuration file. |
| `dryRun` | Skip remote operations for supported commands. |
| `exportOutputProperties` | Export `out/jreleaser/output.properties` as Azure Pipelines output variables. |
| `arguments` | Extra command-line arguments passed to JReleaser. |
| `logLevel` | One of `debug`, `info`, `warn`, or `quiet`. |

## Supported Commands

Use these values in the `command` input.

| Input value | JReleaser command |
| --- | --- |
| `announce` | `jreleaser announce` |
| `assemble` | `jreleaser assemble` |
| `catalog` | `jreleaser catalog` |
| `changelog` | `jreleaser changelog` |
| `checksum` | `jreleaser checksum` |
| `config` | `jreleaser config` |
| `custom` | Arguments are passed directly to `jreleaser` |
| `deploy` | `jreleaser deploy` |
| `download` | `jreleaser download` |
| `env` | `jreleaser env` |
| `fullRelease` | `jreleaser full-release` |
| `init` | `jreleaser init` |
| `jsonSchema` | `jreleaser json-schema` |
| `package` | `jreleaser package` |
| `prepare` | `jreleaser prepare` |
| `publish` | `jreleaser publish` |
| `release` | `jreleaser release` |
| `sign` | `jreleaser sign` |
| `templateEval` | `jreleaser template eval` |
| `templateGenerate` | `jreleaser template generate` |
| `upload` | `jreleaser upload` |

## Roadmap

Possible future improvements:

- Additional common CLI inputs such as `settingsFile`, `outputDirectory`, `reproducible`, and `yolo`.
- A single task that installs and runs JReleaser in one step.
