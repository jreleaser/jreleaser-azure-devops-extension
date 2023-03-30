import { CommandResponse } from '.';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import * as tasks from 'azure-pipelines-task-lib/task';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';
import { ITaskContext } from '../context';

export class JReleaserConfig extends AbstractPlatformAwareModelCommand {
  private toolrunner: toolrunner.ToolRunner;

  constructor(toolrunner: toolrunner.ToolRunner) {
    super();
    this.toolrunner = toolrunner;
  }

  setup(ctx: ITaskContext): void {
    super.setup(ctx);
    this.options.unshift('config');
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
