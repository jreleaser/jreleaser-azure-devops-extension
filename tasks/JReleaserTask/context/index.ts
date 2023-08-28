export interface ITaskContext {
  command: string;
  baseDirectory: string;
  logLevel: string;
  arguments: string;
  dryRun: boolean;

  // AbstractModelCommand
  configFile: String;
  strict: boolean;
  gitRootSearch: boolean;
  properties: string;

  // AbstractPlatformAwareModelCommand
  selectCurrentPlatform: boolean;
  selectPlatform: string;
  rejectPlatform: string;

  // AbstractPackagerModelCommand
  distribution: string;
  packager: string;
  excludeDistribution: string;
  excludePackager: string;

  // Init Arguments
  initFormat: string;
  initOverwrite: boolean;

  // Config Arguments
  configType: string;
  configFull: boolean;

  // Template Eval Arguments
  templateEvalTargetDirectory: string;
  templateEvalOverwrite: boolean;
  templateEvalInputType: string;
  templateEvalInput: string;
  templateEvalType: string;
}

export { default as TaskContext } from './taskContext';
