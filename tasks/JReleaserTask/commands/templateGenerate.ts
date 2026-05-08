import { CommandResponse, CommandStatus } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import { AbstractLoggingCommand } from './abstractLoggingCommand';

export class JReleaserTemplateGenerate extends AbstractLoggingCommand {
  constructor(toolrunner: toolrunner.ToolRunner) {
    super(toolrunner);
  }

  private hasCustomArguments(ctx: ITaskContext): boolean {
    return Boolean(ctx.arguments && ctx.arguments.trim() !== '');
  }

  private trimInput(value: string): string {
    return value ? value.trim() : '';
  }

  private requireInput(value: string, message: string): void {
    if (this.trimInput(value) === '') {
      throw new Error(message);
    }
  }

  protected setup(ctx: ITaskContext): void {
    this.setCommand(['template', 'generate']);

    const hasCustomArguments = this.hasCustomArguments(ctx);
    const templateType = this.trimInput(ctx.templateGenerateType) || 'packager';

    switch (templateType) {
      case 'announcer':
        if (!hasCustomArguments) {
          this.requireInput(ctx.templateGenerateAnnouncer, 'templateGenerate announcer mode requires templateGenerateAnnouncer');
        }
        this.addAnnouncerOptions(ctx);
        break;
      case 'assembler':
        if (!hasCustomArguments) {
          this.requireInput(
            ctx.templateGenerateAssemblerType,
            'templateGenerate assembler mode requires templateGenerateAssemblerType and templateGenerateAssemblerName',
          );
          this.requireInput(
            ctx.templateGenerateAssemblerName,
            'templateGenerate assembler mode requires templateGenerateAssemblerType and templateGenerateAssemblerName',
          );
        }
        this.addAssemblerOptions(ctx);
        break;
      case 'packager':
      default:
        if (!hasCustomArguments) {
          this.requireInput(this.getPackagerDistribution(ctx), 'templateGenerate packager mode requires distribution and packager');
          this.requireInput(this.getPackager(ctx), 'templateGenerate packager mode requires distribution and packager');
        }
        this.addPackagerOptions(ctx);
        break;
    }

    this.addCommonOptions(ctx);
  }

  private addAnnouncerOptions(ctx: ITaskContext): void {
    const announcer = this.trimInput(ctx.templateGenerateAnnouncer);
    if (announcer !== '') {
      this.addOption('--announcer');
      this.addOption(announcer);
    }
  }

  private addAssemblerOptions(ctx: ITaskContext): void {
    const assemblerType = this.trimInput(ctx.templateGenerateAssemblerType);
    if (assemblerType !== '') {
      this.addOption('--assembler-type');
      this.addOption(assemblerType);
    }

    const assemblerName = this.trimInput(ctx.templateGenerateAssemblerName);
    if (assemblerName !== '') {
      this.addOption('--assembler-name');
      this.addOption(assemblerName);
    }
  }

  private addPackagerOptions(ctx: ITaskContext): void {
    const distribution = this.getPackagerDistribution(ctx);
    if (distribution !== '') {
      this.addOption('--distribution');
      this.addOption(distribution);
    }

    const packager = this.getPackager(ctx);
    if (packager !== '') {
      this.addOption('--packager');
      this.addOption(packager);
    }

    const distributionType = this.trimInput(ctx.templateGenerateDistributionType);
    if (distributionType !== '') {
      this.addOption('--distribution-type');
      this.addOption(distributionType);
    }
  }

  private addCommonOptions(ctx: ITaskContext): void {
    if (ctx.templateGenerateOverwrite) {
      this.addOption('--overwrite');
    }
    if (ctx.templateGenerateSnapshot) {
      this.addOption('--snapshot');
    }

    const outputDirectory = this.trimInput(ctx.templateGenerateOutputDirectory);
    if (outputDirectory !== '') {
      this.addOption('--output-directory');
      this.addOption(outputDirectory);
    }
  }

  private getPackagerDistribution(ctx: ITaskContext): string {
    const templateGenerateDistribution = this.trimInput(ctx.templateGenerateDistribution);

    return templateGenerateDistribution !== '' ? templateGenerateDistribution : this.trimInput(ctx.distribution);
  }

  private getPackager(ctx: ITaskContext): string {
    const templateGeneratePackager = this.trimInput(ctx.templateGeneratePackager);

    return templateGeneratePackager !== '' ? templateGeneratePackager : this.trimInput(ctx.packager);
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
