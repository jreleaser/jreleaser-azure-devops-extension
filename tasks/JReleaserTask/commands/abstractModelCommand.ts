import { ITaskContext } from '../context';
import { AbstractLoggingCommand } from './abstractLoggingCommand';

export abstract class AbstractModelCommand extends AbstractLoggingCommand {
  override initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
    this.setupCommandOptions(ctx, {
      gitRootSearch: '--git-root-search',
      strict: '--strict',
      configFile: '--config-file',
      properties: '--set-property',
    });
  }
}
