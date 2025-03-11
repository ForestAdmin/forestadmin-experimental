export type WorkflowStep = WorkflowTask | WorkflowCondition | WorkflowEnd;

export interface WorkflowTransition {
  stepName: string;
  buttonText: string;
  answer?: string;
}

export interface WorkflowTask {
  type: 'task';
  title: string;
  prompt: string; // instruction to follow
  outgoing: WorkflowTransition;
  taskType: 'ai-executed' | 'guideline';
}

export interface WorkflowEnd {
  type: 'end';
  title: string;
}

export interface WorkflowCondition {
  type: 'condition';
  title: string;
  prompt: string; // question to answer
  outgoing: WorkflowTransition[];
}

// used to display the flow as components
export interface WorkflowStepHistory<Step extends WorkflowStep = WorkflowStep, Data = unknown> {
  step: Step;
  stepIndex: number;
  done: boolean;
  context?: {
    inputData?: Data;
    selectedOption?: string;
  };
}

export interface SequenceFlow {
  id: string;
  name: string;
  source: string;
  target: string;
}

export interface Workflow {
  name: string;
  entryPoint: string;
  steps: Record<string, WorkflowStep>;
}
