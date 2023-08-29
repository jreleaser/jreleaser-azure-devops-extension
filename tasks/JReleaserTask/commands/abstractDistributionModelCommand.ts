import { ITaskContext } from '../context';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export abstract class AbstractDistributionModelCommand extends AbstractPlatformAwareModelCommand {
  override initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
    this.setupCommandOptions(ctx, {
      distribution: '--distribution',
      excludeDistribution: '--exclude-distribution',
    });
  }
}
