/* eslint-disable max-classes-per-file */
export class BpmnParserError extends Error {
  constructor(message: string) {
    super(`Error parsing BPMN: ${message}`);
  }
}

export class TaskNotFoundError extends BpmnParserError {
  constructor(taskId: string) {
    super(`No task found for id "${taskId}"`);
  }
}

export class DuplicateTaskError extends BpmnParserError {
  constructor(taskId: string) {
    super(`Multiple tasks found for id "${taskId}"`);
  }
}
