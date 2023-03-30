import { ITaskContext } from '../context';
import { AbstractModelCommand } from './abstractModelCommand';

export abstract class AbstractPlatformAwareModelCommand extends AbstractModelCommand {
  setup(ctx: ITaskContext): void {
    super.setup(ctx);
  }
}
