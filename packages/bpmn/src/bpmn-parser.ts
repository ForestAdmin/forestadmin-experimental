import type { Workflow, WorkflowCondition, WorkflowEnd, WorkflowTask } from './types';

import { BpmnParserError, DuplicateTaskError, TaskNotFoundError } from './errors';

export type WarningHandler = (warning: string) => void;

export interface ParserContext {
  doc: Document;
  workflow: Workflow;
  warningHandler: WarningHandler;
}

export const SUPPORTED_ELEMENTS = [
  'task',
  'userTask',
  'serviceTask',
  'exclusiveGateway',
  'endEvent',
];

export default class BpmnParser {
  parse(xml: string, workflowName: string, handlerOnWarning?: WarningHandler): Workflow {
    const warningHandler: WarningHandler = handlerOnWarning ?? console.warn;
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const workflow: Workflow = {
      name: workflowName,
      entryPoint: null,
      steps: {},
    };

    const parserContext = { doc, workflow, warningHandler };

    const entryPointTask = this.parseEntryPoint(parserContext);
    this.parseElementRecursive(parserContext, entryPointTask);

    return workflow;
  }

  private warn(message: string, warningHandler: WarningHandler) {
    warningHandler(message);
  }

  private parseEntryPoint(parserContext: ParserContext): Element {
    const { doc, workflow, warningHandler } = parserContext;
    let entryPointTask: Element;

    doc.querySelectorAll('startEvent').forEach(event => {
      if (entryPointTask) {
        this.warn(`multiple start events detecting. Keeping only the first one`, warningHandler);

        return;
      }

      const id = event.getAttribute('id') || 'start';
      const rawText = event.getAttribute('name') || '';
      const allOutgoings = this.findOutgoingElements(parserContext, id);

      if (allOutgoings.length === 0) {
        this.warn(`start event without outging flow. Ignoring it`, warningHandler);

        return;
      }

      if (allOutgoings.length > 1) {
        this.warn(
          `multiple outgoing flows from the start event: "${rawText}". Keeping only the first one`,
          warningHandler,
        );
      }

      const entryPointId = allOutgoings[0].getAttribute('targetRef');

      try {
        entryPointTask = this.findTask(doc, entryPointId);
        workflow.entryPoint = entryPointId;
      } catch (e) {
        if (e instanceof BpmnParserError) {
          this.warn(`Error while searching entryPoint task: ${e.message}`, warningHandler);
        }
      }
    });

    if (!entryPointTask) {
      throw new BpmnParserError(
        // eslint-disable-next-line max-len
        `No StartEvent found with a linked supported element. Supported elements are ${SUPPORTED_ELEMENTS.join(
          ', ',
        )}`,
      );
    }

    return entryPointTask;
  }

  private findOutgoingElements(parserContext: ParserContext, source: string): Element[] {
    const elements = Array.from(
      parserContext.doc.querySelectorAll(`sequenceFlow[sourceRef="${source}"]`).values(),
    );

    return elements
      .map(element => this.checkTargetValidity(parserContext, element.getAttribute('id')))
      .filter(Boolean);
  }

  private findTask(doc: Document, id: string): Element {
    const tasks = doc.querySelectorAll(
      ['task', 'userTask', 'serviceTask', 'exclusiveGateway']
        .map(tag => `${tag}[id="${id}"]`)
        .join(', '),
    );

    if (tasks.length === 0) {
      throw new TaskNotFoundError(id);
    }

    if (tasks.length > 1) {
      throw new DuplicateTaskError(id);
    }

    return tasks[0];
  }

  private checkTargetValidity({ doc, warningHandler }: ParserContext, id: string): Element | null {
    try {
      return this.findTask(doc, id);
    } catch (e) {
      if (e instanceof BpmnParserError) {
        this.warn(`Error while searching task: ${e.message}`, warningHandler);
      }

      return null;
    }
  }

