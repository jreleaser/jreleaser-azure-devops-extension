import { ITaskContext } from '../context';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export abstract class AbstractPackagerModelCommand extends AbstractPlatformAwareModelCommand {
  public initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
  }
}
