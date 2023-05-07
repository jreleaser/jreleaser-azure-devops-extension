import { CommandResponse } from '.';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import * as tasks from 'azure-pipelines-task-lib/task';
import { ITaskContext } from '../context';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export class JReleaserFullRelease extends AbstractPlatformAwareModelCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.options.unshift('full-release');
    if (ctx.distribution && ctx.distribution !== '') {
      this.options.push('--distribution');
      this.options.push(ctx.distribution);
    }
    if (ctx.excludeDistribution && ctx.excludeDistribution !== '') {
      this.options.push('--exclude-distribution');
      this.options.push(ctx.excludeDistribution);
    }
    if (ctx.packager && ctx.packager !== '') {
      this.options.push('--packager');
      this.options.push(ctx.packager);
    }
    if (ctx.excludePackager && ctx.excludePackager !== '') {
      this.options.push('--exclude-packager');
      this.options.push(ctx.excludePackager);
    }
    if (ctx.dryRun) {
      this.options.push('--dry-run');
    }
  }

  exec(): Promise<CommandResponse> {
    for (const option of this.options) {
      this.toolrunner.arg(option);
    }
    tasks.debug(`Running JReleaser with options: ${this.options.join(' ')}`);

    const runnerResult = this.toolrunner.execSync();
    if (runnerResult.code === 0) {
      return Promise.resolve(new CommandResponse(0));
    } else {
      return Promise.reject(
        new CommandResponse(
          1,
          `Failed to initialize JReleaser. Exit code: ${runnerResult.code}`,
        ),
      );
    }
  }
}
