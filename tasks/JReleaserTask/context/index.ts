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

  configAssembly: boolean;
  configAnnounce: boolean;
  configChangelog: boolean;
  configDownload: boolean;
  configFull: boolean;
}

export { default as TaskContext } from './taskContext';
