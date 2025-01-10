import { LLM } from "./llm";
import { Tool } from "./tools/tool";
import { Memory } from "./memory";
import { Workflow } from "./workflow";

export class Agent {
  name: string = "Agent";
  description: string = "";

  private workflow: Workflow;

  constructor({
    fastllm,
    llm,
    tools,
    memory,
  }: {
    fastllm?: LLM;
    llm?: LLM;
    tools: Tool[];
    memory?: Memory;
  }) {
    this.workflow = new Workflow({ fastllm, llm, tools, memory });
  }

  async execute(input: string): Promise<string> {
    return this.workflow.execute(input);
  }
}
