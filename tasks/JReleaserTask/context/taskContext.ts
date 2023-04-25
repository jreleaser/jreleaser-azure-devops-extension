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

  get selectPlatform() {
    return this.getInput('selectPlatform')?.split(',') || undefined;
  }

  get rejectPlatform() {
    return this.getInput('rejectPlatform')?.split(',') || undefined;
  }

  get dryRun() {
    return this.getBoolInput('dryRun');
  }

  get arguments() {
    return this.getInput('arguments');
  }

  // Init Arguments
  get initFormat() {
    return this.getInput('initFormat');
  }

  get initOverwrite() {
    return this.getBoolInput('initOverwrite');
  }

  // Config Arguments
  get configType() {
    return this.getInput('configType');
  }

  get configFull() {
    return this.getBoolInput('configFull');
  }

  // Template Eval Arguments
  get templateEvalTargetDirectory() {
    return this.getInput('templateEvalTargetDirectory');
  }

  get templateEvalOverwrite() {
    return this.getBoolInput('templateEvalOverwrite');
  }

  get templateEvalInputType() {
    return this.getInput('templateEvalInputType');
  }

  get templateEvalInput() {
    return this.getInput('templateEvalInput');
  }

  get templateEvalInputFile() {
    return this.getInput('templateEvalInputFile');
  }
  
  get templateEvalType() {
    return this.getInput('templateEvalType');
  }
}
