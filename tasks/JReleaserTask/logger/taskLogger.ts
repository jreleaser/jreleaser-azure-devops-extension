import { ILogger } from '.';
import { ITaskContext } from '../context';
import { debug, warning, error } from 'azure-pipelines-task-lib/task';

export default class TaskLogger implements ILogger {
  constructor(private readonly ctx: ITaskContext) {}

  command(success: boolean): void {
    debug(`executed command '${this.ctx.command}'` + (success ? ' successfully' : ' with errors'));
  }

  error(message: string): void {
    error(message);
  }

  warning(message: string): void {
    warning(message);
  }

  debug(message: string): void {
    debug(message);
  }
}
