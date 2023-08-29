import * as tasks from 'azure-pipelines-task-lib/task';
import { TaskContext } from './context';
import { Task } from './task';
import TaskLogger from './logger/taskLogger';
import { CommandResponse, CommandStatus } from './commands';

const taskContext = new TaskContext();
const logger = new TaskLogger(taskContext);
const task = new Task(taskContext, logger);

logger.debug('Starting JReleaser task');

task
  .run()
  .then((response: CommandResponse) => {
    switch (response.status) {
      case CommandStatus.Success:
        tasks.setResult(tasks.TaskResult.Succeeded, 'JReleaser task completed successfully');
        break;
      case CommandStatus.Failed:
        tasks.setResult(tasks.TaskResult.Failed, response.message);
        break;
    }
  })
  .catch(error => {
    tasks.setResult(tasks.TaskResult.Failed, error.message);
  });
