import { CommandResponse, CommandStatus } from '.';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { ITaskContext } from '../context';
import { AbstractPlatformAwareModelCommand } from './abstractPlatformAwareModelCommand';

export class JReleaserConfig extends AbstractPlatformAwareModelCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  protected setup(ctx: ITaskContext): void {
    this.setCommand('config');
    if (ctx.configFull) {
      this.addOption('--full');
    }
    switch (ctx.configType) {
      case 'announce':
        this.addOption('--announce');
        break;
      case 'assembly':
        this.addOption('--assembly');
        break;
      case 'changelog':
        this.addOption('--changelog');
        break;
      case 'download':
        this.addOption('--download');
        break;
    }
  }

  exec(): Promise<CommandResponse> {
    this.setupToolRunnerArguments(this.toolrunner);

    const runnerResult = this.toolrunner.execSync();
    if (runnerResult.code === 0) {
      return Promise.resolve(new CommandResponse(CommandStatus.Success, 'JReleaser config successfully'));
    } else {
      return Promise.reject(
        new CommandResponse(CommandStatus.Failed, `Failed to initialize JReleaser. Exit code: ${runnerResult.code}`),
      );
    }
  }
}
