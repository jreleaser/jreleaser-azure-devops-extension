import { CommandResponse, ICommand } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';
import * as tasks from 'azure-pipelines-task-lib/task';

export abstract class AbstractCommand implements ICommand {
  options: string[] = [];

  constructor(protected toolrunner: toolrunner.ToolRunner) {}

  private setupCommon(ctx: ITaskContext): void {
    for (const arg of ctx.arguments.split(' ')) {
      this.options.push(arg);
    }
  }

  public initialize(ctx: ITaskContext): void {
    this.setupCommon(ctx);
    this.setup(ctx);
  }

  protected buildOptions(ctx: ITaskContext, optionMapping: { [key: string]: string }): void {
    for (const key in optionMapping) {
      if (ctx[key] && ctx[key] !== '') {
        this.options.push(optionMapping[key]);
        this.options.push(ctx[key]);
      } else if (ctx[key]) {
        this.options.push(optionMapping[key]);
      }
    }
  }

  protected abstract setup(ctx: ITaskContext): void;

  abstract exec(): Promise<CommandResponse>;
}