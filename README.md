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
- Export `out/jreleaser/output.properties` as Azure Pipelines output variables.
- A single task that installs and runs JReleaser in one step.
