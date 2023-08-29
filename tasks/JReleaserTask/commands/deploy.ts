import { CommandResponse, CommandStatus } from '.';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { ITaskContext } from '../context';
import { AbstractModelCommand } from './abstractModelCommand';

export class JReleaserDeploy extends AbstractModelCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.setCommand('deploy');
    if (ctx.dryRun) {
      this.addOption('--dry-run');
    }
  }

  exec(): Promise<CommandResponse> {
    this.setupToolRunnerArguments(this.toolrunner);

    const runnerResult = this.toolrunner.execSync();
    if (runnerResult.code === 0) {
      return Promise.resolve(new CommandResponse(CommandStatus.Success, 'JReleaser deployed successfully'));
    } else {
      return Promise.reject(
        new CommandResponse(CommandStatus.Failed, `Failed to initialize JReleaser. Exit code: ${runnerResult.code}`),
      );
    }
  }
}
