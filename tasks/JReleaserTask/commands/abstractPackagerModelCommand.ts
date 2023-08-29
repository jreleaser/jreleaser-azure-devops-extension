import { ITaskContext } from '../context';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export abstract class AbstractPackagerModelCommand extends AbstractPlatformAwareModelCommand {
  override initialize(ctx: ITaskContext): void {
    super.initialize(ctx);
    this.setupCommandOptions(ctx, {
      distribution: '--distribution',
      packager: '--packager',
      excludeDistribution: '--exclude-distribution',
      excludePackager: '--exclude-packager',
    });
  }
}
