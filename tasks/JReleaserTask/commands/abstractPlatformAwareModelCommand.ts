import { ITaskContext } from '../context';
import { AbstractModelCommand } from './abstractModelCommand';

export abstract class AbstractPlatformAwareModelCommand extends AbstractModelCommand {
  override initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
    this.setupCommandOptions(ctx, {
      selectCurrentPlatform: '--select-current-platform',
      selectPlatform: '--select-platform',
      rejectPlatform: '--reject-platform',
    });
  }
}
