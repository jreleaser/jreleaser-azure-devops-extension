import { CommandResponse } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { AbstractLoggingCommand } from './abstractLoggingCommand';
import * as tasks from 'azure-pipelines-task-lib/task';

export class JReleaserInit extends AbstractLoggingCommand {
  private overWrite: boolean;

  private format: string;

  private toolrunner: toolrunner.ToolRunner;

  constructor(toolrunner: toolrunner.ToolRunner) {
    super();
    this.toolrunner = toolrunner;
  }

  setup(ctx: ITaskContext): void {
    super.setup(ctx);
    this.options.unshift('init');
    this.overWrite = ctx.initOverwrite;
    this.format = ctx.initFormat;

    if (this.overWrite) {
      this.options.push('-o');
    }
    if (this.format) {
      this.options.push('-f');
      this.options.push(this.format);
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
