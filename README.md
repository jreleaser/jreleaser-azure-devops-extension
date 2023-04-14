# JReleaser Azure Pipelines Extension

> This Extension still in development.  

Build: ![Build Status](https://dev.azure.com/shblue21/jreleaser-azure-devops-extension/_apis/build/status/Build)

## Overview
The tasks in this extension allow for running JReleaser commands from Azure Pipelines.  

## Usage  
### Suppoted JReleaser Commands
The following commands are supported:  

* `custom`
* `jreleaser:env`
* `jreleaser:init`
* `jreleaser:config`
* `jreleaser:template`
* `jreleaser:template eval`
* `jreleaser:download`
* `jreleaser:assemble`
* `jreleaser:changelog`
* `jreleaser:catalog`
* `jreleaser:checksum`
* `jreleaser:sign`
* `jreleaser:deploy`
* `jreleaser:upload`
* `jreleaser:release`
* `jreleaser:prepare`
* `jreleaser:package`
* `jreleaser:announce`
* `jreleaser:full-release`

### Install the JReleaser for Azure Pipelines
Before running the JReleaser task, you can run the JReleaser Installer task to download JReleaser.

```yaml
- task: JReleaserInstaller@0
  inputs:
    version: 'latest'
```

### Run JReleaser Tasks
The JReleaser task can be used to run any JReleaser command.  

#### Run JReleaser Commands
The following example shows how to run the `init` command.  

```yaml
- task: JReleaserExecuter@0
  inputs:
    command: 'release'
    customArguments: '--prerelease'
    logLevel: 'quiet'
```
  
#### Run Custom JReleaser Commands
if you want to run a custom JReleaser command, you can use the `custom` command.  

```yaml
- task: JReleaser@0
  inputs:
    command: 'custom'
    customArguments: '-D=jreleaser.github.token=1234'
    logLevel: 'info'
```