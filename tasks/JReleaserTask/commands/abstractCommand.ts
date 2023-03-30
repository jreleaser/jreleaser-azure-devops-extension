import { CommandResponse, ICommand } from '.';
import { ITaskContext } from '../context';

export abstract class AbstractCommand implements ICommand {
  options: string[] = [];
  setup(ctx: ITaskContext): void {
    for (const arg of ctx.customArguments.split(' ')) {
      this.options.push(arg);
    }
  }
  abstract exec(): Promise<CommandResponse>;
}
