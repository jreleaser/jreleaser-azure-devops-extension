import { CommandResponse, ICommand } from '.';
import { ITaskContext } from '../context';
import * as toolrunner from 'azure-pipelines-task-lib/toolrunner';

function parseArgumentLine(argString: string): string[] {
  const args: string[] = [];
  let inQuotes = false;
  let escaped = false;
  let lastCharWasSpace = true;
  let arg = '';

  const append = (value: string): void => {
    if (escaped && value !== '"') {
      arg += '\\';
    }

    arg += value;
    escaped = false;
  };

  for (let i = 0; i < argString.length; i++) {
    const value = argString.charAt(i);

    if (value === ' ' && !inQuotes) {
      if (!lastCharWasSpace) {
        args.push(arg);
        arg = '';
      }
      lastCharWasSpace = true;
      continue;
    }

    lastCharWasSpace = false;

    if (value === '"') {
      if (!escaped) {
        inQuotes = !inQuotes;
      } else {
        append(value);
      }
      continue;
    }

    if (value === '\\' && escaped) {
      append(value);
      continue;
    }

    if (value === '\\' && inQuotes) {
      escaped = true;
      continue;
    }

    append(value);
  }

  if (!lastCharWasSpace) {
    args.push(arg.trim());
  }

  return args;
}

export abstract class AbstractCommand implements ICommand {
  private _options: string[] = [];
  public get options(): string[] {
    return this._options;
  }
  public addOption(value: string): void {
    this._options.push(value);
  }
  public setCommand(value: string | string[]): void {
    const command = Array.isArray(value) ? value : [value];
    this._options.unshift(...command);
  }

  constructor(protected toolrunner: toolrunner.ToolRunner) {}

  private setupArguments(ctx: ITaskContext): void {
    if (ctx.arguments) {
      for (const arg of parseArgumentLine(ctx.arguments)) {
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
