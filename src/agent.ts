import { LLM } from './llm';
import { Tool } from './tools/tool';
import { Memory } from './memory';
import { Workflow } from './workflow';

export class Agent {
  private workflow: Workflow;

  constructor(llm: LLM, tools: Tool[], memory: Memory) {
    this.workflow = new Workflow(llm, tools, memory);
  }

  async run(input: string): Promise<string> {
    return this.workflow.execute(input);
  }
}