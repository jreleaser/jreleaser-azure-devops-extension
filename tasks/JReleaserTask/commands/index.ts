import { ITaskContext } from '../context';

export interface ICommand {
  initialize(ctx: ITaskContext): void;
  exec(): Promise<CommandResponse>;
  options: string[];
}
export class CommandResponse {
  constructor(public readonly status: CommandStatus, public readonly message?: string) {}
}

export enum CommandStatus {
  Success = 0,
  Failed = 1,
}

export { JReleaserInit as JReleaserInitHandler } from './init';
export { JReleaserConfig as JReleaserConfigHandler } from './config';
export { JReleaserCustom as JReleaserCustomHandler } from './custom';
export { JReleaserAnnounce as JReleaserAnnounceHandler } from './announce';
export { JReleaserRelease as JReleaserReleaseHandler } from './release';
export { JReleaserAssemble as JReleaserAssembleHandler } from './assemble';
export { JReleaserCatalog as JReleaserCatalogHandler } from './catalog';
export { JReleaserChangelog as JReleaserChangelogHandler } from './changelog';
export { JReleaserChecksum as JReleaserChecksumHandler } from './checksum';
export { JReleaserDeploy as JReleaserDeployHandler } from './deploy';
export { JReleaserDownload as JReleaserDownloadHandler } from './download';
export { JReleaserEnv as JReleaserEnvHandler } from './env';
export { JReleaserFullRelease as JReleaserFullReleaseHandler } from './fullRelease';
export { JReleaserJsonSchema as JReleaserJsonSchemaHandler } from './jsonSchema';
export { JReleaserPackage as JReleaserPackageHandler } from './package';
export { JReleaserPrepare as JReleaserPrepareHandler } from './prepare';
export { JReleaserPublish as JReleaserPublishHandler } from './publish';
export { JReleaserSign as JReleaserSignHandler } from './sign';
export { JReleaserTemplateGenerate as JReleaserTemplateGenerateHandler } from './templateGenerate';
export { JReleaserTemplateEval as JReleaserTemplateEvalHandler } from './templateEval';
export { JReleaserUpload as JReleaserUploadHandler } from './upload';
