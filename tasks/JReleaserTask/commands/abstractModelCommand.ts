import { ITaskContext } from '../context';
import { AbstractLoggingCommand } from './abstractLoggingCommand';

export abstract class AbstractModelCommand extends AbstractLoggingCommand {
  public initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
    this.buildOptions(ctx, {
      gitRootSearch: '--git-root-search',
      strict: '--strict',
      configFile: '--config-file ${configFile}',
    });
  }
}