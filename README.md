# JReleaser Azure Pipelines Extension

> This Extension still in development.  

Build: ![Build Status](https://dev.azure.com/JReleaser/jreleaser-azure-devops-extension/_apis/build/status/Build)

## Overview
The tasks in this extension allow for running JReleaser commands from Azure Pipelines.  

## What is JReleaser?  
[JReleaser](https://jreleaser.org/guide/latest/index.html) is a release automation tool. Its goal is to simplify creating releases and publishing artifacts to multiple package managers while providing customizable options.  

supports any kind of project regardless of its source language (Java, Node, Rust, Perl, Python, C/C++, C#, Elixir, Haskell, etc)

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
## Use the latest version of JReleaser
- task: JReleaserInstaller@0
  inputs:
    version: 'latest'

## Use the specific version of JReleaser
- task: JReleaserInstaller@0
  inputs:
    version: '1.7.0'
```

### Run JReleaser Tasks
The JReleaser task can be used to run any JReleaser command.  

#### Run JReleaser Commands
The following example shows how to run the `init` command.  

```yaml
- task: JReleaserInvoker@0
  inputs:
    command: 'release'
    customArguments: '--prerelease'
    logLevel: 'quiet'
```
  
#### Run Custom JReleaser Commands
if you want to run a custom JReleaser command, you can use the `custom` command.  

```yaml
- task: JReleaserInvoker@0
  inputs:
    command: 'custom'
    arguments: '-D=jreleaser.github.token=1234'
    logLevel: 'info'
```

### Example
In the Azure pipeline project below URL, you can see the example of using the JReleaser for Azure Pipelines.  
Example: https://dev.azure.com/jreleaser/jreleaser-azure-devops-extension-example/_build  

or this repository also uses the JReleaser for Azure Pipelines in `azure-pipelines-release-github.yml`

``` yaml
### JReleaser for Azure Pipelines Example
- task: JReleaserInstaller@0
  inputs:
    version: '1.5.1'

- task: JReleaserInvoker@0
  env:
    JRELEASER_GITHUB_TOKEN: $(JRELEASER_GITHUB_TOKEN)
    JRELEASER_PROJECT_VERSION:  ${{ parameters.version}}
    JRELEASER_TAG_NAME: ${{ parameters.version}}
  inputs:
    command: 'release'    
```