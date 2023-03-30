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

  setup(ctx: ITaskContext): void {
    super.setup(ctx);
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
    this.options.push(this.logOption);

    if (ctx.baseDirectory) {
      process.env['JRELEASER_BASEDIR'] = ctx.baseDirectory;
    }
  }
}
