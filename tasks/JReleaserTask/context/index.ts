export interface ITaskContext {
  command: string;
  baseDirectory: string;
  logLevel: string;
  customArguments: string;

  gitRootSearch: boolean;
  strict: boolean;
  // configFile: string;
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
