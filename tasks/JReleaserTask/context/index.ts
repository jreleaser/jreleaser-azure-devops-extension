export interface ITaskContext {
  command: string;
  baseDirectory: string;
  logLevel: string;
  customArguments: string;

  configFile: String;
  strict: boolean; 
  gitRootSearch: boolean;

  selectCurrentPlatform: boolean;
  selectPlatform: string[];
  rejectPlatform: string[];
  dryRun: boolean;

  initFormat: string;
  initOverwrite: boolean;

  configType: string;
  configFull: boolean;
  
  templateEvalTargetDirectory: string;
  templateEvalOverwrite: boolean;
  templateEvalInputType: string;
  templateEvalInput: string;
  templateEvalType: string;

}

export { default as TaskContext } from './taskContext';
