import { ITaskContext } from '../context';
import { AbstractCommand } from './abstractCommand';

export abstract class AbstractLoggingCommand extends AbstractCommand {
  override initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
    this.setupLogOption(ctx);
    this.setupBaseDirectory(ctx);
  }

  private setupLogOption(ctx: ITaskContext): void {
    switch (ctx.logLevel) {
      case 'debug':
        this.addOption('--debug');
        break;
      case 'info':
        this.addOption('--info');
        break;
      case 'warn':
        this.addOption('--warn');
        break;
      case 'quiet':
        this.addOption('--quiet');
        break;
    }
  }

  private setupBaseDirectory(ctx: ITaskContext): void {
    if (ctx.baseDirectory) {
      process.env['JRELEASER_BASEDIR'] = ctx.baseDirectory;
    }
  }
}
