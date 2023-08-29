import { CommandResponse, ICommand } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';

export abstract class AbstractCommand implements ICommand {
  private _options: string[] = [];
  public get options(): string[] {
    return this._options;
  }
  public addOption(value: string): void {
    this._options.push(value);
  }
  public setCommand(value: string): void {
    this._options.unshift(value);
  }

  constructor(protected toolrunner: toolrunner.ToolRunner) {}

  private setupArguments(ctx: ITaskContext): void {
    if (ctx.arguments) {
      for (const arg of ctx.arguments.split(' ')) {
        this.addOption(arg);
      }
    }
  }

  public initialize(ctx: ITaskContext): void {
    this.setupArguments(ctx);
    this.setup(ctx);
  }

  protected setupCommandOptions(ctx: ITaskContext, optionMapping: { [key: string]: string }): void {
    for (const key in optionMapping) {
      if (ctx[key] && ctx[key] !== '') {
        this.addOption(optionMapping[key]);
        this.addOption(ctx[key]);
      } else if (ctx[key]) {
        this.addOption(optionMapping[key]);
      }
    }
  }

  protected setupToolRunnerArguments(toolrunner: toolrunner.ToolRunner): void {
    for (const option of this.options) {
      toolrunner.arg(option);
    }
  }

  protected abstract setup(ctx: ITaskContext): void;

  abstract exec(): Promise<CommandResponse>;
}