  private parseElementRecursive(parserContext: ParserContext, element: Element) {
    const outgoingElements = this.parseElement(parserContext, element);
    outgoingElements.forEach(outgoingElement =>
      this.parseElementRecursive(parserContext, outgoingElement),
    );
  }

  // add the element in the workflow and returns the outgoing elements
  private parseElement(parserContext: ParserContext, element: Element): Element[] {
    const { workflow } = parserContext;
    const id = element.getAttribute('id');
    if (workflow.steps[id]) return []; // skip already parsed elements, avoid infinity loops

    const allOutgoings = this.findOutgoingElements(parserContext, id);

    switch (element.tagName) {
      case 'EXCLUSIVEGATEWAY':
        return this.parseCondition(parserContext, element, allOutgoings);
      case 'ENDEVENT':
        workflow.steps[id] = {
          type: 'end',
          title: element.getAttribute('name') || '',
        };

        return allOutgoings;
      case 'TASK':
      case 'USERTASK':
      case 'SERVICETASK':
      default:
        return this.parseTask(parserContext, element, allOutgoings);
    }
  }

  private parseTask(
    { workflow, warningHandler }: ParserContext,
    element: Element,
    outgoings: Element[],
  ) {
    const title = element.getAttribute('name');
    const id = element.getAttribute('id');

    const task: WorkflowTask = {
      type: 'task',
      title,
      prompt: title,
      taskType: element.tagName === 'SERVICETASK' ? 'ai-executed' : 'guideline',
      outgoing: {
        buttonText: outgoings[0]?.getAttribute('name') || 'Continue',
        stepName: outgoings[0]?.getAttribute('targetRef'),
      },
    };

    if (outgoings.length === 0) {
      this.warn(`no flow going out of task: "${title}". Adding EndEvent after it`, warningHandler);
      workflow.steps[`endEvent-${id}`] = {
        title: 'End of workflow',
        type: 'end',
      };
      task.outgoing = {
        buttonText: 'End the workflow',
        stepName: `endEvent-${id}`,
      };
    }

    if (outgoings.length > 1) {
      this.warn(
        `multiple outgoing flows from the task: "${title}". Keeping only the first one`,
        warningHandler,
      );
    }

    workflow.steps[id] = task;

    return outgoings;
  }

  private parseCondition(
    { workflow, warningHandler }: ParserContext,
    element: Element,
    outgoings: Element[],
  ) {
    const title = element.getAttribute('name');
    const id = element.getAttribute('id');

    let condition: WorkflowCondition | WorkflowEnd = {
      type: 'condition',
      title,
      prompt: title,
      outgoing: outgoings.map(outgoing => ({
        answer: outgoing.getAttribute('name'),
        buttonText: outgoing.getAttribute('name'),
        stepName: outgoing.getAttribute('targetRef'),
      })),
    };

    if (outgoings.length === 0) {
      this.warn(
        `no flow going out of gateway: "${title}". Transform it into endEvent`,
        warningHandler,
      );
      condition = {
        title,
        type: 'end',
      };
    }

    if (outgoings.length === 1) {
      this.warn(
        `single outgoing flows from the gateway: "${title}". Skipping the gateway`,
        warningHandler,
      );

      this.replaceFlowsTarget(workflow, id, outgoings[0].getAttribute('targetRef'));

      return outgoings;
    }

    workflow.steps[id] = condition;

    return outgoings;
  }

  // redirect to the element "newTarget" from all
  // the elements in the workflow that currently redirect to "oldTarget"
  private replaceFlowsTarget(workflow: Workflow, oldTarget: string, newTarget: string) {
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const stepName in workflow.steps) {
      const step = workflow.steps[stepName];

      if (step.type === 'task' && step.outgoing.stepName === oldTarget) {
        step.outgoing.stepName = newTarget;

        return;
      }

      if (step.type === 'condition' && step.outgoing.find(out => out.stepName === oldTarget)) {
        step.outgoing.find(out => out.stepName === oldTarget).stepName = newTarget;

        return;
      }
    }
  }
}
