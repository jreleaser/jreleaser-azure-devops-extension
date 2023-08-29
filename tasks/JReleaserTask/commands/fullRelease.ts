import { CommandResponse, CommandStatus } from '.';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { ITaskContext } from '../context';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export class JReleaserFullRelease extends AbstractPlatformAwareModelCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.setCommand('full-release');
    if (ctx.distribution && ctx.distribution !== '') {
      this.addOption('--distribution');
      this.addOption(ctx.distribution);
    }
    if (ctx.excludeDistribution && ctx.excludeDistribution !== '') {
      this.addOption('--exclude-distribution');
      this.addOption(ctx.excludeDistribution);
    }
    if (ctx.packager && ctx.packager !== '') {
      this.addOption('--packager');
      this.addOption(ctx.packager);
    }
    if (ctx.excludePackager && ctx.excludePackager !== '') {
      this.addOption('--exclude-packager');
      this.addOption(ctx.excludePackager);
    }
    if (ctx.dryRun) {
      this.addOption('--dry-run');
    }
  }

  exec(): Promise<CommandResponse> {
    this.setupToolRunnerArguments(this.toolrunner);

    const runnerResult = this.toolrunner.execSync();
    if (runnerResult.code === 0) {
      return Promise.resolve(new CommandResponse(CommandStatus.Success, 'JReleaser full-release successfully'));
    } else {
      return Promise.reject(
        new CommandResponse(CommandStatus.Failed, `Failed to initialize JReleaser. Exit code: ${runnerResult.code}`),
      );
    }
  }
}
