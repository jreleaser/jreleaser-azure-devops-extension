import { ITaskContext } from '../context';
import { AbstractLoggingCommand } from './abstractLoggingCommand';

export abstract class AbstractModelCommand extends AbstractLoggingCommand {
  setup(ctx: ITaskContext): void {
    super.setup(ctx);
    if (ctx.gitRootSearch) {
      this.options.push('--git-root-search');
    }
    if (ctx.strict) {
      this.options.push('--strict');
    }
  }
}
