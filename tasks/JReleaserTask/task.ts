import * as commands from './commands';
import { ITaskContext } from './context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import * as tasks from 'azure-pipelines-task-lib/task';
import { ILogger } from './logger';

export class Task {
  private readonly commands: { [name: string]: commands.ICommand };
  private readonly toolrunner: toolrunner.ToolRunner;
  private logger: ILogger;

  constructor(private readonly ctx: ITaskContext, logger: ILogger) {
    this.toolrunner = JReleaserToolFactory.createJReleaserTool();
    this.commands = {
      init: new commands.JReleaserInitHandler(this.toolrunner),
      config: new commands.JReleaserConfigHandler(this.toolrunner),
      custom: new commands.JReleaserCustomHandler(this.toolrunner),
      announce: new commands.JReleaserAnnounceHandler(this.toolrunner),
      release: new commands.JReleaserReleaseHandler(this.toolrunner),
      assemble: new commands.JReleaserAssembleHandler(this.toolrunner),
      catalog: new commands.JReleaserCatalogHandler(this.toolrunner),
      changelog: new commands.JReleaserChangelogHandler(this.toolrunner),
      checksum: new commands.JReleaserChecksumHandler(this.toolrunner),
      deploy: new commands.JReleaserDeployHandler(this.toolrunner),
      download: new commands.JReleaserDownloadHandler(this.toolrunner),
      env: new commands.JReleaserEnvHandler(this.toolrunner),
      fullRelease: new commands.JReleaserFullReleaseHandler(this.toolrunner),
      jsonSchema: new commands.JReleaserJsonSchemaHandler(this.toolrunner),
      package: new commands.JReleaserPackageHandler(this.toolrunner),
      prepare: new commands.JReleaserPrepareHandler(this.toolrunner),
      publish: new commands.JReleaserPublishHandler(this.toolrunner),
      sign: new commands.JReleaserSignHandler(this.toolrunner),
      templateGenerate: new commands.JReleaserTemplateGenerateHandler(this.toolrunner),
      templateEval: new commands.JReleaserTemplateEvalHandler(this.toolrunner),
      upload: new commands.JReleaserUploadHandler(this.toolrunner),
    };
  }

  public async run(): Promise<commands.CommandResponse> {
    const command = this.commands[this.ctx.command];
    this.logger.debug(`Executing command: ${this.ctx.command}`);
    let response: commands.CommandResponse;
    if (!command) {
      this.logger.error(`Unknown command: ${this.ctx.command}`);
      throw new Error(`Unknown command: ${this.ctx.command}`);
    }
    try {
      command.initialize(this.ctx);
      this.logger.debug(`Executing options: ${command.options.join(' ')}`);
      response = await command.exec();
    } catch (error) {
      response = new commands.CommandResponse(commands.CommandStatus.Failed, error.message);
      this.logger.error(error.message);
    }
    return response;
  }
}

class JReleaserToolFactory {
  public static createJReleaserTool(): toolrunner.ToolRunner {
    const jreleaserPath = tasks.which('jreleaser', true);
    return tasks.tool(jreleaserPath);
  }
}
