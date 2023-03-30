import * as tasks from 'azure-pipelines-task-lib/task';
import { TaskContext } from './context';
import { Task } from './task';

tasks.debug('Starting JReleaser task');
const taskContext = new TaskContext();
tasks.debug('commands: ' + taskContext.command);

const task = new Task(taskContext);

task
  .run()
  .then(() => {
    tasks.setResult(
      tasks.TaskResult.Succeeded,
      'JReleaser task completed successfully',
    );
  })
  .catch(error => {
    tasks.setResult(tasks.TaskResult.Failed, error.message);
  });
