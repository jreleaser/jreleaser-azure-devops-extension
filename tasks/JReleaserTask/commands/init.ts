import { CommandResponse } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { AbstractLoggingCommand } from './abstractLoggingCommand';
import * as tasks from 'azure-pipelines-task-lib/task';

export class JReleaserInit extends AbstractLoggingCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.options.unshift('init');
    if (ctx.initOverwrite) {
      this.options.push('-o');
    }
    if (ctx.initFormat) {
      this.options.push('-f');
      this.options.push(ctx.initFormat);
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
