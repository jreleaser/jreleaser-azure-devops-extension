import { ITaskContext } from '../context';
import { AbstractModelCommand } from './abstractModelCommand';

export abstract class AbstractPlatformAwareModelCommand extends AbstractModelCommand {
  public initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
    this.buildOptions(ctx, {
      selectCurrentPlatform: '--select-current-platform',
      selectPlatform: '--select-platform',
      rejectPlatform: '--reject-platform',
    });
  }
}
