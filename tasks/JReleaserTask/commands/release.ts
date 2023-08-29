import { CommandResponse, CommandStatus } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export class JReleaserRelease extends AbstractPlatformAwareModelCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.setCommand('release');
    if (ctx.distribution && ctx.distribution !== '') {
      this.addOption('--distribution');
      this.addOption(ctx.distribution);
    }
    if (ctx.excludeDistribution && ctx.excludeDistribution !== '') {
      this.addOption('--exclude-distribution');
      this.addOption(ctx.excludeDistribution);
    }
    if (ctx.dryRun) {
      this.options.push('--dry-run');
    }
  }

  exec(): Promise<CommandResponse> {
    this.setupToolRunnerArguments(this.toolrunner);

    const runnerResult = this.toolrunner.execSync();
    if (runnerResult.code === 0) {
      return Promise.resolve(new CommandResponse(CommandStatus.Success, 'JReleaser release successfully'));
    } else {
      return Promise.reject(
        new CommandResponse(CommandStatus.Failed, `Failed to initialize JReleaser. Exit code: ${runnerResult.code}`),
      );
    }
  }
}
