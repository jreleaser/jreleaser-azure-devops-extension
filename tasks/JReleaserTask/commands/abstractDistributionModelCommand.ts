import { ITaskContext } from '../context';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export abstract class AbstractDistributionModelCommand extends AbstractPlatformAwareModelCommand {
  public initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
  }
}
