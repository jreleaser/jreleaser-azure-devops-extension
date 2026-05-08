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
  templateInputType: string;
  templateEvalInput: string;
  templateEvalType: string;

  // Template Generate Arguments
  templateGenerateType: string;
  templateGenerateAnnouncer: string;
  templateGenerateAssemblerType: string;
  templateGenerateAssemblerName: string;
  templateGenerateDistribution: string;
  templateGeneratePackager: string;
  templateGenerateDistributionType: string;
  templateGenerateOverwrite: boolean;
  templateGenerateSnapshot: boolean;
  templateGenerateOutputDirectory: string;
}

export { default as TaskContext } from './taskContext';
