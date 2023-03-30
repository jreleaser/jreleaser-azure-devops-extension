import { ITaskContext } from '../context';

export interface ICommand {
  setup(ctx: ITaskContext): void;
  exec(): Promise<CommandResponse>;
}
export class CommandResponse {
  constructor(
    public readonly status: CommandStatus,
    public readonly message?: string,
  ) {}
}

export enum CommandStatus {
  Success = 0,
  Failed = 1,
}

export { JReleaserInit as JReleaserInitHandler } from './init';
export { JReleaserConfig as JReleaserConfigHandler } from './config';
export { JReleaserCustom as JReleaserCustomHandler } from './custom';
export { JReleaserAnnounce as JReleaserAnnounceHandler } from './announce';
