import { ITaskContext } from '../context';
import { AbstractCommand } from './abstractCommand';

export abstract class AbstractLoggingCommand extends AbstractCommand {
  private _logOption: string;
  protected get logOption(): string {
    return this._logOption;
  }
  protected set logOption(value: string) {
    this._logOption = value;
  }

  public initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
    this.setupLogOption(ctx);
    this.options.push(this.logOption);
    this.setupBaseDirectory(ctx);
  }

  private setupLogOption(ctx: ITaskContext): void {
    switch (ctx.logLevel) {
      case 'debug':
        this.logOption = '--debug';
        break;
      case 'info':
        this.logOption = '--info';
        break;
      case 'warn':
        this.logOption = '--warn';
        break;
      case 'quiet':
        this.logOption = '--quiet';
        break;
      default:
    }
  }

  private setupBaseDirectory(ctx: ITaskContext): void {
    if (ctx.baseDirectory) {
      process.env['JRELEASER_BASEDIR'] = ctx.baseDirectory;
    }
  }
}
