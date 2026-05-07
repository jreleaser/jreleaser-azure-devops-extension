import { CommandResponse, CommandStatus } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { AbstractLoggingCommand } from './abstractLoggingCommand';

export class JReleaserTemplateGenerate extends AbstractLoggingCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.setCommand(['template', 'generate']);
    if (ctx.distribution && ctx.distribution !== '') {
      this.addOption('--distribution');
      this.addOption(ctx.distribution);
    }
    if (ctx.packager && ctx.packager !== '') {
      this.addOption('--packager');
      this.addOption(ctx.packager);
    }
  }

  exec(): Promise<CommandResponse> {
    this.setupToolRunnerArguments(this.toolrunner);

    const runnerResult = this.toolrunner.execSync();
    if (runnerResult.code === 0) {
      return Promise.resolve(new CommandResponse(CommandStatus.Success, 'JReleaser template generated successfully'));
    } else {
      return Promise.reject(
        new CommandResponse(CommandStatus.Failed, `Failed to initialize JReleaser. Exit code: ${runnerResult.code}`),
      );
    }
  }
}
