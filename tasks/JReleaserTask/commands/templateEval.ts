import { CommandResponse } from '.';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import * as tasks from 'azure-pipelines-task-lib/task';
import { ITaskContext } from '../context';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export class JReleaserTemplateEval extends AbstractPlatformAwareModelCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.options.unshift('template', 'eval');
    switch (ctx.templateEvalType) {
      case 'announce':
        this.options.push('--announce');
        break;
      case 'assembly':
        this.options.push('--assembly');
        break;
      case 'changelog':
        this.options.push('--changelog');
        break;
      case 'download':
        this.options.push('--download');
        break;
    }

    switch (ctx.templateEvalInputType) {
      case 'file':
        this.options.push('--input-file=' + ctx.templateEvalInput);
        break;
      case 'directory':
        this.options.push('--input-directory=' + ctx.templateEvalInput);
        break;
    }

    if (ctx.templateEvalOverwrite) {
      this.options.push('--overwrite');
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
