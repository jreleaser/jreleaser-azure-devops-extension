import { CommandResponse, CommandStatus } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { AbstractLoggingCommand } from './abstractLoggingCommand';

export class JReleaserInit extends AbstractLoggingCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.setCommand('init');
    if (ctx.initOverwrite) {
      this.addOption('-o');
    }
    if (ctx.initFormat) {
      this.addOption('-f');
      this.addOption(ctx.initFormat);
    }
  }

  exec(): Promise<CommandResponse> {
    this.setupToolRunnerArguments(this.toolrunner);

    const runnerResult = this.toolrunner.execSync();
    if (runnerResult.code === 0) {
      return Promise.resolve(new CommandResponse(CommandStatus.Success, 'JReleaser initialized successfully'));
    } else {
      return Promise.reject(
        new CommandResponse(CommandStatus.Failed, `Failed to initialize JReleaser. Exit code: ${runnerResult.code}`),
      );
    }
  }
}
