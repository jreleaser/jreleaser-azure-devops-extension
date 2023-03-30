import * as commands from './commands';
import { ITaskContext } from './context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import * as tasks from 'azure-pipelines-task-lib/task';

export class Task {
  private readonly commands: { [name: string]: commands.ICommand };
  private readonly toolrunner: toolrunner.ToolRunner;

  constructor(private readonly ctx: ITaskContext) {
    this.toolrunner = JReleaserToolFactory.createJReleaserTool();
    this.commands = {
      init: new commands.JReleaserInitHandler(this.toolrunner),
      config: new commands.JReleaserConfigHandler(this.toolrunner),
      custom: new commands.JReleaserCustomHandler(this.toolrunner),
      announce: new commands.JReleaserAnnounceHandler(this.toolrunner),
    };
  }

  public async run(): Promise<void> {
    const command = this.commands[this.ctx.command];
    if (!command) {
      throw new Error(`Unknown command: ${this.ctx.command}`);
    }

    command.setup(this.ctx);
    const response = await command.exec();
    if (response.status === commands.CommandStatus.Failed) {
      throw new Error(response.message);
    }
  }
}

class JReleaserToolFactory {
  public static createJReleaserTool(): toolrunner.ToolRunner {
    const jreleaserPath = tasks.which('jreleaser', true);
    return tasks.tool(jreleaserPath);
  }
}
