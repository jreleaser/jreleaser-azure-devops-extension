import { ITaskContext } from '.';
import * as tasks from 'azure-pipelines-task-lib/task';

export default class TaskContext implements ITaskContext {
  private getInput: (name: string, required?: boolean | undefined) => string;
  private getBoolInput: (
    name: string,
    required?: boolean | undefined,
  ) => boolean;

  public getVariable: (name: string) => string | undefined;
  public setVariable: (
    name: string,
    val: string,
    secret?: boolean | undefined,
  ) => void;

  constructor() {
    this.getInput = <(name: string, required?: boolean | undefined) => string>(
      tasks.getInput
    );
    this.getBoolInput = tasks.getBoolInput;
    this.getVariable = tasks.getVariable;
    this.setVariable = tasks.setVariable;
  }

  get command() {
    return this.getInput('command');
  }

  get configFile() {
    return this.getInput('configFile');
  }

  // Advanced Arguments
  get baseDirectory() {
    return this.getInput('baseDirectory');
  }

  get logLevel() {
    return this.getInput('logLevel');
  }

  get gitRootSearch() {
    return this.getBoolInput('gitRootSearch');
  }

  get strict() {
    return this.getBoolInput('strict');
  }

  get selectCurrentPlatform() {
    return this.getBoolInput('selectCurrentPlatform');
  }

  get selectPlatforms() {
    return this.getInput('selectPlatforms').split(',');
  }

  get rejectPlatforms() {
    return this.getInput('rejectPlatforms').split(',');
  }

  get dryRun() {
    return this.getBoolInput('dryRun');
  }

  get customArguments() {
    return this.getInput('customArguments');
  }

  // Init Arguments
  get initFormat() {
    return this.getInput('initFormat');
  }

  get initOverwrite() {
    return this.getBoolInput('initOverwrite');
  }

  // Config Arguments
  get configAssembly() {
    return this.getBoolInput('configAssembly');
  }

  get configAnnounce() {
    return this.getBoolInput('configAnnounce');
  }

  get configChangelog() {
    return this.getBoolInput('configChangelog');
  }

  get configDownload() {
    return this.getBoolInput('configDownload');
  }

  get configFull() {
    return this.getBoolInput('configFull');
  }
}
